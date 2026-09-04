import {Router} from 'express';

import {requireRole, requireUser} from '../middleware/auth.ts';
import {
  getMasterPlanAdapterStatus,
  loadMasterPlanPlanningView,
  MasterPlanPlanningSourceError,
} from '../services/masterplan_adapter.ts';

export function createMasterPlanAdapterRouter(): Router {
  const router = Router();
  router.get('/planning/masterplan/status', requireUser, requireRole('teacher'), (_req, res) => {
    res.json(getMasterPlanAdapterStatus());
  });
  router.get('/planning/masterplan', requireUser, requireRole('teacher'), async (_req, res) => {
    try {
      const view = await loadMasterPlanPlanningView();
      res.setHeader('Cache-Control', 'private, no-store');
      res.json(view);
    } catch (error) {
      if (error instanceof MasterPlanPlanningSourceError) {
        const status = error.code === 'source_invalid' ? 500 : 503;
        res.status(status).json({error: `masterplan_${error.code}`});
        return;
      }
      res.status(500).json({error: 'masterplan_source_invalid'});
    }
  });
  return router;
}
