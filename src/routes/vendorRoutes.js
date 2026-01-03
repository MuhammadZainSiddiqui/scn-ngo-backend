import express from 'express';
import { vendorController } from '../controllers/vendorController.js';
import {
  verifyToken,
  requireVerticalAccess
} from '../middleware/authMiddleware.js';
import {
  idParamValidation,
  paginationValidation,
  searchValidation,
  createVendorValidation,
  updateVendorValidation,
  updateVendorStatusValidation
} from '../utils/validators.js';

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// GET /api/vendors - Get all vendors with filtering & pagination
router.get('/',
  paginationValidation,
  requireVerticalAccess,
  vendorController.getAllVendors
);

// GET /api/vendors/search - Search vendors
router.get('/search',
  searchValidation,
  requireVerticalAccess,
  vendorController.searchVendors
);

// GET /api/vendors/statistics - Get vendor statistics
router.get('/statistics',
  requireVerticalAccess,
  vendorController.getVendorStats
);

// GET /api/vendors/category/:category - Get vendors by category
router.get('/category/:category',
  requireVerticalAccess,
  vendorController.getVendorsByCategory
);

// GET /api/vendors/:id - Get single vendor
router.get('/:id',
  idParamValidation,
  requireVerticalAccess,
  vendorController.getVendorById
);

// POST /api/vendors - Create new vendor
router.post('/',
  createVendorValidation,
  vendorController.createVendor
);

// PUT /api/vendors/:id - Update vendor info
router.put('/:id',
  idParamValidation,
  updateVendorValidation,
  requireVerticalAccess,
  vendorController.updateVendor
);

// PUT /api/vendors/:id/status - Update vendor status
router.put('/:id/status',
  idParamValidation,
  updateVendorStatusValidation,
  requireVerticalAccess,
  vendorController.updateVendorStatus
);

// DELETE /api/vendors/:id - Deactivate vendor
router.delete('/:id',
  idParamValidation,
  requireVerticalAccess,
  vendorController.deleteVendor
);

export default router;
