import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

export const notificationController = {
  async getAllNotifications(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        is_read,
        priority,
        start_date,
        end_date,
        sort = 'n.created_at',
        order = 'desc'
      } = req.query;

      const result = await Notification.findAll(req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        is_read: is_read !== undefined ? is_read === 'true' : undefined,
        priority,
        start_date,
        end_date,
        sort,
        order
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Notifications retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllNotifications:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getNotificationById(req, res) {
    try {
      const notification = await Notification.findById(req.params.id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
          code: 'NOT_FOUND'
        });
      }

      // Check access - notification must belong to user
      if (notification.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this notification',
          code: 'FORBIDDEN'
        });
      }

      res.json({
        success: true,
        data: notification,
        message: 'Notification retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getNotificationById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getUnreadNotifications(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const result = await Notification.getUnread(req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Unread notifications retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getUnreadNotifications:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getUnreadCount(req, res) {
    try {
      const count = await Notification.getUnreadCount(req.user.id);

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

  async markAsRead(req, res) {
    try {
      const notification = await Notification.findById(req.params.id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
          code: 'NOT_FOUND'
        });
      }

      // Check access
      if (notification.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to modify this notification',
          code: 'FORBIDDEN'
        });
      }

      const updatedNotification = await Notification.markAsRead(req.params.id, req.user.id);

      res.json({
        success: true,
        data: updatedNotification,
        message: 'Notification marked as read'
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

  async markAllAsRead(req, res) {
    try {
      const result = await Notification.markAllAsRead(req.user.id);

      res.json({
        success: true,
        data: result,
        message: `${result.count} notification(s) marked as read`
      });
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async deleteNotification(req, res) {
    try {
      const notification = await Notification.findById(req.params.id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
          code: 'NOT_FOUND'
        });
      }

      // Check access
      if (notification.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to delete this notification',
          code: 'FORBIDDEN'
        });
      }

      await Notification.delete(req.params.id, req.user.id);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'notification',
        entity_id: notification.id,
        old_values: notification,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async deleteAllNotifications(req, res) {
    try {
      const result = await Notification.deleteAll(req.user.id);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE_ALL',
        entity_type: 'notification',
        entity_id: null,
        new_values: { deleted_count: result.count },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: result,
        message: `${result.count} notification(s) deleted`
      });
    } catch (error) {
      console.error('Error in deleteAllNotifications:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getNotificationsByType(req, res) {
    try {
      const { type } = req.params;
      const { page = 1, limit = 20 } = req.query;

      if (!['message', 'task', 'alert', 'announcement', 'assignment', 'system'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid notification type',
          code: 'BAD_REQUEST'
        });
      }

      const result = await Notification.getByType(req.user.id, type, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: `${type} notifications retrieved successfully`
      });
    } catch (error) {
      console.error('Error in getNotificationsByType:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getNotificationPreferences(req, res) {
    try {
      const preferences = await Notification.getPreferences(req.user.id);

      res.json({
        success: true,
        data: preferences,
        message: 'Notification preferences retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getNotificationPreferences:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateNotificationPreferences(req, res) {
    try {
      const {
        email_on_message,
        email_on_assignment,
        email_on_alert,
        in_app_only,
        do_not_disturb,
        dnd_start_time,
        dnd_end_time
      } = req.body;

      const preferences = {
        email_on_message,
        email_on_assignment,
        email_on_alert,
        in_app_only,
        do_not_disturb,
        dnd_start_time,
        dnd_end_time
      };

      // Remove undefined values
      Object.keys(preferences).forEach(key => 
        preferences[key] === undefined && delete preferences[key]
      );

      if (Object.keys(preferences).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one preference field is required',
          code: 'BAD_REQUEST'
        });
      }

      const updatedPreferences = await Notification.updatePreferences(req.user.id, preferences);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'notification_preferences',
        entity_id: req.user.id,
        new_values: updatedPreferences,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedPreferences,
        message: 'Notification preferences updated successfully'
      });
    } catch (error) {
      console.error('Error in updateNotificationPreferences:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getNotificationStats(req, res) {
    try {
      const stats = await Notification.getStats(req.user.id);

      res.json({
        success: true,
        data: stats,
        message: 'Notification statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getNotificationStats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
};

export default notificationController;
