import {useCallback, useEffect, useMemo, useState} from 'react';
import type {FormEvent, ReactElement} from 'react';

import type {
  AdminUser,
  Invitation,
  Role,
  TaskModelProfile,
  TokenUsageGroupBy,
  TokenUsageReport,
} from '@masterflow/shared';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  createAction,
  createInvitation,
  executeAction,
  getAdminUsers,
  getInvitations,
  getTaskModelProfiles,
  getTokenUsage,
  preflightAction,
  revokeInvitation,
  validateAction,
} from './api.ts';

/**
 * Console d'administration (PoC) — feature `API_manage` (invitations + comptes/rôles)
 * + monitoring usage/coût (`API_corrector`). Gated `≥ admin` côté App.
 *
 * Gouvernance rendue visible :
 *  - le changement de rôle est une ACTION SENSIBLE (`set_user_role`) : on déroule
 *    propose → preflight → (validation godmode) → execute à l'écran ;
 *  - seul un godmode peut valider/exécuter ; un admin propose et l'action reste en attente.
 *
 * NB territoire : ce panneau est une PREUVE DE CONCEPT côté frontend (propriété MALEX) ;
 * câblage et invariants viennent du backend, le style est minimal et repreneable.
 */

const ROLES: Role[] = ['student', 'teacher', 'admin', 'godmode'];
const ROLE_FR: Record<Role, string> = {
  student: 'élève',
  teacher: 'professeur',
  admin: 'admin',
  godmode: 'godmode',
};

type RoleFlow = {
  step: 'idle' | 'proposing' | 'pending' | 'done' | 'failed';
  message: string;
  actionId?: string;
  targetRole?: Role;
};

interface AdminConsoleProps {
  token: string;
  role: Role;
  currentUserId: string;
}

function fmtTokens(n: number): string {
  return n.toLocaleString('fr-FR');
}
function fmtCost(n: number): string {
  return `${n.toFixed(4)} €`;
}
function fmtDate(ms: number | null): string {
  if (ms === null) return '—';
  return new Date(ms).toLocaleDateString('fr-FR');
}
function joinList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : '—';
}
function profileStatusLabel(status: TaskModelProfile['status']): string {
  if (status === 'validated') return 'validé';
  if (status === 'disabled') return 'désactivé';
  return 'brouillon';
}
function profilePrivacyLabel(mode: TaskModelProfile['privacy_mode']): string {
  if (mode === 'approved_remote') return 'remote approuvé';
  if (mode === 'local_only') return 'local only';
  return 'hybride';
}

export function AdminConsole({token, role, currentUserId}: AdminConsoleProps): ReactElement {
  const isGodmode = role === 'godmode';

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [taskModelProfiles, setTaskModelProfiles] = useState<TaskModelProfile[]>([]);
  const [reports, setReports] = useState<Record<TokenUsageGroupBy, TokenUsageReport | null>>({
    day: null,
    model: null,
    task: null,
    user: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Formulaire de création d'invitation.
  const [inviteRole, setInviteRole] = useState<Role>('student');
  const [inviteMaxUses, setInviteMaxUses] = useState(1);
  const [inviteExpiry, setInviteExpiry] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [lastCreatedCode, setLastCreatedCode] = useState<string | null>(null);

  // État du flux de changement de rôle par utilisateur.
  const [roleFlows, setRoleFlows] = useState<Record<string, RoleFlow>>({});

  const loadAll = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [u, inv, profiles, day, model, task, user] = await Promise.all([
        getAdminUsers(token),
        getInvitations(token),
        getTaskModelProfiles(token),
        getTokenUsage('day', token),
        getTokenUsage('model', token),
        getTokenUsage('task', token),
        getTokenUsage('user', token),
      ]);
      setUsers(u);
      setInvitations(inv);
      setTaskModelProfiles(profiles);
      setReports({day, model, task, user});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // ── Invitations ────────────────────────────────────────────────
  const handleCreateInvite = useCallback(
    async (e: FormEvent): Promise<void> => {
      e.preventDefault();
      setError(null);
      try {
        const created = await createInvitation(
          {
            role: inviteRole,
            max_uses: inviteMaxUses,
            expires_in_days: inviteExpiry ? Number(inviteExpiry) : undefined,
            note: inviteNote || undefined,
          },
          token,
        );
        setLastCreatedCode(created.code);
        setInviteNote('');
        await loadAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Création du code échouée.');
      }
    },
    [inviteRole, inviteMaxUses, inviteExpiry, inviteNote, token, loadAll],
  );

  const handleRevoke = useCallback(
    async (code: string): Promise<void> => {
      setError(null);
      try {
        await revokeInvitation(code, token);
        await loadAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Révocation échouée.');
      }
    },
    [token, loadAll],
  );

  // ── Changement de rôle = action sensible ───────────────────────
  const handleRoleChange = useCallback(
    async (target: AdminUser, newRole: Role): Promise<void> => {
      if (newRole === target.role) return;
      setError(null);
      setRoleFlows((f) => ({...f, [target.id]: {step: 'proposing', message: 'Création de l’action…', targetRole: newRole}}));
      try {
        const action = await createAction(
          {
            registry_id: 'set_user_role',
            intent: `set_user_role:${target.username}`,
            object_type: 'user_role',
            payload: {user_id: target.id, role: newRole},
          },
          token,
        );
        const flighted = await preflightAction(action.id, token);
        if (flighted.status !== 'pending_validation') {
          setRoleFlows((f) => ({
            ...f,
            [target.id]: {step: 'failed', message: `Preflight inattendu : ${flighted.status}`, actionId: action.id},
          }));
          return;
        }

        if (!isGodmode) {
          // Un admin propose ; seul un godmode valide → l'action attend dans l'inbox.
          setRoleFlows((f) => ({
            ...f,
            [target.id]: {
              step: 'pending',
              message: 'En attente de validation godmode (inbox).',
              actionId: action.id,
              targetRole: newRole,
            },
          }));
          return;
        }

        // Godmode : valide puis exécute (gouvernance complète déroulée).
        const approved = await validateAction(action.id, {decision: 'approved'}, token);
        if (approved.status !== 'approved') {
          setRoleFlows((f) => ({
            ...f,
            [target.id]: {step: 'failed', message: `Validation refusée : ${approved.status}`, actionId: action.id},
          }));
          return;
        }
        const executed = await executeAction(action.id, token);
        if (executed.status === 'completed') {
          setRoleFlows((f) => ({
            ...f,
            [target.id]: {step: 'done', message: `Rôle → ${ROLE_FR[newRole]} ✓`, actionId: action.id},
          }));
          await loadAll();
        } else {
          setRoleFlows((f) => ({
            ...f,
            [target.id]: {step: 'failed', message: executed.error ?? `Échec : ${executed.status}`, actionId: action.id},
          }));
        }
      } catch (err) {
        setRoleFlows((f) => ({
          ...f,
          [target.id]: {step: 'failed', message: err instanceof Error ? err.message : 'Erreur', },
        }));
      }
    },
    [token, isGodmode, loadAll],
  );

  // ── Données dataviz ────────────────────────────────────────────
  const totals = reports.model?.totals ?? {prompt_tokens: 0, completion_tokens: 0, cost_eur: 0, events: 0};

  const byDay = useMemo(() => {
    const rows = reports.day?.rows ?? [];
    return [...rows]
      .sort((a, b) => a.group.localeCompare(b.group))
      .map((r) => ({
        jour: r.group,
        coût: Number(r.cost_eur.toFixed(4)),
        tokens: r.prompt_tokens + r.completion_tokens,
      }));
  }, [reports.day]);

  const byModel = useMemo(
    () =>
      (reports.model?.rows ?? []).map((r) => ({
        modèle: r.group,
        entrée: r.prompt_tokens,
        sortie: r.completion_tokens,
      })),
    [reports.model],
  );

  const byTask = useMemo(
    () =>
      (reports.task?.rows ?? []).map((r) => ({
        tâche: r.group,
        coût: Number(r.cost_eur.toFixed(4)),
      })),
    [reports.task],
  );

  const taskUsage = useMemo(
    () => new Map((reports.task?.rows ?? []).map((r) => [r.group, r])),
    [reports.task],
  );
  const modelUsage = useMemo(
    () => new Map((reports.model?.rows ?? []).map((r) => [r.group, r])),
    [reports.model],
  );
  const routingTotals = useMemo(() => {
    const validated = taskModelProfiles.filter((profile) => profile.status === 'validated').length;
    const roleOverrides = taskModelProfiles.reduce(
      (count, profile) => count + Object.keys(profile.role_models ?? {}).length,
      0,
    );
    const remoteProfiles = taskModelProfiles.filter((profile) => profile.privacy_mode !== 'local_only').length;
    return {validated, roleOverrides, remoteProfiles};
  }, [taskModelProfiles]);

  return (
    <>
      <article className="panel panel--wide admin-console">
        <div className="panel-header">
          <h2>Administration · API_manage</h2>
          <button className="secondary" onClick={() => void loadAll()} type="button" disabled={loading}>
            {loading ? '…' : 'Rafraîchir'}
          </button>
        </div>
        {error ? <p style={{color: '#A83232'}}>{error}</p> : null}

        {/* ── Invitations ─────────────────────────────────────── */}
        <section className="admin-section">
          <h3>Codes d’accès (invitations)</h3>
          <form className="admin-invite-form" onSubmit={handleCreateInvite}>
            <label>
              Rôle
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_FR[r]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Usages max
              <input
                type="number"
                min={1}
                value={inviteMaxUses}
                onChange={(e) => setInviteMaxUses(Math.max(1, Number(e.target.value)))}
              />
            </label>
            <label>
              Expire (jours)
              <input
                type="number"
                min={1}
                placeholder="∞"
                value={inviteExpiry}
                onChange={(e) => setInviteExpiry(e.target.value)}
              />
            </label>
            <label>
              Note
              <input type="text" value={inviteNote} onChange={(e) => setInviteNote(e.target.value)} />
            </label>
            <button type="submit">Créer le code</button>
          </form>
          {lastCreatedCode ? (
            <p className="admin-code-banner">
              Nouveau code : <code>{lastCreatedCode}</code> (à transmettre hors-bande)
            </p>
          ) : null}

          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Rôle</th>
                <th>Usages</th>
                <th>Expire</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={6}>Aucun code émis.</td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv.code}>
                    <td>
                      <code>{inv.code}</code>
                    </td>
                    <td>{ROLE_FR[inv.role]}</td>
                    <td>
                      {inv.used_count}/{inv.max_uses}
                    </td>
                    <td>{fmtDate(inv.expires_at)}</td>
                    <td>{inv.active ? 'actif' : inv.revoked_at ? 'révoqué' : 'épuisé/expiré'}</td>
                    <td>
                      {inv.active ? (
                        <button className="secondary" type="button" onClick={() => void handleRevoke(inv.code)}>
                          Révoquer
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* ── Utilisateurs & rôles ────────────────────────────── */}
        <section className="admin-section">
          <h3>Comptes utilisateurs</h3>
          {!isGodmode ? (
            <p className="admin-hint">
              Vous pouvez <strong>proposer</strong> un changement de rôle ; la validation est réservée au godmode
              (action sensible).
            </p>
          ) : null}
          <table className="admin-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Actif</th>
                <th>Dernier login</th>
                <th>Changer le rôle (sensible)</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const flow = roleFlows[u.id];
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id}>
                    <td>
                      {u.display_name} <span className="admin-muted">@{u.username}</span>
                    </td>
                    <td>{ROLE_FR[u.role]}</td>
                    <td>{u.active ? 'oui' : 'non'}</td>
                    <td>{fmtDate(u.last_login)}</td>
                    <td>
                      {isSelf ? (
                        <span className="admin-muted">— (soi-même)</span>
                      ) : (
                        <>
                          <select
                            defaultValue={u.role}
                            disabled={flow?.step === 'proposing'}
                            onChange={(e) => void handleRoleChange(u, e.target.value as Role)}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_FR[r]}
                              </option>
                            ))}
                          </select>
                          {flow && flow.step !== 'idle' ? (
                            <span
                              className="admin-flow"
                              style={{color: flow.step === 'failed' ? '#A83232' : flow.step === 'done' ? '#2E7D32' : '#777'}}
                            >
                              {flow.message}
                            </span>
                          ) : null}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </article>

      {/* ── Routage LLM : profils par tâche × rôle ───────────────── */}
      <article className="panel panel--wide admin-llm-routing">
        <div className="panel-header">
          <h2>Routage LLM · profils par tâche</h2>
          <span className="admin-muted">lecture seule · provider live via env serveur uniquement</span>
        </div>

        <div className="admin-cards">
          <div className="admin-card">
            <span className="admin-card-label">Profils validés</span>
            <strong>
              {routingTotals.validated}/{taskModelProfiles.length}
            </strong>
          </div>
          <div className="admin-card">
            <span className="admin-card-label">Overrides rôle</span>
            <strong>{fmtTokens(routingTotals.roleOverrides)}</strong>
          </div>
          <div className="admin-card">
            <span className="admin-card-label">Remote approuvé</span>
            <strong>{fmtTokens(routingTotals.remoteProfiles)}</strong>
          </div>
          <div className="admin-card">
            <span className="admin-card-label">Mode par défaut</span>
            <strong>mock-safe</strong>
          </div>
        </div>

        <p className="admin-hint">
          Cette surface montre le contrat de routage. Elle ne stocke aucun secret, ne pousse aucune clé et
          n’active pas un provider réel.
        </p>

        <table className="admin-table admin-llm-table">
          <thead>
            <tr>
              <th>Tâche</th>
              <th>Statut</th>
              <th>Provider</th>
              <th>Modèle de base</th>
              <th>Modèles par rôle</th>
              <th>Privacy</th>
              <th>Usage tâche</th>
              <th>Usage modèle</th>
            </tr>
          </thead>
          <tbody>
            {taskModelProfiles.length === 0 ? (
              <tr>
                <td colSpan={8}>Aucun profil de routage LLM disponible.</td>
              </tr>
            ) : (
              taskModelProfiles.map((profile) => {
                const taskRow = taskUsage.get(profile.task);
                const modelRow = profile.model ? modelUsage.get(profile.model) : undefined;
                const roles = Object.entries(profile.role_models ?? {});
                return (
                  <tr key={profile.profile_id}>
                    <td>
                      <code>{profile.task}</code>
                    </td>
                    <td>
                      <span className={`admin-pill admin-pill--${profile.status}`}>
                        {profileStatusLabel(profile.status)}
                      </span>
                    </td>
                    <td>{joinList(profile.allowed_providers)}</td>
                    <td>
                      <code>{profile.model ?? 'LLM_MODEL env'}</code>
                    </td>
                    <td>
                      {roles.length === 0 ? (
                        <span className="admin-muted">—</span>
                      ) : (
                        <div className="admin-role-models">
                          {roles.map(([roleName, model]) => (
                            <span key={roleName}>
                              {ROLE_FR[roleName as Role] ?? roleName}: <code>{model}</code>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{profilePrivacyLabel(profile.privacy_mode)}</td>
                    <td>
                      {taskRow ? (
                        <>
                          {fmtCost(taskRow.cost_eur)} · {fmtTokens(taskRow.events)} appels
                        </>
                      ) : (
                        <span className="admin-muted">aucun usage</span>
                      )}
                    </td>
                    <td>
                      {modelRow ? (
                        <>
                          {fmtTokens(modelRow.prompt_tokens + modelRow.completion_tokens)} tokens
                        </>
                      ) : (
                        <span className="admin-muted">aucun usage</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </article>

      {/* ── Monitoring usage & coût (API_corrector) ───────────── */}
      <article className="panel panel--wide admin-monitoring">
        <div className="panel-header">
          <h2>Monitoring · usage tokens &amp; coût</h2>
          <span className="admin-muted">source : token_events · agrégé /diagnostics/token-usage</span>
        </div>

        <div className="admin-cards">
          <div className="admin-card">
            <span className="admin-card-label">Coût total</span>
            <strong>{fmtCost(totals.cost_eur)}</strong>
          </div>
          <div className="admin-card">
            <span className="admin-card-label">Tokens (entrée)</span>
            <strong>{fmtTokens(totals.prompt_tokens)}</strong>
          </div>
          <div className="admin-card">
            <span className="admin-card-label">Tokens (sortie)</span>
            <strong>{fmtTokens(totals.completion_tokens)}</strong>
          </div>
          <div className="admin-card">
            <span className="admin-card-label">Appels</span>
            <strong>{fmtTokens(totals.events)}</strong>
          </div>
        </div>

        <h4>Coût &amp; tokens par jour</h4>
        <div style={{width: '100%', height: 220}}>
          <ResponsiveContainer>
            <AreaChart data={byDay} margin={{top: 8, right: 16, left: 0, bottom: 0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33333322" />
              <XAxis dataKey="jour" fontSize={11} />
              <YAxis yAxisId="left" fontSize={11} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} />
              <Tooltip />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="tokens" stroke="#39FF14" fill="#39FF1433" name="tokens" />
              <Area yAxisId="right" type="monotone" dataKey="coût" stroke="#FF6B00" fill="#FF6B0033" name="coût (€)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-charts-row">
          <div className="admin-chart">
            <h4>Tokens par modèle</h4>
            <div style={{width: '100%', height: 200}}>
              <ResponsiveContainer>
                <BarChart data={byModel} margin={{top: 8, right: 8, left: 0, bottom: 0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#33333322" />
                  <XAxis dataKey="modèle" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="entrée" stackId="t" fill="#6B2D5B" name="entrée" />
                  <Bar dataKey="sortie" stackId="t" fill="#A83232" name="sortie" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="admin-chart">
            <h4>Coût par tâche (chat vs correction…)</h4>
            <div style={{width: '100%', height: 200}}>
              <ResponsiveContainer>
                <BarChart data={byTask} margin={{top: 8, right: 8, left: 0, bottom: 0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#33333322" />
                  <XAxis dataKey="tâche" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="coût" fill="#FF6B00" name="coût (€)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <h4>Usage par utilisateur</h4>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Tokens (entrée)</th>
              <th>Tokens (sortie)</th>
              <th>Coût</th>
              <th>Appels</th>
            </tr>
          </thead>
          <tbody>
            {(reports.user?.rows ?? []).map((r) => (
              <tr key={r.group}>
                <td>{r.group}</td>
                <td>{fmtTokens(r.prompt_tokens)}</td>
                <td>{fmtTokens(r.completion_tokens)}</td>
                <td>{fmtCost(r.cost_eur)}</td>
                <td>{fmtTokens(r.events)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </>
  );
}
