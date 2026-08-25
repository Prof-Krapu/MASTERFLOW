import {useCallback, useEffect, useState} from 'react';

export interface NewsItem {
  id: number;
  title: string;
  content: string;
  category: 'nouveauté' | 'mise à jour' | 'information';
  created_at: number;
  read_at: number | null;
}

interface UseNewsResult {
  items: NewsItem[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: number) => void;
  refresh: () => void;
}

/**
 * Hook pour récupérer les annonces publiques et gérer le marquage lu.
 * @param limit nombre d'éléments à charger (défaut 3, passer 100 pour "tout")
 */
export function useNews(limit = 3): UseNewsResult {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNews = useCallback(() => {
    setLoading(true);
    const qs = limit >= 100 ? '?all=1' : '';
    fetch(`/api/v1/news${qs}`, {credentials: 'include'})
      .then((r) => (r.ok ? r.json() : {items: []}))
      .then((d: {items: NewsItem[]}) => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch('/api/v1/news/unread-count', {credentials: 'include'})
      .then((r) => (r.ok ? r.json() : {count: 0}))
      .then((d: {count: number}) => setUnreadCount(d.count ?? 0))
      .catch(() => {});
  }, [limit]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const markRead = useCallback((id: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id && item.read_at === null ? {...item, read_at: Date.now()} : item)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    fetch(`/api/v1/news/${id}/read`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
  }, []);

  return {items, unreadCount, loading, markRead, refresh: fetchNews};
}

/**
 * Types et helpers pour l'admin (CRUD complet).
 */
export interface NewsAdminItem {
  id: number;
  title: string;
  content: string;
  category: 'nouveauté' | 'mise à jour' | 'information';
  published: number;
  created_at: number;
  updated_at: number;
  created_by: string;
  emailed_at: number | null;
  read_count: number;
}

export async function adminListNews(): Promise<NewsAdminItem[]> {
  const r = await fetch('/api/v1/admin/news', {credentials: 'include'});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return ((await r.json()) as {items: NewsAdminItem[]}).items;
}

export async function adminCreateNews(data: {
  title: string;
  content: string;
  category: string;
  published: boolean;
}): Promise<number> {
  const r = await fetch('/api/v1/admin/news', {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return ((await r.json()) as {id: number}).id;
}

export async function adminUpdateNews(
  id: number,
  data: {title?: string; content?: string; category?: string; published?: boolean},
): Promise<void> {
  const r = await fetch(`/api/v1/admin/news/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

export async function adminDeleteNews(id: number): Promise<void> {
  const r = await fetch(`/api/v1/admin/news/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

export async function adminMarkNewsEmailed(id: number): Promise<void> {
  const r = await fetch(`/api/v1/admin/news/${id}/emailed`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}
