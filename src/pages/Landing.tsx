import type {LucideIcon} from 'lucide-react';
import {Atom, BookOpen, Cog, Globe, Guitar, Languages, Leaf, LogOut, Map, ScrollText, ShieldCheck, Sigma, TrendingUp} from 'lucide-react';
import {useState} from 'react';

import {AppCard} from '@/components/AppCard';
import {NewsTimeline} from '@/components/NewsTimeline';
import {RepubliqueFooter} from '@/components/RepubliqueFooter';
import {Button} from '@/components/ui/button';
import {CORRECTOR_APPS, type CorrectorSlug} from '@/lib/apps';
import {useNews} from '@/lib/news';
import {apiLogout, type SessionUser} from '@/lib/session';

/** Icônes par matière — reste ici : lib/apps.ts est aussi importé côté serveur. */
const APP_ICONS: Record<CorrectorSlug, LucideIcon> = {
  pc: Atom,
  fr: BookOpen,
  nl: Languages,
  es: Guitar,
  svt: Leaf,
  maths: Sigma,
  ses: TrendingUp,
  tech: Cog,
  en: Globe,
  philo: ScrollText,
  hg: Map,
};

/**
 * Landing — hero DSFR + 3 tuiles vers les sous-apps + footer République.
 * Le pattern visuel reprend celui de `Homepage.tsx` des sous-apps (hero `bg-[#F5F5FE]`,
 * tuiles `border-t-2`, footer Bleu France) pour ne pas dépayser l'utilisateur entre la
 * landing et les correcteurs.
 */
export function Landing({user}: {user: SessionUser}) {
  const {items, unreadCount, loading, markRead, refresh} = useNews(3);
  const {items: allItems, loading: allLoading} = useNews(100);
  const [showAll, setShowAll] = useState(false);

  // Compte rattaché à un correcteur unique → on ne montre que sa tuile.
  // Admins et comptes historiques (assignedApp null) voient tout.
  const restricted = user.role !== 'admin' && user.assignedApp !== null;
  const visibleApps = restricted
    ? CORRECTOR_APPS.filter((a) => a.slug === user.assignedApp)
    : CORRECTOR_APPS;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="text-xl font-bold tracking-tight text-foreground">CORRECTORS</div>
            <span className="rounded-sm bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              beta
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline-flex sm:items-center sm:gap-2">
              <strong className="text-foreground">{user.displayName ?? user.username}</strong>
              <span className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {user.role}
              </span>
            </span>
            {user.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = '/admin')}
              >
                <ShieldCheck className="mr-1 h-4 w-4" />
                Admin
              </Button>
            )}
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
        <section className="relative overflow-hidden bg-[#F5F5FE] px-6 py-14 dark:bg-[#1B1B35]">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-2.5 py-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Suite de correcteurs IA pour l'enseignement
                </span>
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
                Corrigez vos copies
                <br />
                <span className="text-primary">avec l'IA de votre choix.</span>
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                Onze correcteurs spécialisés — Physique-Chimie, Français, Néerlandais, Espagnol,
                SVT, Mathématiques, SES, Technologie, Anglais, Philosophie et
                Histoire-Géographie — réunis dans un unique
                espace de travail centralisé. Vos
                classes, vos DS et votre historique restent rattachés à votre compte d'une session
                à l'autre.
              </p>
            </div>

            {!loading && items.length > 0 && (
              <div className="lg:col-span-5">
                <div className="rounded-sm border border-t-2 border-t-primary bg-card">
                  <div className="flex items-center justify-between border-b px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        Nouveautés
                      </span>
                      {unreadCount > 0 && (
                        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-5 text-destructive-foreground">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {items.length >= 3 && (
                      <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
                        Voir tout →
                      </Button>
                    )}
                  </div>
                  <div className="max-h-[380px] overflow-y-auto px-5 py-4">
                    <NewsTimeline items={items} onMarkRead={markRead} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-6 text-xs font-bold uppercase tracking-wider text-primary">
            {restricted ? 'Votre correcteur' : 'Sélectionnez une matière'}
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleApps.map((a) => (
              <AppCard
                key={a.slug}
                slug={a.slug}
                title={a.title}
                eyebrow={a.eyebrow}
                description={a.description}
                Icon={APP_ICONS[a.slug]}
                accentVar={a.accentVar}
              />
            ))}
          </div>
          {restricted && (
            <p className="mt-4 text-sm text-muted-foreground">
              Votre compte est rattaché à ce correcteur. Pour en changer, contactez
              l'administrateur.
            </p>
          )}
        </section>
      </main>

      {showAll && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowAll(false)}
        >
          <div
            className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-sm border bg-card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-primary">Toutes les nouveautés</div>
                <div className="text-lg font-bold tracking-tight">Historique des annonces</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAll(false)}>
                Fermer
              </Button>
            </div>
            <div className="px-6 py-5">
              {allLoading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : (
                <NewsTimeline items={allItems} onMarkRead={markRead} showAll />
              )}
            </div>
          </div>
        </div>
      )}

      <RepubliqueFooter />
    </div>
  );
}
