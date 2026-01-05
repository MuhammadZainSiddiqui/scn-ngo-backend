import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import { executeQuery } from '../config/database.js';

export const messagingAdminController = {
  async sendAnnouncement(req, res) {
    try {
      const {
        title,
        body,
        vertical_id,
        priority = 'high',
        recipient_role_id
      } = req.body;

      // Only Super Admin can send system announcements
      if (req.user.roleId !== 1) {
        return res.status(403).json({
          success: false,
          error: 'Only Super Admin can send system announcements',
          code: 'FORBIDDEN'
        });
      }

      if (!title || !body) {
        return res.status(400).json({
          success: false,
          error: 'Title and body are required',
          code: 'BAD_REQUEST'
        });
      }

      // Get target users
      let whereClause = 'status = "active"';
      const queryParams = [];

      if (vertical_id) {
        whereClause += ' AND vertical_id = ?';
        queryParams.push(vertical_id);
      }

      if (recipient_role_id) {
        whereClause += ' AND role_id = ?';
        queryParams.push(recipient_role_id);
      }

      const usersQuery = `
        SELECT id 
        FROM users 
        WHERE ${whereClause}
      `;

      const users = await executeQuery(usersQuery, queryParams);

      if (users.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No users found matching the criteria',
          code: 'NO_RECIPIENTS'
        });
      }

      const userIds = users.map(u => u.id);

      // Send notifications to all target users
      await Notification.sendBulkNotifications(
        userIds,
        'announcement',
        title,
        body,
        {
          sent_by: req.user.id,
          sent_by_name: `${req.user.firstName} ${req.user.lastName}`,
          vertical_id
        },
        null,
        priority
      );

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'SEND_ANNOUNCEMENT',
        entity_type: 'announcement',
        entity_id: null,
        new_values: {
          title,
          body,
          vertical_id,
          priority,
          recipient_count: userIds.length
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: {
          title,
          body,
          recipient_count: userIds.length
        },
        message: 'Announcement sent successfully'
      });
    } catch (error) {
      console.error('Error in sendAnnouncement:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getAnnouncements(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const result = await Notification.findAll(req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit),
        type: 'announcement',
        sort: 'n.created_at',
        order: 'desc'
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Announcements retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAnnouncements:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async deleteAnnouncement(req, res) {
    try {
      // Only Super Admin can delete announcements
      if (req.user.roleId !== 1) {
        return res.status(403).json({
          success: false,
          error: 'Only Super Admin can delete announcements',
          code: 'FORBIDDEN'
        });
      }

      const notification = await Notification.findById(req.params.id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Announcement not found',
          code: 'NOT_FOUND'
        });
      }

      if (notification.type !== 'announcement') {
        return res.status(400).json({
          success: false,
          error: 'This notification is not an announcement',
          code: 'BAD_REQUEST'
        });
      }

      // Delete for all users (this would need a bulk delete in production)
      await Notification.delete(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Announcement deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteAnnouncement:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getMessageStatistics(req, res) {
    try {
      const { vertical_id, start_date, end_date } = req.query;

      // Only Super Admin and Vertical Leads can access statistics
      if (req.user.roleId !== 1 && req.user.roleId !== 2) {
        return res.status(403).json({
          success: false,
          error: 'Only administrators and vertical leads can access message statistics',
          code: 'FORBIDDEN'
        });
      }

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId === 2) {
        finalVerticalId = req.user.verticalId;
      }

      const messageStats = await Message.getStats({
        vertical_id: finalVerticalId
      });

      const conversationStats = await Conversation.getStats({
        vertical_id: finalVerticalId
      });

      // Active users (users who sent/received messages in last 7 days)
      let whereClause = 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      const queryParams = [];

      if (finalVerticalId) {
        whereClause += ' AND vertical_id = ?';
        queryParams.push(finalVerticalId);
      }

      const activeUsersQuery = `
        SELECT COUNT(DISTINCT sender_id) + COUNT(DISTINCT receiver_id) as active_users
        FROM messages
        WHERE ${whereClause}
      `;
      const activeUsersResult = await executeQuery(activeUsersQuery, queryParams);
      const activeUsers = activeUsersResult[0].active_users;

      // Average response time (time between message sent and reply)
      const avgResponseQuery = `
        SELECT AVG(TIMESTAMPDIFF(MINUTE, m1.created_at, m2.created_at)) as avg_response_minutes
        FROM messages m1
        INNER JOIN messages m2 ON m1.receiver_id = m2.sender_id AND m1.sender_id = m2.receiver_id
        WHERE m2.created_at > m1.created_at 
          AND m2.created_at <= DATE_ADD(m1.created_at, INTERVAL 1 DAY)
          ${finalVerticalId ? 'AND m1.vertical_id = ?' : ''}
        LIMIT 1000
      `;
      const avgResponseParams = finalVerticalId ? [finalVerticalId] : [];
      const avgResponseResult = await executeQuery(avgResponseQuery, avgResponseParams);
      const avgResponseMinutes = avgResponseResult[0]?.avg_response_minutes || 0;

      res.json({
        success: true,
        data: {
          messages: messageStats,
          conversations: conversationStats,
          active_users: activeUsers,
          avg_response_time_minutes: Math.round(avgResponseMinutes)
        },
        message: 'Statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getMessageStatistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getUserActivity(req, res) {
    try {
      const { user_id, start_date, end_date, page = 1, limit = 10 } = req.query;

      // Only Super Admin and Vertical Leads can access user activity
      if (req.user.roleId !== 1 && req.user.roleId !== 2) {
        return res.status(403).json({
          success: false,
          error: 'Only administrators and vertical leads can access user activity',
          code: 'FORBIDDEN'
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let whereClause = '1=1';
      const queryParams = [];

      if (user_id) {
        whereClause += ' AND (u.id = ?)';
        queryParams.push(user_id);
      }

      if (start_date) {
        whereClause += ' AND DATE(last_message_at) >= ?';
        queryParams.push(start_date);
      }

      if (end_date) {
        whereClause += ' AND DATE(last_message_at) <= ?';
        queryParams.push(end_date);
      }

      // Apply vertical isolation for Vertical Leads
      if (req.user.roleId === 2) {
        whereClause += ' AND u.vertical_id = ?';
        queryParams.push(req.user.verticalId);
      }

      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        WHERE ${whereClause}
      `;
      const countResult = await executeQuery(countQuery, queryParams);
      const total = countResult[0].total;

      const query = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          v.name as vertical_name,
          (SELECT COUNT(*) FROM messages WHERE sender_id = u.id) as messages_sent,
          (SELECT COUNT(*) FROM messages WHERE receiver_id = u.id) as messages_received,
          (SELECT MAX(created_at) FROM messages WHERE sender_id = u.id OR receiver_id = u.id) as last_message_at,
          (SELECT COUNT(*) FROM conversation_members cm WHERE cm.user_id = u.id AND cm.left_at IS NULL) as conversations_count
        FROM users u
        LEFT JOIN verticals v ON u.vertical_id = v.id
        WHERE ${whereClause}
        ORDER BY last_message_at DESC
        LIMIT ? OFFSET ?
      `;

      queryParams.push(parseInt(limit), offset);
      const results = await executeQuery(query, queryParams);

      res.json({
        success: true,
        data: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        },
        message: 'User activity retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getUserActivity:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getConversationStatistics(req, res) {
    try {
      const { vertical_id } = req.query;

      // Only Super Admin and Vertical Leads can access statistics
      if (req.user.roleId !== 1 && req.user.roleId !== 2) {
        return res.status(403).json({
          success: false,
          error: 'Only administrators and vertical leads can access conversation statistics',
          code: 'FORBIDDEN'
        });
      }

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId === 2) {
        finalVerticalId = req.user.verticalId;
      }

      const stats = await Conversation.getStats({
        vertical_id: finalVerticalId
      });

      // Most active conversations (by message count)
      let whereClause = 'c.is_archived = FALSE';
      const queryParams = [];

      if (finalVerticalId) {
        whereClause += ' AND c.vertical_id = ?';
        queryParams.push(finalVerticalId);
      }

      const activeConversationsQuery = `
        SELECT 
          c.id,
          c.name,
          c.conversation_type,
          COUNT(cm.id) as message_count,
          (SELECT COUNT(*) FROM conversation_members cmem WHERE cmem.conversation_id = c.id AND cmem.left_at IS NULL) as members_count,
          MAX(cm.created_at) as last_message_at
        FROM conversations c
        LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id AND cm.is_deleted = FALSE
        WHERE ${whereClause}
        GROUP BY c.id, c.name, c.conversation_type
        ORDER BY message_count DESC
        LIMIT 10
      `;
      const activeConversations = await executeQuery(activeConversationsQuery, queryParams);

      res.json({
        success: true,
        data: {
          overview: stats,
          most_active_conversations: activeConversations
        },
        message: 'Conversation statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getConversationStatistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
};

export default messagingAdminController;
