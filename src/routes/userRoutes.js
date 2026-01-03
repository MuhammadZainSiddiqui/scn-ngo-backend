import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', userController.getAllUsers);
router.get('/me', userController.getCurrentUser);
router.get('/search', userController.searchUsers);
router.get('/stats', userController.getUserStats);
router.get('/role/:roleId', userController.getUsersByRole);
router.get('/vertical/:verticalId', userController.getUsersByVertical);
router.get('/roles', userController.getRoles);
router.get('/roles/:id', userController.getRoleById);
router.get('/verticals', userController.getVerticals);
router.get('/:id', userController.getUserById);

router.post('/', userController.createUser);
router.post('/roles', userController.createRole);
router.post('/seed-roles', userController.seedDefaultRoles);

router.put('/:id', userController.updateUser);
router.put('/:id/role', userController.updateUserRole);
router.put('/:id/status', userController.updateUserStatus);
router.put('/:id/password', userController.changePassword);
router.put('/roles/:id', userController.updateRole);

router.delete('/:id', userController.deleteUser);

export default router;
