import express from 'express';
import { programController } from '../controllers/programController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/roleMiddleware.js';
import {
  idParamValidation,
  paginationValidation,
  createProgramValidation,
  updateProgramValidation,
  updateProgramStatusValidation,
} from '../utils/validators.js';

const router = express.Router();

router.use(verifyToken);

// GET /api/programs - list programs with pagination & filters
router.get('/', paginationValidation, requirePermission('programs', 'read'), programController.getAllPrograms);

// GET /api/programs/stats - program summary statistics
router.get('/stats', requirePermission('programs', 'read'), programController.getProgramsStats);

// GET /api/programs/:id/budget - program budget summary
router.get('/:id/budget', idParamValidation, requirePermission('programs', 'read'), programController.getProgramBudget);

// GET /api/programs/:id/volunteers - program volunteers
router.get(
  '/:id/volunteers',
  idParamValidation,
  paginationValidation,
  requirePermission('programs', 'read'),
  programController.getProgramVolunteers
);

// GET /api/programs/:id/donations - program donations + allocations
router.get(
  '/:id/donations',
  idParamValidation,
  paginationValidation,
  requirePermission('programs', 'read'),
  programController.getProgramDonations
);

// GET /api/programs/:id/kpis - KPIs for program
router.get(
  '/:id/kpis',
  idParamValidation,
  paginationValidation,
  requirePermission('programs', 'read'),
  programController.getProgramKpis
);

// GET /api/programs/:id/report - impact/budget/KPI report
router.get('/:id/report', idParamValidation, requirePermission('programs', 'read'), programController.getProgramReport);

// GET /api/programs/:id - program details
router.get('/:id', idParamValidation, requirePermission('programs', 'read'), programController.getProgramById);

// POST /api/programs - create program
router.post('/', createProgramValidation, requirePermission('programs', 'write'), programController.createProgram);

// PUT /api/programs/:id - update program
router.put(
  '/:id',
  idParamValidation,
  updateProgramValidation,
  requirePermission('programs', 'write'),
  programController.updateProgram
);

// PUT /api/programs/:id/status - update program status
router.put(
  '/:id/status',
  idParamValidation,
  updateProgramStatusValidation,
  requirePermission('programs', 'write'),
  programController.updateProgramStatus
);

// DELETE /api/programs/:id - archive (cancel) program; super-admin can hard delete (?hard=true)
router.delete('/:id', idParamValidation, requirePermission('programs', 'write'), programController.archiveProgram);

export default router;
