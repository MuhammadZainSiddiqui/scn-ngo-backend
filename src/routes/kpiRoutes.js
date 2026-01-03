import express from 'express';
import { kpiController } from '../controllers/kpiController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { requirePermission, requireRole } from '../middleware/roleMiddleware.js';
import {
  idParamValidation,
  paginationValidation,
  createKpiValidation,
  updateKpiValidation,
  updateKpiProgressValidation,
} from '../utils/validators.js';

const router = express.Router();

router.use(verifyToken);

// GET /api/kpis - list KPIs (optionally filter by program_id / vertical_id)
router.get('/', paginationValidation, requirePermission('programs', 'read'), kpiController.getAllKpis);

// GET /api/kpis/stats - KPI statistics
router.get('/stats', requirePermission('programs', 'read'), kpiController.getKpiStats);

// GET /api/kpis/program/:id - KPIs for a program
router.get(
  '/program/:id',
  idParamValidation,
  paginationValidation,
  requirePermission('programs', 'read'),
  kpiController.getKpisByProgram
);

// GET /api/kpis/:id - KPI details
router.get('/:id', idParamValidation, requirePermission('programs', 'read'), kpiController.getKpiById);

// POST /api/kpis - create KPI
router.post('/', createKpiValidation, requirePermission('programs', 'write'), kpiController.createKpi);

// PUT /api/kpis/:id - update KPI
router.put(
  '/:id',
  idParamValidation,
  updateKpiValidation,
  requirePermission('programs', 'write'),
  kpiController.updateKpi
);

// PUT /api/kpis/:id/progress - update KPI progress
router.put(
  '/:id/progress',
  idParamValidation,
  updateKpiProgressValidation,
  requirePermission('programs', 'write'),
  kpiController.updateKpiProgress
);

// DELETE /api/kpis/:id - delete KPI (Super Admin only)
router.delete('/:id', idParamValidation, requireRole(1), kpiController.deleteKpi);

export default router;
