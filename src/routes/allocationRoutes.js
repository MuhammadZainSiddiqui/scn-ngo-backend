import express from 'express';
import { 
  allocationController 
} from '../controllers/allocationController.js';
import { 
  verifyToken,
  requireFinanceRole,
  requireVerticalAccess
} from '../middleware/authMiddleware.js';
import { 
  idParamValidation,
  paginationValidation,
  allocationValidation,
  updateAllocationValidation,
  reallocateValidation
} from '../utils/validators.js';

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// GET /api/allocations - Get all allocations
router.get('/',
  paginationValidation,
  requireVerticalAccess,
  allocationController.getAllAllocations
);

// GET /api/allocations/donation/:donationId - Get allocations for donation
router.get('/donation/:donationId',
  idParamValidation,
  allocationController.getAllocationsByDonation
);

// GET /api/allocations/vertical/:verticalId - Get allocations to vertical
router.get('/vertical/:verticalId',
  idParamValidation,
  requireVerticalAccess,
  allocationController.getAllocationsByVertical
);

// GET /api/allocations/program/:programId - Get allocations to program
router.get('/program/:programId',
  idParamValidation,
  allocationController.getAllocationsByProgram
);

// GET /api/allocations/:id - Get single allocation
router.get('/:id',
  idParamValidation,
  requireVerticalAccess,
  allocationController.getAllocationById
);

// POST /api/allocations - Create allocation
router.post('/',
  allocationValidation,
  requireFinanceRole, // Finance officers only
  allocationController.createAllocation
);

// PUT /api/allocations/:id - Update allocation
router.put('/:id',
  idParamValidation,
  updateAllocationValidation,
  requireFinanceRole,
  allocationController.updateAllocation
);

// PUT /api/allocations/:id/reallocate - Move to different vertical
router.put('/:id/reallocate',
  idParamValidation,
  reallocateValidation,
  requireFinanceRole,
  allocationController.reallocate
);

// DELETE /api/allocations/:id - Delete allocation
router.delete('/:id',
  idParamValidation,
  requireFinanceRole,
  allocationController.deleteAllocation
);

export default router;