import {useEffect, useState} from 'react';
import {Eye, Power, RotateCcw, Trash2} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {CORRECTOR_APPS, correctorTitle} from '@/lib/apps';
import type {SessionUser} from '@/lib/session';

import {UserStorageDrawer} from './UserStorageDrawer';

interface User {
  id: string;
  username: string;
  /** Prénom / pseudo d'inscription ; null pour les comptes antérieurs à la colonne. */
  display_name: string | null;
  role: 'admin' | 'user';
  active: number;
  created_at: number;
  last_login: number | null;
  assigned_app: string | null;
}

async function listUsers(): Promise<User[]> {
  const r = await fetch('/api/v1/admin/users', {credentials: 'include'});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return ((await r.json()) as {users: User[]}).users;
}

async function setActive(id: string, active: boolean): Promise<void> {
  const r = await fetch(`/api/v1/admin/users/${encodeURIComponent(id)}/active`, {
    method: 'PUT',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({active}),
  });
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as {error?: string; hint?: string};
    throw new Error(body.hint ?? body.error ?? `HTTP ${r.status}`);
  }
}

async function setAssignedApp(id: string, app: string | null): Promise<void> {
  const r = await fetch(`/api/v1/admin/users/${encodeURIComponent(id)}/app`, {
    method: 'PUT',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({app}),
  });
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as {error?: string; hint?: string};
    throw new Error(body.hint ?? body.error ?? `HTTP ${r.status}`);
  }
}

async function deleteUser(id: string): Promise<void> {
  const r = await fetch(`/api/v1/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as {error?: string; hint?: string};
    throw new Error(body.hint ?? body.error ?? `HTTP ${r.status}`);
  }
}

function fmtDate(ts: number | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('fr-FR', {dateStyle: 'short', timeStyle: 'short'});
}

export function UsersPanel({currentUser}: {currentUser: SessionUser}) {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  /** User actuellement inspecté (drawer ouvert) ; null = drawer fermé. */
  const [inspecting, setInspecting] = useState<User | null>(null);

  function refresh() {
    setError(null);
    listUsers()
      .then(setUsers)
      .catch((e) => setError((e as Error).message));
  }

  useEffect(refresh, []);

  async function handle(action: 'disable' | 'enable' | 'delete', user: User) {
    if (action === 'delete') {
      const extra =
        user.role === 'admin'
          ? `\n\nCompte admin : ses invitations, réglages globaux et annonces vous seront réattribués. ` +
            `Le dernier administrateur actif ne peut pas être supprimé.`
          : '';
      const ok = window.confirm(
        `Supprimer définitivement « ${user.username} » ?\n\n` +
          `Toutes ses données (classes, DS, dashboards, événements de coût) seront effacées en cascade. ` +
          `Cette action est irréversible.${extra}`,
      );
      if (!ok) return;
    } else if (action === 'disable') {
      const ok = window.confirm(
        `Désactiver « ${user.username} » ?\n\n` +
          `Le compte ne pourra plus se connecter, mais ses données restent en place. Réversible.`,
      );
      if (!ok) return;
    }

    setPending(user.id);
    setError(null);
    try {
      if (action === 'delete') {
        await deleteUser(user.id);
      } else {
        await setActive(user.id, action === 'enable');
      }
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  /** Réassignation du correcteur ('' = lever la restriction). Confirm avant application. */
  async function handleAppChange(user: User, value: string) {
    const app = value === '' ? null : value;
    const label = app ? correctorTitle(app) : 'tous les correcteurs (sans restriction)';
    const ok = window.confirm(
      `Rattacher « ${user.username} » à ${app ? `« ${label} »` : label} ?\n\n` +
        `L'accès aux autres correcteurs sera coupé immédiatement (proxy + storage). ` +
        `Ses données déjà enregistrées sur les autres matières restent en place.`,
    );
    if (!ok) return;

    setPending(user.id);
    setError(null);
    try {
      await setAssignedApp(user.id, app);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  const accounts = users.length;
  const actifs = users.filter((u) => u.active).length;
  const admins = users.filter((u) => u.role === 'admin').length;

  return (
    <Card className="rounded-sm border border-border border-t-2 border-t-primary">
      <CardHeader>
        <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Comptes</div>
        <CardTitle>Utilisateurs</CardTitle>
        <p className="text-sm text-muted-foreground">
          {accounts} compte{accounts > 1 ? 's' : ''} · {actifs} actif{actifs > 1 ? 's' : ''} ·{' '}
          {admins} admin{admins > 1 ? 's' : ''}. Désactivez pour couper l'accès sans perdre les
          données ; supprimez pour effacer le compte et tout son contenu (pour un admin, ses
          invitations et annonces vous sont réattribuées ; le dernier admin actif est protégé). La colonne «&nbsp;Correcteur&nbsp;»
          corrige le choix de matière fait à l'inscription (définitif côté utilisateur).
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="overflow-x-auto rounded-sm border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Identifiant</th>
                <th className="px-3 py-2 text-left font-semibold">Rôle</th>
                <th className="px-3 py-2 text-left font-semibold">Correcteur</th>
                <th className="hidden px-3 py-2 text-left font-semibold lg:table-cell">Créé le</th>
                <th className="hidden px-3 py-2 text-left font-semibold lg:table-cell">Dernière connexion</th>
                <th className="px-3 py-2 text-left font-semibold">État</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.id === currentUser.id;
                const isAdmin = u.role === 'admin';
                const isBusy = pending === u.id;
                return (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      {u.username}
                      {isMe && (
                        <span className="ml-2 inline-flex items-center rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
                          vous
                        </span>
                      )}
                      {/* Le prénom d'inscription : un identifiant seul ne dit pas qui est derrière. */}
                      {u.display_name && (
                        <div className="text-xs font-normal text-muted-foreground">{u.display_name}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          isAdmin
                            ? 'inline-flex items-center rounded-sm bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900'
                            : 'inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                        }
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {isAdmin ? (
                        <span className="text-xs text-muted-foreground">tous (admin)</span>
                      ) : (
                        <select
                          value={u.assigned_app ?? ''}
                          disabled={isMe || isBusy}
                          onChange={(e) => handleAppChange(u, e.target.value)}
                          className="h-7 max-w-[11rem] rounded-sm border border-input bg-transparent px-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          title="Correcteur rattaché au compte — le choix fait à l'inscription ne peut être corrigé qu'ici"
                        >
                          <option value="">tous (héritage)</option>
                          {CORRECTOR_APPS.map((a) => (
                            <option key={a.slug} value={a.slug}>
                              {a.title}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">{fmtDate(u.created_at)}</td>
                    <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">{fmtDate(u.last_login)}</td>
                    <td className="px-3 py-2">
                      {u.active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-700" /> actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> désactivé
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={isMe || isBusy}
                          onClick={() => setInspecting(u)}
                          aria-label="Inspecter"
                          title={isMe ? 'Utilisez les sous-apps pour votre propre compte' : 'Inspecter les DS et le storage'}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {u.active ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={isMe || isBusy}
                            onClick={() => handle('disable', u)}
                            aria-label="Désactiver"
                            title={isMe ? 'Action interdite sur votre propre compte' : 'Désactiver'}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={isMe || isBusy}
                            onClick={() => handle('enable', u)}
                            aria-label="Réactiver"
                            title="Réactiver"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={isMe || isBusy}
                          onClick={() => handle('delete', u)}
                          aria-label="Supprimer"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title={
                            isMe
                              ? 'Action interdite sur votre propre compte'
                              : isAdmin
                                ? 'Supprimer définitivement — ses invitations et annonces vous seront réattribuées (dernier admin protégé)'
                                : 'Supprimer définitivement'
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={7}>
                    Aucun utilisateur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {inspecting && (
        <UserStorageDrawer
          userId={inspecting.id}
          username={inspecting.username}
          onClose={() => setInspecting(null)}
        />
      )}
    </Card>
  );
}
