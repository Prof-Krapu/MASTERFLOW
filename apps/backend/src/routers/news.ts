import {Router} from 'express';
import type {Request, Response} from 'express';

import {CreateNewsPostRequestSchema, UpdateNewsPostRequestSchema} from '@masterflow/shared';

import {requireUser} from '../middleware/auth.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {
  createNewsPost,
  deleteNewsPost,
  listNewsPosts,
  markNewsPostEmailed,
  markNewsPostRead,
  unreadNewsCount,
  updateNewsPost,
} from '../services/news.ts';

function authUser(req: Request): AuthUser {
  const user = req.user;
  if (!user) throw new Error('[news] req.user absent malgré requireUser');
  return user;
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Router annonces / nouveautés (portage API_manage). Chemins explicites montés à la
 * racine de l'API : lecture `/news` pour tous, gestion sous `/admin/news` ≥ admin.
 */
export function createNewsRouter(): Router {
  const router = Router();

  // ── Lecture (tout utilisateur authentifié) ────────────────────────────────
  router.get('/news', requireUser, (req: Request, res: Response): void => {
    res.json(listNewsPosts(authUser(req)));
  });

  router.get('/news/unread-count', requireUser, (req: Request, res: Response): void => {
    res.json({count: unreadNewsCount(authUser(req))});
  });

  router.post('/news/:id/read', requireUser, (req: Request, res: Response): void => {
    try {
      res.json(markNewsPostRead(authUser(req), req.params.id ?? ''));
    } catch (e) {
      res.status(errMessage(e) === 'news_post_not_found' ? 404 : 500).json({
        error: 'news_read_failed',
        message: errMessage(e),
      });
    }
  });

  // ── Gestion (≥ admin) ─────────────────────────────────────────────────────
  router.post('/admin/news', requireUser, (req: Request, res: Response): void => {
    const parsed = CreateNewsPostRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', details: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(createNewsPost(authUser(req), parsed.data));
    } catch (e) {
      res.status(errMessage(e) === 'permission_denied' ? 403 : 500).json({
        error: 'news_create_failed',
        message: errMessage(e),
      });
    }
  });

  router.put('/admin/news/:id', requireUser, (req: Request, res: Response): void => {
    const parsed = UpdateNewsPostRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', details: parsed.error.flatten()});
      return;
    }
    try {
      res.json(updateNewsPost(authUser(req), req.params.id ?? '', parsed.data));
    } catch (e) {
      const message = errMessage(e);
      const status = message === 'permission_denied' ? 403 : message === 'news_post_not_found' ? 404 : 500;
      res.status(status).json({error: 'news_update_failed', message});
    }
  });

  router.post('/admin/news/:id/emailed', requireUser, (req: Request, res: Response): void => {
    try {
      res.json(markNewsPostEmailed(authUser(req), req.params.id ?? ''));
    } catch (e) {
      const message = errMessage(e);
      const status = message === 'permission_denied' ? 403 : message === 'news_post_not_found' ? 404 : 500;
      res.status(status).json({error: 'news_emailed_failed', message});
    }
  });

  router.delete('/admin/news/:id', requireUser, (req: Request, res: Response): void => {
    try {
      deleteNewsPost(authUser(req), req.params.id ?? '');
      res.json({ok: true});
    } catch (e) {
      const message = errMessage(e);
      const status = message === 'permission_denied' ? 403 : message === 'news_post_not_found' ? 404 : 500;
      res.status(status).json({error: 'news_delete_failed', message});
    }
  });

  return router;
}
