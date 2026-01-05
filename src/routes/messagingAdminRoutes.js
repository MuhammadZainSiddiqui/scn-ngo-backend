import { Router } from 'express';
import messagingAdminController from '../controllers/messagingAdminController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  sendAnnouncementValidation,
  idParamValidation,
  paginationValidation
} from '../utils/validators.js';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// System announcements
router.post('/announcements', sendAnnouncementValidation, messagingAdminController.sendAnnouncement);
router.get('/announcements', paginationValidation, messagingAdminController.getAnnouncements);
router.delete('/announcements/:id', idParamValidation, messagingAdminController.deleteAnnouncement);

// Statistics and reports
router.get('/statistics', messagingAdminController.getMessageStatistics);
router.get('/user-activity', paginationValidation, messagingAdminController.getUserActivity);
router.get('/conversation-stats', messagingAdminController.getConversationStatistics);

export default router;
