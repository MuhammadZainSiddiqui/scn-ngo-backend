import express from 'express';
import { volunteerController } from '../controllers/volunteerController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { requirePermission, requireRole } from '../middleware/roleMiddleware.js';
import {
  idParamValidation,
  paginationValidation,
  searchValidation,
  createVolunteerValidation,
  updateVolunteerValidation,
  volunteerHoursLogValidation,
  volunteerInsuranceUpdateValidation,
  volunteerAssignmentValidation,
} from '../utils/validators.js';

const router = express.Router();

router.use(verifyToken);

// GET /api/volunteers - list volunteers with pagination & filters
router.get('/', paginationValidation, requirePermission('volunteers', 'read'), volunteerController.getAllVolunteers);

// GET /api/volunteers/search - search volunteers
router.get(
  '/search',
  paginationValidation,
  searchValidation,
  requirePermission('volunteers', 'read'),
  volunteerController.searchVolunteers
);

// GET /api/volunteers/stats - volunteer statistics
router.get('/stats', requirePermission('volunteers', 'read'), volunteerController.getVolunteerStats);

// GET /api/volunteers/report - volunteer reporting
router.get('/report', paginationValidation, requirePermission('volunteers', 'read'), volunteerController.getVolunteerReport);

// GET /api/volunteers/:id - full volunteer profile
router.get('/:id', idParamValidation, requirePermission('volunteers', 'read'), volunteerController.getVolunteerById);

// POST /api/volunteers - create volunteer
router.post('/', createVolunteerValidation, requireRole(1, 4), volunteerController.createVolunteer);

// PUT /api/volunteers/:id - update volunteer
router.put('/:id', idParamValidation, updateVolunteerValidation, requireRole(1, 4), volunteerController.updateVolunteer);

// POST /api/volunteers/:id/insurance - update insurance details
router.post(
  '/:id/insurance',
  idParamValidation,
  volunteerInsuranceUpdateValidation,
  requireRole(1, 4),
  volunteerController.updateInsurance
);

// POST /api/volunteers/:id/hours - log volunteer hours
router.post(
  '/:id/hours',
  idParamValidation,
  volunteerHoursLogValidation,
  requireRole(1, 4),
  volunteerController.logHours
);

// GET /api/volunteers/:id/hours - hours summary
router.get('/:id/hours', idParamValidation, requirePermission('volunteers', 'read'), volunteerController.getHoursSummary);

// POST /api/volunteers/:id/assignments - assign volunteer to program
router.post(
  '/:id/assignments',
  idParamValidation,
  volunteerAssignmentValidation,
  requireRole(1, 4),
  volunteerController.createAssignment
);

// DELETE /api/volunteers/:id - deactivate volunteer
router.delete('/:id', idParamValidation, requireRole(1, 4), volunteerController.deactivateVolunteer);

export default router;
