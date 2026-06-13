import {ROLE_RANK, type CreateInvitation, type Invitation, type Role} from '@masterflow/shared';

import {getDb, type InvitationRow} from '../db/schema.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {audit} from '../lib/audit.ts';

/**
 * Moteur des invitations (codes d'accès) — feature admin `API_manage`.
 *
 * Doctrine :
 *  - L'inscription est SUR INVITATION : redéemer un code crée un compte au rôle porté
 *    par le code. La surface publique `POST /register` ne crée donc plus de compte « libre ».
 *  - Garde-fou d'escalade : on n'émet un code QUE pour un rôle ≤ rang du créateur
 *    (un admin ne peut pas émettre de code `godmode`). Seul godmode émet godmode/admin.
 *  - Création / révocation / redemption sont tracées dans `audit_logs`.
 *
 * La création d'un code est gated `admin` au niveau du router ; le grant effectif (élévation)
 * n'a lieu qu'à la redemption, avec un rôle déjà capé. Le changement de rôle d'un compte
 * EXISTANT, lui, est une action sensible distincte (`set_user_role`, validator godmode).
 */

/** Alphabet base32 sans caractères ambigus (pas de 0/O/1/I/L). */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 12;

/** Génère un code d'accès aléatoire (CSPRNG) au format `XXXX-XXXX-XXXX`. */
function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
    if (i % 4 === 3 && i < CODE_LENGTH - 1) out += '-';
  }
  return out;
}

/** Vrai si l'invitation est encore utilisable (non révoquée, non expirée, usages restants). */
function isInvitationActive(row: InvitationRow, now: number): boolean {
  if (row.revoked_at !== null) return false;
  if (row.expires_at !== null && row.expires_at <= now) return false;
  return row.used_count < row.max_uses;
}

/** Mappe une rangée `invitations` en DTO API (avec `active` dérivé). */
function toInvitationDTO(row: InvitationRow, now: number): Invitation {
  return {
    code: row.code,
    role: row.role,
    created_by: row.created_by,
    max_uses: row.max_uses,
    used_count: row.used_count,
    note: row.note,
    expires_at: row.expires_at,
    revoked_at: row.revoked_at,
    active: isInvitationActive(row, now),
    created_at: row.created_at,
  };
}

/** Erreur métier de redemption — message stable pour mapper un 400 propre côté router. */
export class InvitationError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'InvitationError';
  }
}

/**
 * Crée une invitation. Garde-fou non négociable : le rôle du code doit être ≤ rang du
 * créateur (anti-escalade). Lève si le créateur tente d'émettre un rôle supérieur au sien.
 */
export function createInvitation(user: AuthUser, body: CreateInvitation): Invitation {
  if (ROLE_RANK[body.role] > ROLE_RANK[user.role]) {
    throw new InvitationError(
      `role_above_creator: un '${user.role}' ne peut pas émettre de code '${body.role}'.`,
    );
  }

  const now = Date.now();
  const expiresAt =
    body.expires_in_days !== undefined ? now + body.expires_in_days * 86_400_000 : null;

  // Collision de code quasi impossible (31^12), mais on reste robuste : retente quelques fois.
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO invitations (code, role, created_by, max_uses, used_count, note, expires_at, revoked_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, NULL, ?, ?)`,
  );
  let code = generateCode();
  for (let attempt = 0; ; attempt++) {
    try {
      insert.run(code, body.role, user.id, body.max_uses, body.note ?? null, expiresAt, now, now);
      break;
    } catch (err) {
      if (attempt < 5 && String(err).includes('UNIQUE')) {
        code = generateCode();
        continue;
      }
      throw err;
    }
  }

  audit({
    event_type: 'invitation_created',
    user_id: user.id,
    scope: 'admin/invitations',
    detail: {code, role: body.role, max_uses: body.max_uses, expires_at: expiresAt},
  });

  const row = db.prepare('SELECT * FROM invitations WHERE code = ?').get(code) as InvitationRow;
  return toInvitationDTO(row, now);
}

/** Liste toutes les invitations (plus récentes d'abord) — vue admin. */
export function listInvitations(): Invitation[] {
  const now = Date.now();
  const rows = getDb()
    .prepare('SELECT * FROM invitations ORDER BY created_at DESC')
    .all() as InvitationRow[];
  return rows.map((r) => toInvitationDTO(r, now));
}

/** Révoque une invitation (la rend immédiatement inutilisable). Idempotent. */
export function revokeInvitation(user: AuthUser, code: string): Invitation {
  const db = getDb();
  const row = db.prepare('SELECT * FROM invitations WHERE code = ?').get(code) as
    | InvitationRow
    | undefined;
  if (!row) throw new InvitationError('not_found');

  const now = Date.now();
  if (row.revoked_at === null) {
    db.prepare('UPDATE invitations SET revoked_at = ?, updated_at = ? WHERE code = ?').run(
      now,
      now,
      code,
    );
    audit({
      event_type: 'invitation_revoked',
      user_id: user.id,
      scope: 'admin/invitations',
      detail: {code, role: row.role},
    });
  }

  const updated = db.prepare('SELECT * FROM invitations WHERE code = ?').get(code) as InvitationRow;
  return toInvitationDTO(updated, now);
}

/**
 * Consomme un code à l'inscription : vérifie sa validité et incrémente `used_count`
 * de façon atomique. Renvoie le rôle porté par le code. Lève `InvitationError` sinon.
 *
 * L'incrément est conditionnel en SQL (anti-course) : `changes === 0` ⇒ code épuisé,
 * révoqué ou expiré entre la lecture et l'update.
 */
export function redeemInvitation(code: string): {role: Role} {
  const db = getDb();
  const now = Date.now();

  return db.transaction((): {role: Role} => {
    const row = db.prepare('SELECT * FROM invitations WHERE code = ?').get(code) as
      | InvitationRow
      | undefined;
    if (!row) throw new InvitationError('not_found');
    if (row.revoked_at !== null) throw new InvitationError('revoked');
    if (row.expires_at !== null && row.expires_at <= now) throw new InvitationError('expired');
    if (row.used_count >= row.max_uses) throw new InvitationError('exhausted');

    const res = db
      .prepare(
        `UPDATE invitations
            SET used_count = used_count + 1, updated_at = ?
          WHERE code = ?
            AND revoked_at IS NULL
            AND used_count < max_uses
            AND (expires_at IS NULL OR expires_at > ?)`,
      )
      .run(now, code, now);
    if (res.changes === 0) throw new InvitationError('exhausted');

    return {role: row.role};
  })();
}
