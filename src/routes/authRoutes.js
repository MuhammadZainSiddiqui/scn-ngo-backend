import { Router } from 'express';
import { authController } from '../controllers/authController.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/verify', authController.verifyToken);

router.get('/profile', authController.getProfile);

export default router;
