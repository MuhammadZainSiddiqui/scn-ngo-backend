import express from 'express';
import {
  exceptionController
} from '../controllers/exceptionController.js';
import {
  verifyToken,
  requireVerticalAccess
} from '../middleware/authMiddleware.js';
import {
  idParamValidation,
  paginationValidation,
  searchValidation,
  createExceptionValidation,
  updateExceptionValidation,
  updateExceptionStatusValidation,
  assignExceptionValidation,
  resolveExceptionValidation,
  escalateExceptionValidation,
  addCommentValidation
} from '../utils/validators.js';

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// GET /api/exceptions - Get all exceptions with filtering & pagination
router.get('/',
  paginationValidation,
  requireVerticalAccess,
  exceptionController.getAllExceptions
);

// GET /api/exceptions/search - Search exceptions
router.get('/search',
  searchValidation,
  requireVerticalAccess,
  exceptionController.searchExceptions
);

// GET /api/exceptions/overdue - Get overdue exceptions
router.get('/overdue',
  paginationValidation,
  requireVerticalAccess,
  exceptionController.getOverdue
);

// GET /api/exceptions/statistics - Get exception statistics
router.get('/statistics',
  requireVerticalAccess,
  exceptionController.getStatistics
);

// GET /api/exceptions/escalation-report - Get escalation report
router.get('/escalation-report',
  requireVerticalAccess,
  exceptionController.getEscalationReport
);

// GET /api/exceptions/severity/:severity - Get exceptions by severity
router.get('/severity/:severity',
  idParamValidation,
  paginationValidation,
  requireVerticalAccess,
  exceptionController.getBySeverity
);

// GET /api/exceptions/status/:status - Get exceptions by status
router.get('/status/:status',
  idParamValidation,
  paginationValidation,
  requireVerticalAccess,
  exceptionController.getByStatus
);

// GET /api/exceptions/assigned/:user_id - Get exceptions assigned to user
router.get('/assigned/:user_id',
  idParamValidation,
  paginationValidation,
  requireVerticalAccess,
  exceptionController.getAssignedToUser
);

// GET /api/exceptions/workload/:user_id - Get user workload
router.get('/workload/:user_id',
  idParamValidation,
  requireVerticalAccess,
  exceptionController.getUserWorkload
);

// GET /api/exceptions/vertical/:vertical_id - Get vertical summary
router.get('/vertical/:vertical_id',
  idParamValidation,
  requireVerticalAccess,
  exceptionController.getVerticalSummary
);

// GET /api/exceptions/:id - Get single exception
router.get('/:id',
  idParamValidation,
  requireVerticalAccess,
  exceptionController.getExceptionById
);

// GET /api/exceptions/:id/comments - Get exception comments
router.get('/:id/comments',
  idParamValidation,
  requireVerticalAccess,
  exceptionController.getExceptionComments
);

// GET /api/exceptions/:id/history - Get exception history
router.get('/:id/history',
  idParamValidation,
  requireVerticalAccess,
  exceptionController.getExceptionHistory
);

// GET /api/exceptions/:id/escalations - Get exception escalations
router.get('/:id/escalations',
  idParamValidation,
  requireVerticalAccess,
  exceptionController.getExceptionEscalations
);

// POST /api/exceptions - Create new exception
router.post('/',
  createExceptionValidation,
  requireVerticalAccess,
  exceptionController.createException
);

// PUT /api/exceptions/:id - Update exception details
router.put('/:id',
  idParamValidation,
  updateExceptionValidation,
  requireVerticalAccess,
  exceptionController.updateException
);

// PUT /api/exceptions/:id/status - Update exception status
router.put('/:id/status',
  idParamValidation,
  updateExceptionStatusValidation,
  requireVerticalAccess,
  exceptionController.updateExceptionStatus
);

// PUT /api/exceptions/:id/assign - Assign exception to user
router.put('/:id/assign',
  idParamValidation,
  assignExceptionValidation,
  requireVerticalAccess,
  exceptionController.assignException
);

// PUT /api/exceptions/:id/reassign - Reassign exception
router.put('/:id/reassign',
  idParamValidation,
  assignExceptionValidation,
  requireVerticalAccess,
  exceptionController.reassignException
);

// PUT /api/exceptions/:id/resolve - Mark exception as resolved
router.put('/:id/resolve',
  idParamValidation,
  resolveExceptionValidation,
  requireVerticalAccess,
  exceptionController.resolveException
);

// PUT /api/exceptions/:id/close - Close exception
router.put('/:id/close',
  idParamValidation,
  requireVerticalAccess,
  exceptionController.closeException
);

// PUT /api/exceptions/:id/escalate - Escalate exception
router.put('/:id/escalate',
  idParamValidation,
  escalateExceptionValidation,
  requireVerticalAccess,
  exceptionController.escalateException
);

// POST /api/exceptions/:id/comments - Add comment to exception
router.post('/:id/comments',
  idParamValidation,
  addCommentValidation,
  requireVerticalAccess,
  exceptionController.addComment
);

// DELETE /api/exceptions/:id - Delete exception
router.delete('/:id',
  idParamValidation,
  requireVerticalAccess,
  exceptionController.deleteException
);

export default router;
