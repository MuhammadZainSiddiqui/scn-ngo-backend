import { executeQuery } from '../config/database.js';

export const Notification = {
  async findAll(user_id, options = {}) {
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
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['n.user_id = ?'];
    let queryParams = [user_id];

    // Type filter
    if (type) {
      whereConditions.push('n.type = ?');
      queryParams.push(type);
    }

    // Read status filter
    if (is_read !== undefined) {
      whereConditions.push('n.is_read = ?');
      queryParams.push(is_read ? 1 : 0);
    }

    // Priority filter
    if (priority) {
      whereConditions.push('n.priority = ?');
      queryParams.push(priority);
    }

    // Date range filter
    if (start_date) {
      whereConditions.push('DATE(n.created_at) >= ?');
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push('DATE(n.created_at) <= ?');
      queryParams.push(end_date);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications n
      WHERE ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    // Main query
    const query = `
      SELECT 
        n.*
      FROM notifications n
      WHERE ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);
    const results = await executeQuery(query, queryParams);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async findById(id) {
    const query = `
      SELECT n.*
      FROM notifications n
      WHERE n.id = ?
    `;

    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async create(notificationData) {
    const {
      user_id,
      type,
      title,
      message,
      data = null,
      action_url = null,
      priority = 'medium'
    } = notificationData;

    const query = `
      INSERT INTO notifications (user_id, type, title, message, data, action_url, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      user_id,
      type,
      title,
      message,
      data ? JSON.stringify(data) : null,
      action_url,
      priority
    ];

    const result = await executeQuery(query, params);
    return this.findById(result.insertId);
  },

  async createBulk(notifications) {
    if (!notifications || notifications.length === 0) {
      return { success: true, count: 0 };
    }

    const values = notifications.map(n => 
      `(${n.user_id}, '${n.type}', '${n.title}', '${n.message}', ${n.data ? `'${JSON.stringify(n.data)}'` : 'NULL'}, ${n.action_url ? `'${n.action_url}'` : 'NULL'}, '${n.priority || 'medium'}')`
    ).join(',');

    const query = `
      INSERT INTO notifications (user_id, type, title, message, data, action_url, priority)
      VALUES ${values}
    `;

    const result = await executeQuery(query);
    return { success: true, count: result.affectedRows };
  },

  async markAsRead(id, user_id) {
    const query = `
      UPDATE notifications 
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;

    await executeQuery(query, [id, user_id]);
    return this.findById(id);
  },

  async markAllAsRead(user_id) {
    const query = `
      UPDATE notifications 
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND is_read = FALSE
    `;

    const result = await executeQuery(query, [user_id]);
    return { success: true, count: result.affectedRows };
  },

  async delete(id, user_id) {
    const notification = await this.findById(id);
    if (!notification || notification.user_id !== user_id) {
      throw new Error('Notification not found or access denied');
    }

    const query = 'DELETE FROM notifications WHERE id = ?';
    await executeQuery(query, [id]);
    return { success: true };
  },

  async deleteAll(user_id) {
    const query = 'DELETE FROM notifications WHERE user_id = ?';
    const result = await executeQuery(query, [user_id]);
    return { success: true, count: result.affectedRows };
  },

  async getUnreadCount(user_id) {
    const query = `
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = ? AND is_read = FALSE
    `;

    const result = await executeQuery(query, [user_id]);
    return result[0].unread_count;
  },

  async getUnread(user_id, options = {}) {
    const { page = 1, limit = 20 } = options;
    return this.findAll(user_id, {
      page,
      limit,
      is_read: false,
      sort: 'n.created_at',
      order: 'desc'
    });
  },

  async getByType(user_id, type, options = {}) {
    const { page = 1, limit = 20 } = options;
    return this.findAll(user_id, {
      page,
      limit,
      type,
      sort: 'n.created_at',
      order: 'desc'
    });
  },

  async getPreferences(user_id) {
    const query = `
      SELECT *
      FROM notification_preferences
      WHERE user_id = ?
    `;

    const results = await executeQuery(query, [user_id]);
    
    // If no preferences exist, create default ones
    if (results.length === 0) {
      await this.createDefaultPreferences(user_id);
      return this.getPreferences(user_id);
    }

    return results[0];
  },

  async createDefaultPreferences(user_id) {
    const query = `
      INSERT INTO notification_preferences (user_id, email_on_message, email_on_assignment, email_on_alert, in_app_only, do_not_disturb)
      VALUES (?, TRUE, TRUE, TRUE, FALSE, FALSE)
    `;

    await executeQuery(query, [user_id]);
    return { success: true };
  },

  async updatePreferences(user_id, preferences) {
    const allowedFields = [
      'email_on_message',
      'email_on_assignment',
      'email_on_alert',
      'in_app_only',
      'do_not_disturb',
      'dnd_start_time',
      'dnd_end_time'
    ];

    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (preferences[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(preferences[field]);
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    params.push(user_id);

    const query = `
      UPDATE notification_preferences 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `;

    await executeQuery(query, params);
    return this.getPreferences(user_id);
  },

  async getStats(user_id) {
    // Total notifications
    const totalQuery = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    const totalResult = await executeQuery(totalQuery, [user_id]);
    const total = totalResult[0].total;

    // Unread notifications
    const unreadQuery = 'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = FALSE';
    const unreadResult = await executeQuery(unreadQuery, [user_id]);
    const unread = unreadResult[0].unread;

    // By type
    const typeQuery = `
      SELECT type, COUNT(*) as count
      FROM notifications
      WHERE user_id = ?
      GROUP BY type
    `;
    const byType = await executeQuery(typeQuery, [user_id]);

    // By priority
    const priorityQuery = `
      SELECT priority, COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND is_read = FALSE
      GROUP BY priority
    `;
    const byPriority = await executeQuery(priorityQuery, [user_id]);

    // Recent (last 24 hours)
    const recentQuery = `
      SELECT COUNT(*) as recent
      FROM notifications
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `;
    const recentResult = await executeQuery(recentQuery, [user_id]);
    const recent = recentResult[0].recent;

    return {
      total_notifications: total,
      unread_notifications: unread,
      by_type: byType,
      by_priority: byPriority,
      recent_24h: recent
    };
  },

  // Helper method to send notification (can be called from other controllers)
  async sendNotification(user_id, type, title, message, data = null, action_url = null, priority = 'medium') {
    return this.create({
      user_id,
      type,
      title,
      message,
      data,
      action_url,
      priority
    });
  },

  // Helper to send notification to multiple users
  async sendBulkNotifications(user_ids, type, title, message, data = null, action_url = null, priority = 'medium') {
    const notifications = user_ids.map(user_id => ({
      user_id,
      type,
      title,
      message,
      data,
      action_url,
      priority
    }));

    return this.createBulk(notifications);
  }
};

export default Notification;
