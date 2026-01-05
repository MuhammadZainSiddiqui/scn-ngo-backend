import { Router } from 'express';
import conversationController from '../controllers/conversationController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  createConversationValidation,
  updateConversationValidation,
  sendConversationMessageValidation,
  idParamValidation,
  paginationValidation
} from '../utils/validators.js';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// Conversation search and filtering
router.get('/search', paginationValidation, conversationController.searchConversations);
router.get('/my-conversations', paginationValidation, conversationController.getMyConversations);
router.get('/archived', paginationValidation, conversationController.getArchivedConversations);

// CRUD operations
router.get('/', paginationValidation, conversationController.getAllConversations);
router.get('/:id', idParamValidation, conversationController.getConversationById);
router.post('/', createConversationValidation, conversationController.createConversation);
router.put('/:id', idParamValidation, updateConversationValidation, conversationController.updateConversation);
router.delete('/:id', idParamValidation, conversationController.deleteConversation);

// Conversation messages
router.get('/:id/messages', idParamValidation, paginationValidation, conversationController.getConversationMessages);
router.post('/:id/messages', idParamValidation, sendConversationMessageValidation, conversationController.sendConversationMessage);
router.put('/:id/messages/:msgId', conversationController.updateConversationMessage);
router.delete('/:id/messages/:msgId', conversationController.deleteConversationMessage);
router.put('/:id/messages/:msgId/pin', conversationController.pinMessage);
router.put('/:id/messages/:msgId/unpin', conversationController.unpinMessage);

// Conversation members
router.get('/:id/members', idParamValidation, paginationValidation, conversationController.getConversationMembers);
router.post('/:id/members', idParamValidation, conversationController.addMember);
router.delete('/:id/members/:userId', conversationController.removeMember);
router.put('/:id/members/:userId/role', conversationController.updateMemberRole);
router.put('/:id/members/:userId/notifications', conversationController.updateNotificationPreference);

export default router;
