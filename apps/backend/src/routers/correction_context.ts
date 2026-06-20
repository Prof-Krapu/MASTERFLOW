import {Router, type Request, type Response} from 'express';

import {
  CreateCorrectionContextSnapshotSchema,
  CreateSubmissionIntakeRequestSchema,
  CreatePreCorrectionManifestRequestSchema,
  CreateIdentityMatchCandidateRequestSchema,
  DecideIdentityMatchCandidateRequestSchema,
  LinkSubmissionIdentityRequestSchema,
  ValidatePreCorrectionManifestRequestSchema,
} from '@masterflow/shared';

import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  compileCorrectionContextPayload,
  createIdentityMatchCandidate,
  createCorrectionContextSnapshot,
  decideIdentityMatchCandidate,
  getCorrectionContextSnapshot,
  linkSubmissionIdentity,
  listIdentityMatchReviewItems,
} from '../services/correction_context.ts';
import {intakeSubmission, listSubmissions} from '../services/submission_intake.ts';
import {createPreCorrectionManifest, listPreCorrectionManifests, validatePreCorrectionManifest} from '../services/pre_correction_manifests.ts';

function actor(req: Request): AuthUser {
  if (!req.user) throw new Error('unauthorized');
  return req.user;
}

function fail(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'correction_context_error';
  const status = message.endsWith('_not_found') ? 404 : message === 'permission_denied' ? 403 : 400;
  res.status(status).json({error: message});
}

export function createCorrectionContextRouter(): Router {
  const router = Router();

  router.post(
    '/correction/batches/:id/context-snapshot',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      const parsed = CreateCorrectionContextSnapshotSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
        return;
      }
      try {
        res.status(201).json(
          createCorrectionContextSnapshot(actor(req), req.params.id ?? '', parsed.data),
        );
      } catch (error) {
        fail(res, error);
      }
    },
  );

  router.get('/correction/batches/:id/submissions', requireUser, requireRole('teacher'), (req, res): void => {
    try { res.json(listSubmissions(actor(req), req.params.id ?? '')); } catch (error) { fail(res, error); }
  });

  router.get('/correction/batches/:id/pre-correction-manifests', requireUser, requireRole('teacher'), (req, res): void => {
    try { res.json(listPreCorrectionManifests(actor(req), req.params.id ?? '')); } catch (error) { fail(res, error); }
  });

  router.get(
    '/correction/identity-match-candidates',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      try {
        const projectId = typeof req.query.project_id === 'string'
          ? req.query.project_id
          : req.query.project_id === undefined
            ? undefined
            : '';
        if (projectId === '') {
          res.status(400).json({error: 'invalid_project_id'});
          return;
        }
        res.json(listIdentityMatchReviewItems(actor(req), projectId));
      } catch (error) {
        fail(res, error);
      }
    },
  );

  router.post(
    '/correction/batches/:id/pre-correction-manifests',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      const parsed = CreatePreCorrectionManifestRequestSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()}); return; }
      try { res.status(201).json(createPreCorrectionManifest(actor(req), req.params.id ?? '', parsed.data)); } catch (error) { fail(res, error); }
    },
  );

  router.post(
    '/correction/pre-correction-manifests/:id/validate',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      const parsed = ValidatePreCorrectionManifestRequestSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()}); return; }
      try { res.json(validatePreCorrectionManifest(actor(req), req.params.id ?? '', parsed.data)); } catch (error) { fail(res, error); }
    },
  );

  router.post(
    '/correction/batches/:id/submissions',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      const parsed = CreateSubmissionIntakeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
        return;
      }
      try { res.status(201).json(intakeSubmission(actor(req), req.params.id ?? '', parsed.data)); } catch (error) { fail(res, error); }
    },
  );

  router.post(
    '/correction/submissions/:id/identity-match-candidates',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      const parsed = CreateIdentityMatchCandidateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
        return;
      }
      try {
        res.status(201).json(
          createIdentityMatchCandidate(actor(req), req.params.id ?? '', parsed.data),
        );
      } catch (error) {
        fail(res, error);
      }
    },
  );

  router.post(
    '/correction/identity-match-candidates/:id/decision',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      const parsed = DecideIdentityMatchCandidateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
        return;
      }
      try {
        res.json(decideIdentityMatchCandidate(actor(req), req.params.id ?? '', parsed.data));
      } catch (error) {
        fail(res, error);
      }
    },
  );

  router.get(
    '/correction/batches/:id/context-snapshot',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      try {
        res.json(getCorrectionContextSnapshot(actor(req), req.params.id ?? ''));
      } catch (error) {
        fail(res, error);
      }
    },
  );

  router.get(
    '/correction/batches/:id/context-payload',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      try {
        res.json(compileCorrectionContextPayload(actor(req), req.params.id ?? ''));
      } catch (error) {
        fail(res, error);
      }
    },
  );

  router.post(
    '/correction/submissions/:id/identity-link',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      const parsed = LinkSubmissionIdentityRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
        return;
      }
      try {
        res.json(linkSubmissionIdentity(actor(req), req.params.id ?? '', parsed.data));
      } catch (error) {
        fail(res, error);
      }
    },
  );

  return router;
}
