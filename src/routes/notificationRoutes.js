import { Router } from 'express';
import notificationController from '../controllers/notificationController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  updateNotificationPreferencesValidation,
  idParamValidation,
  paginationValidation
} from '../utils/validators.js';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// Notification preferences
router.get('/preferences', notificationController.getNotificationPreferences);
router.put('/preferences', updateNotificationPreferencesValidation, notificationController.updateNotificationPreferences);

// Statistics
router.get('/stats', notificationController.getNotificationStats);

// Notification filtering
router.get('/unread', paginationValidation, notificationController.getUnreadNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/type/:type', paginationValidation, notificationController.getNotificationsByType);

// Bulk operations
router.put('/mark-all-read', notificationController.markAllAsRead);
router.delete('/all', notificationController.deleteAllNotifications);

// CRUD operations
router.get('/', paginationValidation, notificationController.getAllNotifications);
router.get('/:id', idParamValidation, notificationController.getNotificationById);
router.put('/:id/read', idParamValidation, notificationController.markAsRead);
router.delete('/:id', idParamValidation, notificationController.deleteNotification);

export default router;
