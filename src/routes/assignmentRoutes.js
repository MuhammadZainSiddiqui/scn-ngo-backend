import express from 'express';
import { assignmentController } from '../controllers/assignmentController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { requirePermission, requireRole } from '../middleware/roleMiddleware.js';
import {
  idParamValidation,
  paginationValidation,
  volunteerAssignmentValidation,
  assignmentUpdateValidation,
} from '../utils/validators.js';

const router = express.Router();

router.use(verifyToken);

// GET /api/assignments - list assignments
router.get('/', paginationValidation, requirePermission('volunteers', 'read'), assignmentController.getAllAssignments);

// GET /api/assignments/:id
router.get('/:id', idParamValidation, requirePermission('volunteers', 'read'), assignmentController.getAssignmentById);

// POST /api/assignments - create assignment
router.post('/', volunteerAssignmentValidation, requireRole(1, 4), assignmentController.createAssignment);

// PUT /api/assignments/:id - update assignment
router.put('/:id', idParamValidation, assignmentUpdateValidation, requireRole(1, 4), assignmentController.updateAssignment);

// DELETE /api/assignments/:id - deactivate assignment
router.delete('/:id', idParamValidation, requireRole(1, 4), assignmentController.deactivateAssignment);

export default router;
