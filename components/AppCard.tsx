import type {LucideIcon} from 'lucide-react';
import {ArrowRight} from 'lucide-react';

/**
 * Tuile "matière" sur la landing. Click → navigue vers /app/{slug}/ via le reverse proxy.
 * Style aligné sur le composant `Tile` des sous-apps (Homepage.tsx) : bord-top accentué,
 * eyebrow + titre + description + CTA flèche. Couleur portée par les tokens
 * `--pc-color`, `--fr-color`, `--nl-color`, `--es-color`, `--svt-color`, `--maths-color`,
 * `--ses-color`, `--tech-color`, `--en-color` dans src/index.css.
 */
export interface AppCardProps {
  slug: 'pc' | 'fr' | 'nl' | 'es' | 'svt' | 'maths' | 'ses' | 'tech' | 'en' | 'philo' | 'hg';
  title: string;
  eyebrow: string;
  description: string;
  Icon: LucideIcon;
  accentVar:
    | '--pc-color'
    | '--fr-color'
    | '--nl-color'
    | '--es-color'
    | '--svt-color'
    | '--maths-color'
    | '--ses-color'
    | '--tech-color'
    | '--en-color'
    | '--philo-color'
    | '--hg-color';
}

export function AppCard({slug, title, eyebrow, description, Icon, accentVar}: AppCardProps) {
  const accent = `var(${accentVar})`;
  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = `/app/${slug}/`;
      }}
      className="group flex h-full flex-col rounded-sm border border-border border-t-2 bg-card p-5 text-left transition-colors hover:bg-accent/40"
      style={{borderTopColor: accent}}
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-sm text-white"
          style={{backgroundColor: accent}}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{color: accent}}
          >
            {eyebrow}
          </div>
          <div className="text-lg font-bold leading-tight text-foreground">{title}</div>
        </div>
      </div>
      <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div
        className="inline-flex items-center gap-1 text-sm font-medium transition-all group-hover:gap-2"
        style={{color: accent}}
      >
        Lancer le correcteur <ArrowRight className="h-4 w-4" />
      </div>
    </button>
  );
}
