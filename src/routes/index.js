import { Router } from 'express';
import { optionalAuth } from '../middleware/authMiddleware.js';
import auditMiddleware from '../middleware/auditMiddleware.js';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import contactRoutes from './contactRoutes.js';
import donationRoutes from './donationRoutes.js';
import allocationRoutes from './allocationRoutes.js';
import volunteerRoutes from './volunteerRoutes.js';
import assignmentRoutes from './assignmentRoutes.js';
import programRoutes from './programRoutes.js';
import kpiRoutes from './kpiRoutes.js';
import staffRoutes from './staffRoutes.js';
import feePlanRoutes from './feePlanRoutes.js';
import feeRoutes from './feeRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import waiverRoutes from './waiverRoutes.js';
import subsidyRoutes from './subsidyRoutes.js';
import vendorRoutes from './vendorRoutes.js';
import requisitionRoutes from './requisitionRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import safeguardingRoutes from './safeguardingRoutes.js';
import exceptionRoutes from './exceptionRoutes.js';
import auditLogRoutes from './auditLogRoutes.js';
import messageRoutes from './messageRoutes.js';
import conversationRoutes from './conversationRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import messagingAdminRoutes from './messagingAdminRoutes.js';
import healthRoutes from './healthRoutes.js';

const router = Router();

// Global API middleware
router.use(optionalAuth); // Extracts user if token is present
router.use(auditMiddleware); // Logs modify actions and sensitive views

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/contacts', contactRoutes);
router.use('/donations', donationRoutes);
router.use('/allocations', allocationRoutes);
router.use('/volunteers', volunteerRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/programs', programRoutes);
router.use('/kpis', kpiRoutes);
router.use('/staff', staffRoutes);
router.use('/fee-plans', feePlanRoutes);
router.use('/fees', feeRoutes);
router.use('/payments', paymentRoutes);
router.use('/waivers', waiverRoutes);
router.use('/subsidies', subsidyRoutes);
router.use('/vendors', vendorRoutes);
router.use('/requisitions', requisitionRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/safeguarding', safeguardingRoutes);
router.use('/exceptions', exceptionRoutes);
router.use('/messages', messageRoutes);
router.use('/conversations', conversationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/messaging-admin', messagingAdminRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/', healthRoutes);

export default router;
