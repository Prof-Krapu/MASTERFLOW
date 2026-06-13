import {Router} from 'express';
import type {Request, Response} from 'express';

import {AddProjectMemberRequestSchema, CreateProjectRequestSchema} from '@masterflow/shared';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  addProjectMember,
  createProject,
  getProject,
  listProjectMembers,
  listProjects,
} from '../services/projects.ts';

function actor(req: Request): AuthUser {
  const user = req.user;
  if (!user) throw new Error('[projects] req.user absent malgré requireUser');
  return user;
}

function routeError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'project_error';
  if (message === 'permission_denied' || message === 'project_membership_denied' || message === 'project_owner_required') {
    res.status(403).json({error: message});
    return;
  }
  if (message === 'project_not_found' || message === 'project_member_user_not_found') {
    res.status(404).json({error: message});
    return;
  }
  res.status(500).json({error: 'project_error'});
}

export function createProjectsRouter(): Router {
  const router = Router();

  router.use(requireUser);

  router.get('/projects', (req: Request, res: Response): void => {
    res.json(listProjects(actor(req)));
  });

  router.post('/projects', (req: Request, res: Response): void => {
    const parsed = CreateProjectRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(createProject(actor(req), parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.get('/projects/:id', (req: Request, res: Response): void => {
    const projectId = req.params.id;
    if (!projectId) {
      res.status(404).json({error: 'project_not_found'});
      return;
    }
    try {
      res.json(getProject(actor(req), projectId));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.get('/projects/:id/members', (req: Request, res: Response): void => {
    const projectId = req.params.id;
    if (!projectId) {
      res.status(404).json({error: 'project_not_found'});
      return;
    }
    try {
      res.json(listProjectMembers(actor(req), projectId));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/projects/:id/members', (req: Request, res: Response): void => {
    const projectId = req.params.id;
    if (!projectId) {
      res.status(404).json({error: 'project_not_found'});
      return;
    }
    const parsed = AddProjectMemberRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(addProjectMember(actor(req), projectId, parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  return router;
}
