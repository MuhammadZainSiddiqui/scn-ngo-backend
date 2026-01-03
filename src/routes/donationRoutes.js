import express from 'express';
import { 
  donationController 
} from '../controllers/donationController.js';
import { 
  verifyToken,
  requireFinanceRole,
  requireVerticalAccess
} from '../middleware/authMiddleware.js';
import { 
  idParamValidation,
  paginationValidation,
  donationValidation,
  updateDonationValidation,
  confirmDonationValidation,
  searchValidation
} from '../utils/validators.js';

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// GET /api/donations - Get all donations with filtering & pagination
router.get('/', 
  paginationValidation,
  requireVerticalAccess, // Apply vertical isolation
  donationController.getAllDonations
);

// GET /api/donations/search - Search donations
router.get('/search',
  searchValidation,
  requireVerticalAccess,
  donationController.searchDonations
);

// GET /api/donations/donor/:donorId - Get donations by donor
router.get('/donor/:donorId',
  idParamValidation,
  donationController.getDonationsByDonor
);

// GET /api/donations/vertical/:verticalId - Get donations by vertical
router.get('/vertical/:verticalId',
  idParamValidation,
  requireVerticalAccess,
  donationController.getDonationsByVertical
);

// GET /api/donations/program/:programId - Get donations by program
router.get('/program/:programId',
  idParamValidation,
  donationController.getDonationsByProgram
);

// GET /api/donations/stats - Get donation statistics
router.get('/stats',
  requireVerticalAccess,
  donationController.getDonationStats
);

// GET /api/donations/report - Generate donation report
router.get('/report',
  paginationValidation,
  requireFinanceRole, // Finance officers only for reports
  donationController.getDonationReport
);

// GET /api/donations/:id - Get single donation
router.get('/:id',
  idParamValidation,
  requireVerticalAccess,
  donationController.getDonationById
);

// POST /api/donations - Create new donation
router.post('/',
  donationValidation,
  requireFinanceRole, // Finance officers only
  donationController.createDonation
);

// PUT /api/donations/:id - Update donation
router.put('/:id',
  idParamValidation,
  updateDonationValidation,
  requireFinanceRole,
  donationController.updateDonation
);

// PUT /api/donations/:id/confirm - Confirm donation
router.put('/:id/confirm',
  idParamValidation,
  confirmDonationValidation,
  requireFinanceRole,
  donationController.confirmDonation
);

// PUT /api/donations/:id/receipt - Issue receipt
router.put('/:id/receipt',
  idParamValidation,
  requireFinanceRole,
  donationController.issueReceipt
);

// DELETE /api/donations/:id - Cancel donation
router.delete('/:id',
  idParamValidation,
  requireFinanceRole,
  donationController.deleteDonation
);

export default router;