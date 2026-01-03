import { Router } from 'express';
import { auditLogController } from '../controllers/auditLogController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { auditLogQueryValidation, paginationValidation } from '../utils/validators.js';

const router = Router();

// Apply verifyToken to all audit log routes
router.use(verifyToken);

// GET all audit logs (Super Admin only)
router.get('/', paginationValidation, auditLogQueryValidation, auditLogController.getAllLogs);

// GET audit logs for specific entity
router.get('/entity/:entityType/:entityId', auditLogController.getEntityHistory);

// GET user activity report
router.get('/user/:userId/report', auditLogController.getUserActivityReport);

// GET system audit report
router.get('/report', auditLogController.getSystemAuditReport);

export default router;
