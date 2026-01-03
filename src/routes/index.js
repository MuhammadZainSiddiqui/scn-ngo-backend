import { Router } from 'express';
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
import healthRoutes from './healthRoutes.js';

const router = Router();

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
router.use('/', healthRoutes);

export default router;
