import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', userController.getAllUsers);
router.get('/roles', userController.getRoles);
router.get('/verticals', userController.getVerticals);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;
