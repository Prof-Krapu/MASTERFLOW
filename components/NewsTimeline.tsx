import {Info, Megaphone, RefreshCw, Sparkles} from 'lucide-react';

import type {NewsItem} from '@/lib/news';

const CATEGORY_CONFIG: Record<
  NewsItem['category'],
  {label: string; color: string; bgColor: string; Icon: typeof Sparkles}
> = {
  nouveauté: {label: 'Nouveauté', color: 'text-primary', bgColor: 'bg-primary', Icon: Sparkles},
  'mise à jour': {label: 'Mise à jour', color: 'text-green-700', bgColor: 'bg-green-700', Icon: RefreshCw},
  information: {label: 'Information', color: 'text-muted-foreground', bgColor: 'bg-muted-foreground', Icon: Info},
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'});
}

interface NewsTimelineProps {
  items: NewsItem[];
  onMarkRead?: (id: number) => void;
  showAll?: boolean;
}

/**
 * Timeline verticale d'annonces. Affiche un dot coloré par catégorie,
 * un fond accentué pour les non-lues, et appelle onMarkRead au clic.
 */
export function NewsTimeline({items, onMarkRead, showAll}: NewsTimelineProps) {
  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Aucune annonce pour l'instant.
      </p>
    );
  }

  return (
    <div className={`relative space-y-4 ${showAll ? 'max-h-[60vh] overflow-y-auto pr-2' : ''}`}>
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
      {items.map((item) => {
        const cfg = CATEGORY_CONFIG[item.category];
        const isUnread = item.read_at === null;
        return (
          <div
            key={item.id}
            className={`relative flex gap-4 pl-6 ${isUnread ? 'rounded-sm bg-accent/30 py-3 pr-3 -ml-3' : 'py-1'}`}
            onClick={() => isUnread && onMarkRead?.(item.id)}
            role={isUnread && onMarkRead ? 'button' : undefined}
            tabIndex={isUnread && onMarkRead ? 0 : undefined}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && isUnread && onMarkRead) {
                e.preventDefault();
                onMarkRead(item.id);
              }
            }}
          >
            <div className="absolute left-0 top-3 flex items-center justify-center">
              <span
                className={`block h-3.5 w-3.5 rounded-full border-2 border-background ${cfg.bgColor} ${isUnread ? 'animate-[progressPulse_2s_ease-in-out_infinite]' : ''}`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
                  {cfg.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{formatDate(item.created_at)}</span>
                {isUnread && (
                  <span className="inline-flex items-center rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                    Nouveau
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-sm font-semibold leading-tight text-foreground">{item.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
