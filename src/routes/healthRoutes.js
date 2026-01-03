import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
