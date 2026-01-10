import { Router } from 'express';
import { verifyToken, requireVerticalAccess } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { 
  createSubsidyValidation, 
  updateSubsidyValidation,
  allocateSubsidyValidation,
  paginationValidation,
  idParamValidation 
} from '../utils/validators.js';
import subsidyController from '../controllers/subsidyController.js';

const router = Router();

router.use(verifyToken);

// Finance operations require Super Admin (1)
const requireSuperAdmin = requireRole(1);

// Get all subsidies with filters and pagination
router.get('/', 
  paginationValidation, 
  subsidyController.getAllSubsidies
);

// Get a specific subsidy
router.get('/:id', idParamValidation, subsidyController.getSubsidy);

// Create a new subsidy - Super Admin only
router.post('/', 
  requireSuperAdmin,
  requireVerticalAccess, 
  createSubsidyValidation, 
  subsidyController.createSubsidy
);

// Update a subsidy - Super Admin only
router.put('/:id', 
  requireSuperAdmin,
  requireVerticalAccess, 
  updateSubsidyValidation, 
  subsidyController.updateSubsidy
);

// Allocate subsidy to a fee - Super Admin only
router.post('/:id/allocate', 
  requireSuperAdmin,
  requireVerticalAccess, 
  allocateSubsidyValidation, 
  subsidyController.allocateSubsidy
);

// Delete a subsidy - Super Admin only
router.delete('/:id', 
  requireSuperAdmin, 
  subsidyController.deleteSubsidy
);

// Get subsidy allocation statistics
router.get('/statistics/allocations', subsidyController.getAllocationStats);

// Get subsidy usage report
router.get('/reports/usage', subsidyController.getUsageReport);

export default router;