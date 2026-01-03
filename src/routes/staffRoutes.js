import express from 'express';
import { 
  staffController 
} from '../controllers/staffController.js';
import { 
  verifyToken,
  requireHRRole,
  requireVerticalAccess
} from '../middleware/authMiddleware.js';
import { 
  idParamValidation,
  paginationValidation,
  searchValidation,
  createStaffValidation,
  updateStaffValidation,
  updateStaffStatusValidation,
  updateBurnoutLevelValidation
} from '../utils/validators.js';

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// GET /api/staff - Get all staff with filtering & pagination
router.get('/', 
  paginationValidation,
  requireVerticalAccess,
  staffController.getAllStaff
);

// GET /api/staff/search - Search staff
router.get('/search',
  searchValidation,
  requireVerticalAccess,
  staffController.searchStaff
);

// GET /api/staff/directory - Get staff directory
router.get('/directory',
  staffController.getStaffDirectory
);

// GET /api/staff/department/:department - Get staff by department
router.get('/department/:department',
  requireVerticalAccess,
  staffController.getStaffByDepartment
);

// GET /api/staff/statistics - Get staff statistics
router.get('/statistics',
  requireVerticalAccess,
  staffController.getStaffStatistics
);

// GET /api/staff/expiring-contracts - Get staff with expiring contracts
router.get('/expiring-contracts',
  requireVerticalAccess,
  staffController.getExpiringContracts
);

// GET /api/staff/burnout-report - Get burnout risk report
router.get('/burnout-report',
  requireVerticalAccess,
  staffController.getBurnoutReport
);

// GET /api/staff/:id - Get single staff member
router.get('/:id',
  idParamValidation,
  requireVerticalAccess,
  staffController.getStaffById
);

// POST /api/staff - Create new staff record
router.post('/',
  createStaffValidation,
  requireHRRole,
  staffController.createStaff
);

// PUT /api/staff/:id - Update staff info
router.put('/:id',
  idParamValidation,
  updateStaffValidation,
  requireVerticalAccess,
  staffController.updateStaff
);

// PUT /api/staff/:id/status - Update staff status
router.put('/:id/status',
  idParamValidation,
  updateStaffStatusValidation,
  requireHRRole,
  staffController.updateStaffStatus
);

// PUT /api/staff/:id/burnout - Update burnout level
router.put('/:id/burnout',
  idParamValidation,
  updateBurnoutLevelValidation,
  requireHRRole,
  staffController.updateBurnoutLevel
);

// GET /api/staff/:id/calculate-burnout - Calculate burnout risk
router.get('/:id/calculate-burnout',
  idParamValidation,
  requireVerticalAccess,
  staffController.calculateBurnoutRisk
);

// DELETE /api/staff/:id - Deactivate staff
router.delete('/:id',
  idParamValidation,
  requireHRRole,
  staffController.deleteStaff
);

export default router;
