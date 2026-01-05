import Conversation from '../models/Conversation.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

export const conversationController = {
  async getAllConversations(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        vertical_id,
        conversation_type,
        search,
        sort = 'c.updated_at',
        order = 'desc'
      } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access conversations from another vertical',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const result = await Conversation.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        user_id: req.user.id,
        vertical_id: finalVerticalId,
        conversation_type,
        search,
        sort,
        order
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Conversations retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllConversations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getConversationById(req, res) {
    try {
      const conversation = await Conversation.findById(req.params.id);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
          code: 'NOT_FOUND'
        });
      }

      // Check if user is a member
      const isMember = await Conversation.isMember(req.params.id, req.user.id);
      if (!isMember && req.user.roleId !== 1) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this conversation',
          code: 'FORBIDDEN'
        });
      }

      // Get members
      const members = await Conversation.getMembers(req.params.id, { page: 1, limit: 100 });
      conversation.members = members.data;

      res.json({
        success: true,
        data: conversation,
        message: 'Conversation retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getConversationById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async createConversation(req, res) {
    try {
      const {
        name,
        description,
        conversation_type = 'group',
        vertical_id,
        member_ids = []
      } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Conversation name is required',
          code: 'BAD_REQUEST'
        });
      }

      // Only Super Admin or Vertical Lead can create group conversations
      if (req.user.roleId !== 1 && req.user.roleId !== 2) {
        return res.status(403).json({
          success: false,
          error: 'Only administrators and vertical leads can create group conversations',
          code: 'FORBIDDEN'
        });
      }

      // Apply vertical isolation
      const finalVerticalId = req.user.roleId === 1 ? vertical_id : req.user.verticalId;

      const conversationData = {
        name,
        description,
        conversation_type,
        vertical_id: finalVerticalId,
        created_by: req.user.id,
        member_ids
      };

      const newConversation = await Conversation.create(conversationData);

      // Send notifications to all members
      if (member_ids && member_ids.length > 0) {
        const memberIds = member_ids.filter(id => id !== req.user.id);
        if (memberIds.length > 0) {
          await Notification.sendBulkNotifications(
            memberIds,
            'system',
            'Added to Conversation',
            `You have been added to the conversation "${name}"`,
            { conversation_id: newConversation.id },
            `/conversations/${newConversation.id}`,
            'medium'
          );
        }
      }

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'conversation',
        entity_id: newConversation.id,
        new_values: newConversation,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: newConversation,
        message: 'Conversation created successfully'
      });
    } catch (error) {
      console.error('Error in createConversation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateConversation(req, res) {
    try {
      const conversation = await Conversation.findById(req.params.id);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
          code: 'NOT_FOUND'
        });
      }

      // Check permissions - must be creator or admin/moderator
      const memberRole = await Conversation.getMemberRole(req.params.id, req.user.id);
      if (!memberRole || (memberRole === 'member' && conversation.created_by !== req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to update this conversation',
          code: 'FORBIDDEN'
        });
      }

      const updatedConversation = await Conversation.update(req.params.id, req.body);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'conversation',
        entity_id: updatedConversation.id,
        old_values: conversation,
        new_values: updatedConversation,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedConversation,
        message: 'Conversation updated successfully'
      });
    } catch (error) {
      console.error('Error in updateConversation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async deleteConversation(req, res) {
    try {
      const conversation = await Conversation.findById(req.params.id);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
          code: 'NOT_FOUND'
        });
      }

      // Only creator or Super Admin can delete
      if (conversation.created_by !== req.user.id && req.user.roleId !== 1) {
        return res.status(403).json({
          success: false,
          error: 'Only the creator or administrator can delete this conversation',
          code: 'FORBIDDEN'
        });
      }

      await Conversation.delete(req.params.id);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'conversation',
        entity_id: conversation.id,
        old_values: conversation,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Conversation archived successfully'
      });
    } catch (error) {
      console.error('Error in deleteConversation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getConversationMessages(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        since_id,
        before_id
      } = req.query;

      // Check if user is a member
      const isMember = await Conversation.isMember(req.params.id, req.user.id);
      if (!isMember && req.user.roleId !== 1) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this conversation',
          code: 'FORBIDDEN'
        });
      }

      const result = await Conversation.getMessages(req.params.id, {
        page: parseInt(page),
        limit: parseInt(limit),
        since_id: since_id ? parseInt(since_id) : null,
        before_id: before_id ? parseInt(before_id) : null
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Messages retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getConversationMessages:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async sendConversationMessage(req, res) {
    try {
      const { body } = req.body;

      if (!body) {
        return res.status(400).json({
          success: false,
          error: 'Message body is required',
          code: 'BAD_REQUEST'
        });
      }

      // Check if user is a member
      const isMember = await Conversation.isMember(req.params.id, req.user.id);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'You must be a member to send messages to this conversation',
          code: 'FORBIDDEN'
        });
      }

      const newMessage = await Conversation.addMessage(
        req.params.id,
        req.user.id,
        body,
        'message'
      );

      // Get conversation details for notifications
      const conversation = await Conversation.findById(req.params.id);
      
      // Get all members except sender
      const members = await Conversation.getMembers(req.params.id, { page: 1, limit: 1000 });
      const memberIds = members.data
        .filter(m => m.user_id !== req.user.id && m.notification_preference !== 'none')
        .map(m => m.user_id);

      // Send notifications to members
      if (memberIds.length > 0) {
        await Notification.sendBulkNotifications(
          memberIds,
          'message',
          `New message in ${conversation.name}`,
          `${req.user.firstName} ${req.user.lastName}: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`,
          { conversation_id: req.params.id, message_id: newMessage.id },
          `/conversations/${req.params.id}`,
          'medium'
        );
      }

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'conversation_message',
        entity_id: newMessage.id,
        new_values: newMessage,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: newMessage,
        message: 'Message sent successfully'
      });
    } catch (error) {
      console.error('Error in sendConversationMessage:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateConversationMessage(req, res) {
    try {
      const { body } = req.body;

      if (!body) {
        return res.status(400).json({
          success: false,
          error: 'Message body is required',
          code: 'BAD_REQUEST'
        });
      }

      const message = await Conversation.getMessageById(req.params.msgId);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'NOT_FOUND'
        });
      }

      // Only sender can edit
      if (message.sender_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Only the sender can edit this message',
          code: 'FORBIDDEN'
        });
      }

      // Check if message is within 1 hour edit window
      const createdAt = new Date(message.created_at);
      const now = new Date();
      const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);

      if (hoursSinceCreation > 1) {
        return res.status(400).json({
          success: false,
          error: 'Messages can only be edited within 1 hour of creation',
          code: 'EDIT_WINDOW_EXPIRED'
        });
      }

      const updatedMessage = await Conversation.updateMessage(req.params.msgId, body, req.user.id);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'conversation_message',
        entity_id: updatedMessage.id,
        old_values: message,
        new_values: updatedMessage,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedMessage,
        message: 'Message updated successfully'
      });
    } catch (error) {
      console.error('Error in updateConversationMessage:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async deleteConversationMessage(req, res) {
    try {
      const message = await Conversation.getMessageById(req.params.msgId);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'NOT_FOUND'
        });
      }

      // Only sender or admin/moderator can delete
      const memberRole = await Conversation.getMemberRole(req.params.id, req.user.id);
      if (message.sender_id !== req.user.id && !['admin', 'moderator'].includes(memberRole)) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to delete this message',
          code: 'FORBIDDEN'
        });
      }

      await Conversation.deleteMessage(req.params.msgId, req.user.id);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'conversation_message',
        entity_id: message.id,
        old_values: message,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteConversationMessage:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async pinMessage(req, res) {
    try {
      const message = await Conversation.getMessageById(req.params.msgId);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'NOT_FOUND'
        });
      }

      // Only admin/moderator can pin
      const memberRole = await Conversation.getMemberRole(req.params.id, req.user.id);
      if (!['admin', 'moderator'].includes(memberRole)) {
        return res.status(403).json({
          success: false,
          error: 'Only administrators and moderators can pin messages',
          code: 'FORBIDDEN'
        });
      }

      const updatedMessage = await Conversation.pinMessage(req.params.msgId);

      res.json({
        success: true,
        data: updatedMessage,
        message: 'Message pinned successfully'
      });
    } catch (error) {
      console.error('Error in pinMessage:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async unpinMessage(req, res) {
    try {
      const message = await Conversation.getMessageById(req.params.msgId);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'NOT_FOUND'
        });
      }

      // Only admin/moderator can unpin
      const memberRole = await Conversation.getMemberRole(req.params.id, req.user.id);
      if (!['admin', 'moderator'].includes(memberRole)) {
        return res.status(403).json({
          success: false,
          error: 'Only administrators and moderators can unpin messages',
          code: 'FORBIDDEN'
        });
      }

      const updatedMessage = await Conversation.unpinMessage(req.params.msgId);

      res.json({
        success: true,
        data: updatedMessage,
        message: 'Message unpinned successfully'
      });
    } catch (error) {
      console.error('Error in unpinMessage:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getConversationMembers(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;

      // Check if user is a member
      const isMember = await Conversation.isMember(req.params.id, req.user.id);
      if (!isMember && req.user.roleId !== 1) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this conversation',
          code: 'FORBIDDEN'
        });
      }

      const result = await Conversation.getMembers(req.params.id, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Members retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getConversationMembers:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async addMember(req, res) {
    try {
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required',
          code: 'BAD_REQUEST'
        });
      }

      // Only admin/moderator can add members
      const memberRole = await Conversation.getMemberRole(req.params.id, req.user.id);
      if (!['admin', 'moderator'].includes(memberRole) && req.user.roleId !== 1) {
        return res.status(403).json({
          success: false,
          error: 'Only administrators and moderators can add members',
          code: 'FORBIDDEN'
        });
      }

      await Conversation.addMember(req.params.id, user_id, 'member');

      // Get conversation details
      const conversation = await Conversation.findById(req.params.id);

      // Send notification to new member
      await Notification.sendNotification(
        user_id,
        'system',
        'Added to Conversation',
        `You have been added to the conversation "${conversation.name}"`,
        { conversation_id: req.params.id },
        `/conversations/${req.params.id}`,
        'medium'
      );

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'ADD_MEMBER',
        entity_type: 'conversation',
        entity_id: parseInt(req.params.id),
        new_values: { added_user_id: user_id },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Member added successfully'
      });
    } catch (error) {
      console.error('Error in addMember:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async removeMember(req, res) {
    try {
      const userId = parseInt(req.params.userId);

      // Only admin/moderator can remove members (or user can remove themselves)
      const memberRole = await Conversation.getMemberRole(req.params.id, req.user.id);
      if (!['admin', 'moderator'].includes(memberRole) && userId !== req.user.id && req.user.roleId !== 1) {
        return res.status(403).json({
          success: false,
          error: 'Only administrators and moderators can remove members',
          code: 'FORBIDDEN'
        });
      }

      await Conversation.removeMember(req.params.id, userId);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'REMOVE_MEMBER',
        entity_type: 'conversation',
        entity_id: parseInt(req.params.id),
        old_values: { removed_user_id: userId },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Member removed successfully'
      });
    } catch (error) {
      console.error('Error in removeMember:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateMemberRole(req, res) {
    try {
      const { role } = req.body;
      const userId = parseInt(req.params.userId);

      if (!role || !['member', 'moderator', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Valid role is required (member, moderator, admin)',
          code: 'BAD_REQUEST'
        });
      }

      // Only admin can change roles
      const memberRole = await Conversation.getMemberRole(req.params.id, req.user.id);
      if (memberRole !== 'admin' && req.user.roleId !== 1) {
        return res.status(403).json({
          success: false,
          error: 'Only administrators can change member roles',
          code: 'FORBIDDEN'
        });
      }

      await Conversation.updateMemberRole(req.params.id, userId, role);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE_MEMBER_ROLE',
        entity_type: 'conversation',
        entity_id: parseInt(req.params.id),
        new_values: { user_id: userId, new_role: role },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Member role updated successfully'
      });
    } catch (error) {
      console.error('Error in updateMemberRole:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateNotificationPreference(req, res) {
    try {
      const { preference } = req.body;
      const userId = parseInt(req.params.userId);

      if (!preference || !['all', 'mention_only', 'none'].includes(preference)) {
        return res.status(400).json({
          success: false,
          error: 'Valid preference is required (all, mention_only, none)',
          code: 'BAD_REQUEST'
        });
      }

      // Users can only update their own preference
      if (userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You can only update your own notification preference',
          code: 'FORBIDDEN'
        });
      }

      await Conversation.updateNotificationPreference(req.params.id, userId, preference);

      res.json({
        success: true,
        message: 'Notification preference updated successfully'
      });
    } catch (error) {
      console.error('Error in updateNotificationPreference:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async searchConversations(req, res) {
    try {
      const { q: searchTerm, page = 1, limit = 10 } = req.query;

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          error: 'Search term is required',
          code: 'BAD_REQUEST'
        });
      }

      const result = await Conversation.search(searchTerm, req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Search completed successfully'
      });
    } catch (error) {
      console.error('Error in searchConversations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getMyConversations(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const result = await Conversation.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        user_id: req.user.id,
        sort: 'c.updated_at',
        order: 'desc'
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Your conversations retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getMyConversations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getArchivedConversations(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const result = await Conversation.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        user_id: req.user.id,
        is_archived: true,
        sort: 'c.updated_at',
        order: 'desc'
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Archived conversations retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getArchivedConversations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
};

export default conversationController;
