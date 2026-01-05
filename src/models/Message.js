import { executeQuery } from '../config/database.js';

export const Message = {
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      sender_id,
      receiver_id,
      is_read,
      archived = false,
      start_date,
      end_date,
      search,
      sort = 'm.created_at',
      order = 'desc',
      message_type,
      priority,
      user_id
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['1=1'];
    let queryParams = [];

    // Filter by user (messages where user is sender or receiver)
    if (user_id) {
      whereConditions.push('(m.sender_id = ? OR m.receiver_id = ?)');
      queryParams.push(user_id, user_id);
    }

    // Sender filter
    if (sender_id) {
      whereConditions.push('m.sender_id = ?');
      queryParams.push(sender_id);
    }

    // Receiver filter
    if (receiver_id) {
      whereConditions.push('m.receiver_id = ?');
      queryParams.push(receiver_id);
    }

    // Read status filter
    if (is_read !== undefined) {
      whereConditions.push('m.is_read = ?');
      queryParams.push(is_read ? 1 : 0);
    }

    // Message type filter
    if (message_type) {
      whereConditions.push('m.message_type = ?');
      queryParams.push(message_type);
    }

    // Priority filter
    if (priority) {
      whereConditions.push('m.priority = ?');
      queryParams.push(priority);
    }

    // Date range filter
    if (start_date) {
      whereConditions.push('DATE(m.created_at) >= ?');
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push('DATE(m.created_at) <= ?');
      queryParams.push(end_date);
    }

    // Search filter
    if (search) {
      whereConditions.push('(m.subject LIKE ? OR m.body LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm);
    }

    // Archive filter
    if (user_id) {
      if (archived) {
        whereConditions.push(
          '((m.sender_id = ? AND m.archived_by_sender = TRUE) OR (m.receiver_id = ? AND m.archived_by_receiver = TRUE))'
        );
        queryParams.push(user_id, user_id);
      } else {
        whereConditions.push(
          '((m.sender_id = ? AND m.archived_by_sender = FALSE) OR (m.receiver_id = ? AND m.archived_by_receiver = FALSE))'
        );
        queryParams.push(user_id, user_id);
      }
    }

    // Soft delete filter - exclude deleted messages
    if (user_id) {
      whereConditions.push(
        '((m.sender_id = ? AND m.deleted_by_sender = FALSE) OR (m.receiver_id = ? AND m.deleted_by_receiver = FALSE))'
      );
      queryParams.push(user_id, user_id);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM messages m
      WHERE ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    // Main query with JOINs
    const query = `
      SELECT 
        m.*,
        sender.first_name as sender_first_name,
        sender.last_name as sender_last_name,
        sender.email as sender_email,
        receiver.first_name as receiver_first_name,
        receiver.last_name as receiver_last_name,
        receiver.email as receiver_email,
        v.name as vertical_name,
        (SELECT COUNT(*) FROM message_attachments ma WHERE ma.message_id = m.id) as attachments_count
      FROM messages m
      INNER JOIN users sender ON m.sender_id = sender.id
      INNER JOIN users receiver ON m.receiver_id = receiver.id
      LEFT JOIN verticals v ON m.vertical_id = v.id
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
      SELECT 
        m.*,
        sender.first_name as sender_first_name,
        sender.last_name as sender_last_name,
        sender.email as sender_email,
        receiver.first_name as receiver_first_name,
        receiver.last_name as receiver_last_name,
        receiver.email as receiver_email,
        v.name as vertical_name,
        (SELECT COUNT(*) FROM message_attachments ma WHERE ma.message_id = m.id) as attachments_count
      FROM messages m
      INNER JOIN users sender ON m.sender_id = sender.id
      INNER JOIN users receiver ON m.receiver_id = receiver.id
      LEFT JOIN verticals v ON m.vertical_id = v.id
      WHERE m.id = ?
    `;

    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async create(messageData) {
    const {
      sender_id,
      receiver_id,
      subject,
      body,
      message_type = 'direct',
      priority = 'medium',
      vertical_id = null
    } = messageData;

    const query = `
      INSERT INTO messages (
        sender_id, receiver_id, subject, body, message_type, priority, vertical_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [sender_id, receiver_id, subject, body, message_type, priority, vertical_id];
    const result = await executeQuery(query, params);
    return this.findById(result.insertId);
  },

  async update(id, updateData, updated_by) {
    const allowedFields = ['subject', 'body', 'priority'];
    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(updateData[field]);
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    params.push(id);

    const query = `
      UPDATE messages 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, params);
    return this.findById(id);
  },

  async markAsRead(id, read_at = null) {
    const query = `
      UPDATE messages 
      SET is_read = TRUE, read_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const timestamp = read_at || new Date();
    await executeQuery(query, [timestamp, id]);
    return this.findById(id);
  },

  async archive(id, user_id, is_sender) {
    const field = is_sender ? 'archived_by_sender' : 'archived_by_receiver';
    const query = `
      UPDATE messages 
      SET ${field} = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [id]);
    return this.findById(id);
  },

  async unarchive(id, user_id, is_sender) {
    const field = is_sender ? 'archived_by_sender' : 'archived_by_receiver';
    const query = `
      UPDATE messages 
      SET ${field} = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [id]);
    return this.findById(id);
  },

  async softDelete(id, user_id, is_sender) {
    const field = is_sender ? 'deleted_by_sender' : 'deleted_by_receiver';
    const query = `
      UPDATE messages 
      SET ${field} = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [id]);
    return { success: true, message: 'Message deleted successfully' };
  },

  async getInbox(user_id, options = {}) {
    const { page = 1, limit = 10 } = options;
    return this.findAll({
      page,
      limit,
      receiver_id: user_id,
      user_id,
      archived: false,
      sort: 'm.created_at',
      order: 'desc'
    });
  },

  async getSent(user_id, options = {}) {
    const { page = 1, limit = 10 } = options;
    return this.findAll({
      page,
      limit,
      sender_id: user_id,
      user_id,
      archived: false,
      sort: 'm.created_at',
      order: 'desc'
    });
  },

  async getArchived(user_id, options = {}) {
    const { page = 1, limit = 10 } = options;
    return this.findAll({
      page,
      limit,
      user_id,
      archived: true,
      sort: 'm.created_at',
      order: 'desc'
    });
  },

  async getUnreadCount(user_id) {
    const query = `
      SELECT COUNT(*) as unread_count
      FROM messages
      WHERE receiver_id = ? 
        AND is_read = FALSE 
        AND deleted_by_receiver = FALSE
        AND archived_by_receiver = FALSE
    `;

    const result = await executeQuery(query, [user_id]);
    return result[0].unread_count;
  },

  async search(searchTerm, user_id, options = {}) {
    const { page = 1, limit = 10 } = options;
    return this.findAll({
      page,
      limit,
      user_id,
      search: searchTerm,
      sort: 'm.created_at',
      order: 'desc'
    });
  },

  async markMultipleAsRead(message_ids, user_id) {
    if (!message_ids || message_ids.length === 0) {
      return { success: true, count: 0 };
    }

    const placeholders = message_ids.map(() => '?').join(',');
    const query = `
      UPDATE messages 
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders}) AND receiver_id = ?
    `;

    const result = await executeQuery(query, [...message_ids, user_id]);
    return { success: true, count: result.affectedRows };
  },

  async deleteMultiple(message_ids, user_id, is_sender) {
    if (!message_ids || message_ids.length === 0) {
      return { success: true, count: 0 };
    }

    const field = is_sender ? 'deleted_by_sender' : 'deleted_by_receiver';
    const userId_field = is_sender ? 'sender_id' : 'receiver_id';
    const placeholders = message_ids.map(() => '?').join(',');
    
    const query = `
      UPDATE messages 
      SET ${field} = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders}) AND ${userId_field} = ?
    `;

    const result = await executeQuery(query, [...message_ids, user_id]);
    return { success: true, count: result.affectedRows };
  },

  async archiveMultiple(message_ids, user_id, is_sender) {
    if (!message_ids || message_ids.length === 0) {
      return { success: true, count: 0 };
    }

    const field = is_sender ? 'archived_by_sender' : 'archived_by_receiver';
    const userId_field = is_sender ? 'sender_id' : 'receiver_id';
    const placeholders = message_ids.map(() => '?').join(',');
    
    const query = `
      UPDATE messages 
      SET ${field} = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders}) AND ${userId_field} = ?
    `;

    const result = await executeQuery(query, [...message_ids, user_id]);
    return { success: true, count: result.affectedRows };
  },

  async addHistory(message_id, action, user_id, old_values = null, new_values = null) {
    const query = `
      INSERT INTO message_history (message_id, action, old_values, new_values, user_id)
      VALUES (?, ?, ?, ?, ?)
    `;

    await executeQuery(query, [
      message_id,
      action,
      old_values ? JSON.stringify(old_values) : null,
      new_values ? JSON.stringify(new_values) : null,
      user_id
    ]);
  },

  async getStats(options = {}) {
    const { vertical_id, user_id } = options;

    let whereClause = '1=1';
    let queryParams = [];

    if (vertical_id) {
      whereClause += ' AND vertical_id = ?';
      queryParams.push(vertical_id);
    }

    if (user_id) {
      whereClause += ' AND (sender_id = ? OR receiver_id = ?)';
      queryParams.push(user_id, user_id);
    }

    // Total messages
    const totalQuery = `SELECT COUNT(*) as total FROM messages WHERE ${whereClause}`;
    const totalResult = await executeQuery(totalQuery, queryParams);
    const total = totalResult[0].total;

    // Unread messages
    const unreadQuery = `
      SELECT COUNT(*) as unread
      FROM messages
      WHERE ${whereClause} AND is_read = FALSE AND deleted_by_receiver = FALSE
    `;
    const unreadResult = await executeQuery(unreadQuery, queryParams);
    const unread = unreadResult[0].unread;

    // By priority
    const priorityQuery = `
      SELECT priority, COUNT(*) as count
      FROM messages
      WHERE ${whereClause}
      GROUP BY priority
    `;
    const byPriority = await executeQuery(priorityQuery, queryParams);

    // By type
    const typeQuery = `
      SELECT message_type, COUNT(*) as count
      FROM messages
      WHERE ${whereClause}
      GROUP BY message_type
    `;
    const byType = await executeQuery(typeQuery, queryParams);

    // Recent activity (last 7 days)
    const recentQuery = `
      SELECT COUNT(*) as recent
      FROM messages
      WHERE ${whereClause} AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;
    const recentResult = await executeQuery(recentQuery, queryParams);
    const recent = recentResult[0].recent;

    return {
      total_messages: total,
      unread_messages: unread,
      by_priority: byPriority,
      by_type: byType,
      recent_activity: recent
    };
  }
};

export default Message;
