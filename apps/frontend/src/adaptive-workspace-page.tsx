import {PanelRightClose, PanelRightOpen} from 'lucide-react';
import {useState} from 'react';
import type {ReactElement, ReactNode} from 'react';

type AdaptivePageStatusTone = 'neutral' | 'ready' | 'attention' | 'blocked';

type AdaptiveWorkspacePageProps = {
  alert?: ReactNode;
  children: ReactNode;
  context: ReactNode;
  eyebrow: string;
  nextAction: ReactNode;
  statusDetail: string;
  statusLabel: string;
  statusTone?: AdaptivePageStatusTone;
  summary: string;
  title: string;
  toolbar?: ReactNode;
};

/**
 * Cadre visuel commun des pages objet MasterFlow.
 *
 * Il n'infère aucune donnée ni permission : le workspace appelant fournit uniquement
 * des projections déjà autorisées par le runtime.
 */
export function AdaptiveWorkspacePage({
  alert,
  children,
  context,
  eyebrow,
  nextAction,
  statusDetail,
  statusLabel,
  statusTone = 'neutral',
  summary,
  title,
  toolbar,
}: AdaptiveWorkspacePageProps): ReactElement {
  const [contextOpen, setContextOpen] = useState(true);

  return (
    <article className={`panel panel--wide adaptive-page adaptive-page--${statusTone}`}>
      <header className="adaptive-page__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{summary}</p>
        </div>
        <div className={`adaptive-page__status adaptive-page__status--${statusTone}`} role="status">
          <strong>{statusLabel}</strong>
          <span>{statusDetail}</span>
        </div>
      </header>

      {toolbar ? <div className="adaptive-page__toolbar">{toolbar}</div> : null}
      {alert ? <div className="adaptive-page__alert">{alert}</div> : null}

      <section className="adaptive-page__next" aria-label="Prochaine action">
        <p className="eyebrow">Prochaine action</p>
        {nextAction}
      </section>

      <div className={`adaptive-page__layout${contextOpen ? '' : ' adaptive-page__layout--context-closed'}`}>
        <main className="adaptive-page__main">{children}</main>
        {contextOpen ? (
          <aside className="adaptive-page__context" aria-label="Contexte de la page">
            <div className="adaptive-page__context-head">
              <strong>Contexte</strong>
              <button
                aria-label="Masquer la colonne de contexte"
                className="secondary"
                onClick={() => setContextOpen(false)}
                type="button"
              >
                <PanelRightClose aria-hidden="true" size={16} />
              </button>
            </div>
            {context}
          </aside>
        ) : (
          <button
            className="secondary adaptive-page__context-reopen"
            onClick={() => setContextOpen(true)}
            type="button"
          >
            <PanelRightOpen aria-hidden="true" size={16} />
            Afficher le contexte
          </button>
        )}
      </div>
    </article>
  );
}
