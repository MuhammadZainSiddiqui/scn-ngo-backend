import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

export const messageController = {
  async getAllMessages(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        sender_id,
        receiver_id,
        is_read,
        start_date,
        end_date,
        search,
        sort = 'm.created_at',
        order = 'desc',
        message_type,
        priority
      } = req.query;

      const result = await Message.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        sender_id,
        receiver_id,
        is_read: is_read !== undefined ? is_read === 'true' : undefined,
        start_date,
        end_date,
        search,
        sort,
        order,
        message_type,
        priority,
        user_id: req.user.id
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Messages retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllMessages:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getMessageById(req, res) {
    try {
      const message = await Message.findById(req.params.id);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'NOT_FOUND'
        });
      }

      // Check access - user must be sender or receiver
      if (message.sender_id !== req.user.id && message.receiver_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this message',
          code: 'FORBIDDEN'
        });
      }

      // Check if message is deleted by user
      const isSender = message.sender_id === req.user.id;
      const isDeleted = isSender ? message.deleted_by_sender : message.deleted_by_receiver;

      if (isDeleted) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: message,
        message: 'Message retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getMessageById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async sendMessage(req, res) {
    try {
      const {
        receiver_id,
        subject,
        body,
        priority = 'medium',
        vertical_id
      } = req.body;

      // Validate required fields
      if (!receiver_id || !body) {
        return res.status(400).json({
          success: false,
          error: 'Receiver ID and message body are required',
          code: 'BAD_REQUEST'
        });
      }

      // Cannot send message to self
      if (receiver_id === req.user.id) {
        return res.status(400).json({
          success: false,
          error: 'Cannot send message to yourself',
          code: 'BAD_REQUEST'
        });
      }

      const messageData = {
        sender_id: req.user.id,
        receiver_id,
        subject,
        body,
        message_type: 'direct',
        priority,
        vertical_id: vertical_id || req.user.verticalId
      };

      const newMessage = await Message.create(messageData);

      // Add history record
      await Message.addHistory(
        newMessage.id,
        'create',
        req.user.id,
        null,
        { receiver_id, subject, body }
      );

      // Send notification to receiver
      await Notification.sendNotification(
        receiver_id,
        'message',
        'New Message',
        `You have a new message from ${req.user.firstName} ${req.user.lastName}`,
        { message_id: newMessage.id, sender_name: `${req.user.firstName} ${req.user.lastName}` },
        `/messages/${newMessage.id}`,
        priority
      );

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'message',
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
      console.error('Error in sendMessage:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateMessage(req, res) {
    try {
      const message = await Message.findById(req.params.id);

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

      const updatedMessage = await Message.update(req.params.id, req.body, req.user.id);

      // Add history record
      await Message.addHistory(
        updatedMessage.id,
        'edit',
        req.user.id,
        { body: message.body, subject: message.subject },
        { body: req.body.body, subject: req.body.subject }
      );

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'message',
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
      console.error('Error in updateMessage:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async deleteMessage(req, res) {
    try {
      const message = await Message.findById(req.params.id);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'NOT_FOUND'
        });
      }

      // Check if user is sender or receiver
      const isSender = message.sender_id === req.user.id;
      const isReceiver = message.receiver_id === req.user.id;

      if (!isSender && !isReceiver) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to delete this message',
          code: 'FORBIDDEN'
        });
      }

      await Message.softDelete(req.params.id, req.user.id, isSender);

      // Add history record
      await Message.addHistory(
        message.id,
        'delete',
        req.user.id,
        null,
        { deleted_by: isSender ? 'sender' : 'receiver' }
      );

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'message',
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
      console.error('Error in deleteMessage:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async markAsRead(req, res) {
    try {
      const message = await Message.findById(req.params.id);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'NOT_FOUND'
        });
      }

      // Only receiver can mark as read
      if (message.receiver_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Only the receiver can mark this message as read',
          code: 'FORBIDDEN'
        });
      }

      const updatedMessage = await Message.markAsRead(req.params.id);

      // Add history record
      await Message.addHistory(
        updatedMessage.id,
        'read',
        req.user.id,
        { is_read: false },
        { is_read: true }
      );

      res.json({
        success: true,
        data: updatedMessage,
        message: 'Message marked as read'
      });
    } catch (error) {
      console.error('Error in markAsRead:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async archiveMessage(req, res) {
    try {
      const message = await Message.findById(req.params.id);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'NOT_FOUND'
        });
      }

      const isSender = message.sender_id === req.user.id;
      const isReceiver = message.receiver_id === req.user.id;

      if (!isSender && !isReceiver) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to archive this message',
          code: 'FORBIDDEN'
        });
      }

      const updatedMessage = await Message.archive(req.params.id, req.user.id, isSender);

      // Add history record
      await Message.addHistory(
        updatedMessage.id,
        'archive',
        req.user.id,
        null,
        { archived_by: isSender ? 'sender' : 'receiver' }
      );

      res.json({
        success: true,
        data: updatedMessage,
        message: 'Message archived successfully'
      });
    } catch (error) {
      console.error('Error in archiveMessage:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async unarchiveMessage(req, res) {
    try {
      const message = await Message.findById(req.params.id);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'NOT_FOUND'
        });
      }

      const isSender = message.sender_id === req.user.id;
      const isReceiver = message.receiver_id === req.user.id;

      if (!isSender && !isReceiver) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to unarchive this message',
          code: 'FORBIDDEN'
        });
      }

      const updatedMessage = await Message.unarchive(req.params.id, req.user.id, isSender);

      res.json({
        success: true,
        data: updatedMessage,
        message: 'Message unarchived successfully'
      });
    } catch (error) {
      console.error('Error in unarchiveMessage:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async searchMessages(req, res) {
    try {
      const { q: searchTerm, page = 1, limit = 10 } = req.query;

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          error: 'Search term is required',
          code: 'BAD_REQUEST'
        });
      }

      const result = await Message.search(searchTerm, req.user.id, {
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
      console.error('Error in searchMessages:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getInbox(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const result = await Message.getInbox(req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Inbox retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getInbox:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getSent(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const result = await Message.getSent(req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Sent messages retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getSent:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getArchived(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const result = await Message.getArchived(req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Archived messages retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getArchived:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getUnreadCount(req, res) {
    try {
      const count = await Message.getUnreadCount(req.user.id);

      res.json({
        success: true,
        data: { unread_count: count },
        message: 'Unread count retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async markMultipleAsRead(req, res) {
    try {
      const { message_ids } = req.body;

      if (!message_ids || !Array.isArray(message_ids) || message_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'message_ids array is required',
          code: 'BAD_REQUEST'
        });
      }

      const result = await Message.markMultipleAsRead(message_ids, req.user.id);

      res.json({
        success: true,
        data: result,
        message: `${result.count} message(s) marked as read`
      });
    } catch (error) {
      console.error('Error in markMultipleAsRead:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async deleteMultiple(req, res) {
    try {
      const { message_ids } = req.body;

      if (!message_ids || !Array.isArray(message_ids) || message_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'message_ids array is required',
          code: 'BAD_REQUEST'
        });
      }

      // Determine if user is sender or receiver for each message
      // For simplicity, we'll check the first message to determine the role
      const firstMessage = await Message.findById(message_ids[0]);
      if (!firstMessage) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'NOT_FOUND'
        });
      }

      const isSender = firstMessage.sender_id === req.user.id;
      const result = await Message.deleteMultiple(message_ids, req.user.id, isSender);

      res.json({
        success: true,
        data: result,
        message: `${result.count} message(s) deleted`
      });
    } catch (error) {
      console.error('Error in deleteMultiple:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async archiveMultiple(req, res) {
    try {
      const { message_ids } = req.body;

      if (!message_ids || !Array.isArray(message_ids) || message_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'message_ids array is required',
          code: 'BAD_REQUEST'
        });
      }

      // Check first message to determine role
      const firstMessage = await Message.findById(message_ids[0]);
      if (!firstMessage) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'NOT_FOUND'
        });
      }

      const isSender = firstMessage.sender_id === req.user.id;
      const result = await Message.archiveMultiple(message_ids, req.user.id, isSender);

      res.json({
        success: true,
        data: result,
        message: `${result.count} message(s) archived`
      });
    } catch (error) {
      console.error('Error in archiveMultiple:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
};

export default messageController;
