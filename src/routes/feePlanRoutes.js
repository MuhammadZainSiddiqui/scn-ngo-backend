import { Router } from 'express';
import { verifyToken, requireVerticalAccess } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { 
  createFeePlanValidation, 
  updateFeePlanValidation,
  paginationValidation 
} from '../utils/validators.js';
import feePlanController from '../controllers/feePlanController.js';

const router = Router();

router.use(verifyToken);

// Finance operations require Super Admin (1) or Vertical Lead (2)
const requireFinanceAccess = requireRole(1, 2);

// Get all fee plans with filters and pagination
router.get('/', 
  paginationValidation, 
  feePlanController.getAllFeePlans
);

// Get a specific fee plan
router.get('/:id', feePlanController.getFeePlan);

// Create a new fee plan - requires finance access
router.post('/', 
  requireFinanceAccess,
  requireVerticalAccess, 
  createFeePlanValidation, 
  feePlanController.createFeePlan
);

// Update a fee plan - requires finance access
router.put('/:id', 
  requireFinanceAccess,
  requireVerticalAccess, 
  updateFeePlanValidation, 
  feePlanController.updateFeePlan
);

// Delete a fee plan - requires Super Admin only
router.delete('/:id', 
  requireRole(1), 
  feePlanController.deleteFeePlan
);

// Get fee plan templates
router.get('/templates/list', feePlanController.getTemplates);

// Bulk create fees from a template
router.post('/bulk-create', 
  requireFinanceAccess,
  requireVerticalAccess, 
  feePlanController.bulkCreateFromTemplate
);

export default router;