import { Router } from 'express';
import { verifyToken, requireVerticalAccess } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { 
  recordPaymentValidation,
  paginationValidation,
  idParamValidation 
} from '../utils/validators.js';
import paymentController from '../controllers/paymentController.js';

const router = Router();

router.use(verifyToken);

// Finance operations require Super Admin (1) or Vertical Lead (2)
const requireFinanceAccess = requireRole(1, 2);

// Get all payments with filters and pagination
router.get('/', 
  paginationValidation, 
  paymentController.getAllPayments
);

// Get a specific payment
router.get('/:id', idParamValidation, paymentController.getPayment);

// Record a new payment - requires finance access
router.post('/', 
  requireFinanceAccess,
  requireVerticalAccess, 
  recordPaymentValidation, 
  paymentController.recordPayment
);

// Get payment statistics
router.get('/statistics/summary', paymentController.getPaymentStats);

// Get payments by contact
router.get('/contact/:contactId/payments', 
  idParamValidation.concat(paginationValidation), 
  paymentController.getPaymentsByContact
);

export default router;