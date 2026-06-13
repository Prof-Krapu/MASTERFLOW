import {Router, type Request, type Response} from 'express';

import {
  CreateGuideRequestSchema,
  CreateGuidedSessionRequestSchema,
  AddGuidedParticipantRequestSchema,
  SubmitGuidedAnswerRequestSchema,
  UpdateGuideRequestSchema,
} from '@masterflow/shared';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  advanceGuidedSession,
  addGuidedSessionParticipant,
  completeGuidedSession,
  createGuide,
  createGuidedSession,
  getGuide,
  getGuidedSession,
  listGuides,
  submitGuidedAnswer,
  updateGuide,
  validateGuide,
} from '../services/guided_runtime.ts';

function actor(req: Request): AuthUser {
  const user = req.user;
  if (!user) throw new Error('[guided_runtime] req.user absent malgré requireUser');
  return user;
}

function routeError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'guided_runtime_error';
  if (
    message === 'permission_denied' ||
    message === 'guided_participant_required' ||
    message === 'guided_session_not_active' ||
    message === 'guided_session_incomplete' ||
    message === 'guided_consent_required' ||
    message === 'guided_participant_scope_denied'
  ) {
    res.status(403).json({error: message});
    return;
  }
  if (
    message === 'guided_guide_not_found' ||
    message === 'guided_session_not_found' ||
    message === 'guided_question_not_found' ||
    message === 'guided_session_expired'
  ) {
    res.status(404).json({error: message});
    return;
  }
  if (
    message === 'guided_template_domain_mismatch' ||
    message === 'guided_question_flow_invalid' ||
    message === 'guided_target_schema_missing' ||
    message === 'guided_target_schema_invalid' ||
    message === 'guided_question_duplicate' ||
    message === 'guided_question_target_unknown' ||
    message === 'guided_guide_not_editable' ||
    message === 'guided_source_not_validated' ||
    message === 'guided_preview_owner_required' ||
    message === 'guided_answer_invalid' ||
    message === 'guided_answer_schema_invalid'
  ) {
    res.status(400).json({error: message});
    return;
  }
  res.status(500).json({error: 'guided_runtime_error'});
}

export function createGuidedRuntimeRouter(): Router {
  const router = Router();

  router.use(requireUser);

  router.get('/guides', (req: Request, res: Response): void => {
    res.json({results: listGuides(actor(req))});
  });

  router.post('/guides', (req: Request, res: Response): void => {
    const parsed = CreateGuideRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(createGuide(actor(req), parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.get('/guides/:id', (req: Request, res: Response): void => {
    const guideId = req.params.id;
    if (!guideId) {
      res.status(404).json({error: 'guided_guide_not_found'});
      return;
    }
    try {
      res.json(getGuide(actor(req), guideId));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.patch('/guides/:id', (req: Request, res: Response): void => {
    const guideId = req.params.id;
    if (!guideId) {
      res.status(404).json({error: 'guided_guide_not_found'});
      return;
    }
    const parsed = UpdateGuideRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json(updateGuide(actor(req), guideId, parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/guides/:id/validate', (req: Request, res: Response): void => {
    const guideId = req.params.id;
    if (!guideId) {
      res.status(404).json({error: 'guided_guide_not_found'});
      return;
    }
    try {
      res.json(validateGuide(actor(req), guideId));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/guided-sessions', (req: Request, res: Response): void => {
    const parsed = CreateGuidedSessionRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(createGuidedSession(actor(req), parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.get('/guided-sessions/:id', (req: Request, res: Response): void => {
    const sessionId = req.params.id;
    if (!sessionId) {
      res.status(404).json({error: 'guided_session_not_found'});
      return;
    }
    try {
      res.json(getGuidedSession(actor(req), sessionId));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/guided-sessions/:id/participants', (req: Request, res: Response): void => {
    const sessionId = req.params.id;
    if (!sessionId) {
      res.status(404).json({error: 'guided_session_not_found'});
      return;
    }
    const parsed = AddGuidedParticipantRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(
        addGuidedSessionParticipant(
          actor(req),
          sessionId,
          parsed.data.user_id,
          parsed.data.role,
          parsed.data.consent,
        ),
      );
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/guided-sessions/:id/answers', (req: Request, res: Response): void => {
    const sessionId = req.params.id;
    if (!sessionId) {
      res.status(404).json({error: 'guided_session_not_found'});
      return;
    }
    const parsed = SubmitGuidedAnswerRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(submitGuidedAnswer(actor(req), sessionId, parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/guided-sessions/:id/advance', (req: Request, res: Response): void => {
    const sessionId = req.params.id;
    if (!sessionId) {
      res.status(404).json({error: 'guided_session_not_found'});
      return;
    }
    try {
      res.json(advanceGuidedSession(actor(req), sessionId));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/guided-sessions/:id/complete', (req: Request, res: Response): void => {
    const sessionId = req.params.id;
    if (!sessionId) {
      res.status(404).json({error: 'guided_session_not_found'});
      return;
    }
    try {
      res.json(completeGuidedSession(actor(req), sessionId));
    } catch (error) {
      routeError(res, error);
    }
  });

  return router;
}
