import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import contactRoutes from './contactRoutes.js';
import donationRoutes from './donationRoutes.js';
import allocationRoutes from './allocationRoutes.js';
import healthRoutes from './healthRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/contacts', contactRoutes);
router.use('/donations', donationRoutes);
router.use('/allocations', allocationRoutes);
router.use('/', healthRoutes);

export default router;
