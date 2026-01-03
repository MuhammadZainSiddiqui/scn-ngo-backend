import express from 'express';
import { requisitionController } from '../controllers/requisitionController.js';
import {
  verifyToken,
  requireVerticalAccess
} from '../middleware/authMiddleware.js';
import {
  idParamValidation,
  paginationValidation,
  searchValidation,
  createRequisitionValidation,
  updateRequisitionValidation,
  addRequisitionItemValidation,
  updateRequisitionItemValidation,
  approveRequisitionValidation,
  rejectRequisitionValidation,
  orderRequisitionValidation
} from '../utils/validators.js';

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// GET /api/requisitions - Get all requisitions with filtering & pagination
router.get('/',
  paginationValidation,
  requireVerticalAccess,
  requisitionController.getAllRequisitions
);

// GET /api/requisitions/search - Search requisitions
router.get('/search',
  searchValidation,
  requireVerticalAccess,
  requisitionController.searchRequisitions
);

// GET /api/requisitions/statistics - Get requisition statistics
router.get('/statistics',
  requireVerticalAccess,
  requisitionController.getRequisitionStats
);

// GET /api/requisitions/:id - Get single requisition with items
router.get('/:id',
  idParamValidation,
  requireVerticalAccess,
  requisitionController.getRequisitionById
);

// POST /api/requisitions - Create new requisition
router.post('/',
  createRequisitionValidation,
  requisitionController.createRequisition
);

// PUT /api/requisitions/:id - Update requisition info
router.put('/:id',
  idParamValidation,
  updateRequisitionValidation,
  requireVerticalAccess,
  requisitionController.updateRequisition
);

// PUT /api/requisitions/:id/approve - Approve requisition
router.put('/:id/approve',
  idParamValidation,
  approveRequisitionValidation,
  requireVerticalAccess,
  requisitionController.approveRequisition
);

// PUT /api/requisitions/:id/reject - Reject requisition
router.put('/:id/reject',
  idParamValidation,
  rejectRequisitionValidation,
  requireVerticalAccess,
  requisitionController.rejectRequisition
);

// PUT /api/requisitions/:id/order - Place order for requisition
router.put('/:id/order',
  idParamValidation,
  orderRequisitionValidation,
  requireVerticalAccess,
  requisitionController.orderRequisition
);

// PUT /api/requisitions/:id/receive - Receive ordered items
router.put('/:id/receive',
  idParamValidation,
  requireVerticalAccess,
  requisitionController.receiveRequisition
);

// DELETE /api/requisitions/:id - Delete requisition
router.delete('/:id',
  idParamValidation,
  requireVerticalAccess,
  requisitionController.deleteRequisition
);

// Requisition Items
// POST /api/requisitions/:id/items - Add item to requisition
router.post('/:id/items',
  idParamValidation,
  addRequisitionItemValidation,
  requireVerticalAccess,
  requisitionController.addRequisitionItem
);

// PUT /api/requisitions/:id/items/:itemId - Update requisition item
router.put('/:id/items/:itemId',
  idParamValidation,
  updateRequisitionItemValidation,
  requireVerticalAccess,
  requisitionController.updateRequisitionItem
);

// DELETE /api/requisitions/:id/items/:itemId - Delete requisition item
router.delete('/:id/items/:itemId',
  idParamValidation,
  requireVerticalAccess,
  requisitionController.deleteRequisitionItem
);

export default router;
