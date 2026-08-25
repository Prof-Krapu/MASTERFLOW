import {useCallback, useEffect, useState} from 'react';
import type {ReactElement} from 'react';

import type {NewsPost} from '@masterflow/shared';

import {listNewsPosts, markNewsPostRead} from './api.ts';

/**
 * Fil des nouveautés / annonces — portage du composant NewsTimeline d'API_manage,
 * adapté au runtime MasterFlow (JWT Bearer, API centralisée). Visible de tout
 * utilisateur authentifié ; une annonce cliquée est marquée comme lue.
 */

interface NewsFeedProps {
  token: string;
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'});
}

export function NewsFeed({token}: NewsFeedProps): ReactElement {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await listNewsPosts(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement des annonces.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRead = useCallback(
    async (post: NewsPost): Promise<void> => {
      if (post.read_at !== null) return;
      try {
        const updated = await markNewsPostRead(post.id, token);
        setPosts((current) => current.map((p) => (p.id === updated.id ? updated : p)));
      } catch {
        // Le marquage lu est best-effort : l'affichage reste valide.
      }
    },
    [token],
  );

  const unread = posts.filter((p) => p.read_at === null).length;

  return (
    <article className="panel panel--wide news-feed">
      <div className="panel-header">
        <h2>Nouveautés</h2>
        {unread > 0 ? (
          <span className="counter" title={`${unread} annonce(s) non lue(s)`}>
            {unread} non lue{unread > 1 ? 's' : ''}
          </span>
        ) : null}
      </div>

      {loading ? <p className="muted compact">Chargement…</p> : null}
      {error ? <p style={{color: '#A83232'}}>{error}</p> : null}

      {!loading && !error && posts.length === 0 ? (
        <p className="muted compact">Aucune annonce pour le moment.</p>
      ) : null}

      <ul className="news-feed-list">
        {posts.map((post) => (
          <li
            className={`news-feed-item${post.read_at === null ? ' news-feed-item--unread' : ''}`}
            key={post.id}
            onClick={() => void handleRead(post)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') void handleRead(post);
            }}
            role={post.read_at === null ? 'button' : undefined}
            tabIndex={post.read_at === null ? 0 : undefined}
          >
            <header>
              <strong>{post.title}</strong>
              {post.emailed ? <span className="news-feed-badge">newsletter</span> : null}
              {post.read_at === null ? <span className="news-feed-dot" aria-label="non lu" /> : null}
            </header>
            <p>{post.body}</p>
            <small className="admin-muted">
              {fmtDate(post.created_at)} · @{post.author_username}
            </small>
          </li>
        ))}
      </ul>
    </article>
  );
}
