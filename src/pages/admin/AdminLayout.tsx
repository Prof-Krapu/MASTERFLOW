import {useEffect, useState} from 'react';
import {Activity, ArrowLeft, BadgeEuro, BarChart3, Inbox, KeyRound, LogOut, MailPlus, Megaphone, ShieldCheck, UserPlus, Users} from 'lucide-react';

import {RepubliqueFooter} from '@/components/RepubliqueFooter';
import {Button} from '@/components/ui/button';
import {apiLogout, type SessionUser} from '@/lib/session';

import {AccessRequestsPanel} from './AccessRequestsPanel';
import {ApiConfigPanel} from './ApiConfigPanel';
import {HealthPanel} from './HealthPanel';
import {InboxPanel} from './InboxPanel';
import {InvitesPanel} from './InvitesPanel';
import {MonitoringPanel} from './MonitoringPanel';
import {NewsPanel} from './NewsPanel';
import {PricingPanel} from './PricingPanel';
import {UsersPanel} from './UsersPanel';

type AdminTab = 'config' | 'pricing' | 'invites' | 'users' | 'monitoring' | 'inbox' | 'access' | 'news' | 'health';

const TABS: {key: AdminTab; label: string; eyebrow: string; Icon: typeof KeyRound}[] = [
  {key: 'inbox', label: 'Boîte de réception', eyebrow: 'Tickets & erreurs', Icon: Inbox},
  {key: 'access', label: "Demandes d'accès", eyebrow: 'Bêta & mailing', Icon: UserPlus},
  {key: 'health', label: 'Santé', eyebrow: 'Services & LLM', Icon: Activity},
  {key: 'news', label: 'Nouveautés', eyebrow: 'Annonces', Icon: Megaphone},
  {key: 'config', label: 'Configuration API', eyebrow: 'Clé partagée', Icon: KeyRound},
  {key: 'pricing', label: 'Tarifs', eyebrow: 'Coût modèles', Icon: BadgeEuro},
  {key: 'invites', label: 'Invitations', eyebrow: "Codes d'accès", Icon: MailPlus},
  {key: 'users', label: 'Utilisateurs', eyebrow: 'Comptes', Icon: Users},
  {key: 'monitoring', label: 'Monitoring', eyebrow: 'Coût & usage', Icon: BarChart3},
];

/**
 * Layout admin — chrome cohérente avec la Landing (header BrandHeader-like + footer
 * République), sidebar à accent Bleu France sur l'onglet actif. Le `currentUser` est
 * propagé aux panels pour les garde-fous (empêcher l'auto-suppression dans UsersPanel).
 */
export function AdminLayout({currentUser}: {currentUser: SessionUser}) {
  const [tab, setTab] = useState<AdminTab>('inbox');
  // Sous-onglet Demandes/Mailing remonté ici pour que NewsPanel puisse ouvrir
  // directement la liste de diffusion (navigation croisée annonces ↔ abonnés).
  const [accessView, setAccessView] = useState<'requests' | 'mailing'>('requests');
  const [unread, setUnread] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/v1/admin/feedback/count', {credentials: 'include'})
        .then((r) => (r.ok ? r.json() : {unread: 0}))
        .then((d: {unread: number}) => {
          if (!cancelled) setUnread(d.unread ?? 0);
        })
        .catch(() => {});
      fetch('/api/v1/admin/access-requests/count', {credentials: 'include'})
        .then((r) => (r.ok ? r.json() : {unread: 0}))
        .then((d: {unread: number}) => {
          if (!cancelled) setUnreadRequests(d.unread ?? 0);
        })
        .catch(() => {});
    };
    void load();
    // Rafraîchi au changement d'onglet (tickets marqués lus dans l'inbox) ET toutes les
    // 60 s : un ticket arrivé pendant la session est visible sans navigation.
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tab]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div className="text-xl font-bold tracking-tight">Espace admin</div>
            </div>
            <span className="rounded-sm bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              CORRECTORS
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline-flex sm:items-center sm:gap-2">
              <strong className="text-foreground">{currentUser.username}</strong>
              <span className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {currentUser.role}
              </span>
            </span>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = '/')}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Landing
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await apiLogout();
                window.location.href = '/login';
              }}
            >
              <LogOut className="mr-1 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b bg-[#F5F5FE] px-6 py-8 dark:bg-[#1B1B35]">
          <div className="mx-auto max-w-6xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-2.5 py-1">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Console d'administration
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Pilotez la suite CORRECTORS
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Configurez les clés API partagées, générez des codes d'invitation, gérez vos
              collègues et suivez la santé et le coût d'usage des onze correcteurs.
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl grid-cols-12 gap-6 px-6 py-8">
          <aside className="col-span-12 md:col-span-3">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
              Sections
            </div>
            <nav className="space-y-1">
              {TABS.map(({key, label, eyebrow, Icon}) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`flex w-full items-start gap-3 rounded-sm border border-transparent px-3 py-2.5 text-left text-sm transition-colors ${
                      active
                        ? 'border-l-2 border-l-primary bg-accent/60 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium leading-tight">{label}</span>
                        {key === 'inbox' && unread > 0 && (
                          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-5 text-destructive-foreground">
                            {unread}
                          </span>
                        )}
                        {key === 'access' && unreadRequests > 0 && (
                          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-5 text-destructive-foreground">
                            {unreadRequests}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {eyebrow}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="col-span-12 md:col-span-9">
            {tab === 'inbox' && <InboxPanel />}
            {tab === 'access' && (
              <AccessRequestsPanel
                view={accessView}
                onViewChange={setAccessView}
                onOpenNews={() => setTab('news')}
              />
            )}
            {tab === 'health' && <HealthPanel />}
            {tab === 'news' && (
              <NewsPanel
                onOpenMailing={() => {
                  setAccessView('mailing');
                  setTab('access');
                }}
              />
            )}
            {tab === 'config' && <ApiConfigPanel />}
            {tab === 'pricing' && <PricingPanel />}
            {tab === 'invites' && <InvitesPanel />}
            {tab === 'users' && <UsersPanel currentUser={currentUser} />}
            {tab === 'monitoring' && <MonitoringPanel />}
          </main>
        </div>
      </main>

      <RepubliqueFooter />
    </div>
  );
}
