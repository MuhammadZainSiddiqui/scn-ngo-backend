import { Router } from 'express';
import { authenticateToken, requireRole, requireVerticalAccess } from '../middleware/authMiddleware.js';
import { 
  createWaiverValidation, 
  reviewWaiverValidation,
  paginationValidation,
  idParamValidation 
} from '../utils/validators.js';
import waiverController from '../controllers/waiverController.js';

const router = Router();

router.use(authenticateToken);

// Super Admin only for waiver approval/rejection
const requireSuperAdmin = requireRole(1);

// Finance access for viewing waivers
const requireFinanceAccess = requireRole(1, 2);

// Get all waivers with filters and pagination
router.get('/', 
  paginationValidation, 
  waiverController.getAllWaivers
);

// Get a specific waiver
router.get('/:id', idParamValidation, waiverController.getWaiver);

// Create a new waiver request (contacts can request their own waivers)
router.post('/', 
  createWaiverValidation, 
  waiverController.createWaiver
);

// Approve a waiver - Super Admin only
router.put('/:id/approve', 
  requireSuperAdmin,
  requireVerticalAccess,
  reviewWaiverValidation, 
  waiverController.approveWaiver
);

// Reject a waiver - Super Admin only
router.put('/:id/reject', 
  requireSuperAdmin,
  requireVerticalAccess,
  reviewWaiverValidation, 
  waiverController.rejectWaiver
);

// Get waiver statistics
router.get('/statistics/summary', waiverController.getWaiverStatistics);

// Get waivers by contact
router.get('/contact/:contactId/waivers', 
  idParamValidation.concat(paginationValidation), 
  waiverController.getWaiversByContact
);

export default router;