import { Router } from 'express';
import { authenticateToken, requireRole, requireVerticalAccess } from '../middleware/authMiddleware.js';
import { 
  createFeeValidation, 
  updateFeeStatusValidation, 
  updateFeeAmountValidation,
  paginationValidation,
  idParamValidation 
} from '../utils/validators.js';
import feeController from '../controllers/feeController.js';

const router = Router();

router.use(authenticateToken);

// Finance operations require Super Admin (1) or Vertical Lead (2)
const requireFinanceAccess = requireRole(1, 2);

// Get all fees with filters and pagination
router.get('/', 
  paginationValidation, 
  feeController.getAllFees
);

// Get a specific fee
router.get('/:id', idParamValidation, feeController.getFee);

// Create a new fee - requires finance access
router.post('/', 
  requireFinanceAccess,
  requireVerticalAccess, 
  createFeeValidation, 
  feeController.createFee
);

// Update fee status - requires finance access
router.put('/:id/status', 
  requireFinanceAccess,
  requireVerticalAccess, 
  updateFeeStatusValidation, 
  feeController.updateFeeStatus
);

// Update fee amount - requires finance access
router.put('/:id/amount', 
  requireFinanceAccess,
  requireVerticalAccess, 
  updateFeeAmountValidation, 
  feeController.updateFeeAmount
);

// Delete a fee - requires Super Admin only
router.delete('/:id', 
  requireRole(1), 
  feeController.deleteFee
);

// Get fee statistics
router.get('/statistics/summary', feeController.getStatistics);

// Get aging report
router.get('/reports/aging', feeController.getAgingReport);

// Get fees by contact
router.get('/contact/:contactId/fees', 
  idParamValidation.concat(paginationValidation), 
  feeController.getFeesByContact
);

export default router;