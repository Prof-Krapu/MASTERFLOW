import {Router} from 'express';

import {requireRole, requireUser} from '../middleware/auth.ts';
import {getMasterPlanAdapterStatus} from '../services/masterplan_adapter.ts';

export function createMasterPlanAdapterRouter(): Router {
  const router = Router();
  router.get('/planning/masterplan/status', requireUser, requireRole('teacher'), (_req, res) => {
    res.json(getMasterPlanAdapterStatus());
  });
  return router;
}
