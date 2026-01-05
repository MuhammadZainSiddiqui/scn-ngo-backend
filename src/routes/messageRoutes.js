import { Router } from 'express';
import messageController from '../controllers/messageController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  createMessageValidation,
  updateMessageValidation,
  idParamValidation,
  paginationValidation,
  bulkOperationValidation
} from '../utils/validators.js';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// Message search and filtering
router.get('/search', paginationValidation, messageController.searchMessages);
router.get('/inbox', paginationValidation, messageController.getInbox);
router.get('/sent', paginationValidation, messageController.getSent);
router.get('/archived', paginationValidation, messageController.getArchived);
router.get('/unread-count', messageController.getUnreadCount);

// Bulk operations
router.put('/mark-read', bulkOperationValidation, messageController.markMultipleAsRead);
router.put('/archive', bulkOperationValidation, messageController.archiveMultiple);
router.delete('/bulk', bulkOperationValidation, messageController.deleteMultiple);

// CRUD operations
router.get('/', paginationValidation, messageController.getAllMessages);
router.get('/:id', idParamValidation, messageController.getMessageById);
router.post('/', createMessageValidation, messageController.sendMessage);
router.put('/:id', idParamValidation, updateMessageValidation, messageController.updateMessage);
router.delete('/:id', idParamValidation, messageController.deleteMessage);

// Message actions
router.put('/:id/read', idParamValidation, messageController.markAsRead);
router.put('/:id/archive', idParamValidation, messageController.archiveMessage);
router.put('/:id/unarchive', idParamValidation, messageController.unarchiveMessage);

export default router;
