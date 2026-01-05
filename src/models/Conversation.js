import { executeQuery } from '../config/database.js';

export const Conversation = {
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      user_id,
      vertical_id,
      conversation_type,
      is_archived = false,
      search,
      sort = 'c.updated_at',
      order = 'desc'
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['1=1'];
    let queryParams = [];

    // Filter by user membership
    if (user_id) {
      whereConditions.push(`
        EXISTS (
          SELECT 1 FROM conversation_members cm 
          WHERE cm.conversation_id = c.id 
            AND cm.user_id = ? 
            AND cm.left_at IS NULL
        )
      `);
      queryParams.push(user_id);
    }

    // Vertical filter
    if (vertical_id) {
      whereConditions.push('c.vertical_id = ?');
      queryParams.push(vertical_id);
    }

    // Conversation type filter
    if (conversation_type) {
      whereConditions.push('c.conversation_type = ?');
      queryParams.push(conversation_type);
    }

    // Archived filter
    whereConditions.push('c.is_archived = ?');
    queryParams.push(is_archived ? 1 : 0);

    // Search filter
    if (search) {
      whereConditions.push('(c.name LIKE ? OR c.description LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM conversations c
      WHERE ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    // Main query with JOINs
    const query = `
      SELECT 
        c.*,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name,
        creator.email as created_by_email,
        v.name as vertical_name,
        (SELECT COUNT(*) FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.left_at IS NULL) as members_count,
        (SELECT COUNT(*) FROM conversation_messages cmsg WHERE cmsg.conversation_id = c.id AND cmsg.is_deleted = FALSE) as messages_count,
        (SELECT MAX(cmsg2.created_at) FROM conversation_messages cmsg2 WHERE cmsg2.conversation_id = c.id) as last_message_at
      FROM conversations c
      INNER JOIN users creator ON c.created_by = creator.id
      LEFT JOIN verticals v ON c.vertical_id = v.id
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

  async findById(id, user_id = null) {
    let query = `
      SELECT 
        c.*,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name,
        creator.email as created_by_email,
        v.name as vertical_name,
        (SELECT COUNT(*) FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.left_at IS NULL) as members_count,
        (SELECT COUNT(*) FROM conversation_messages cmsg WHERE cmsg.conversation_id = c.id AND cmsg.is_deleted = FALSE) as messages_count
      FROM conversations c
      INNER JOIN users creator ON c.created_by = creator.id
      LEFT JOIN verticals v ON c.vertical_id = v.id
      WHERE c.id = ?
    `;

    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async create(conversationData) {
    const {
      name,
      description,
      conversation_type = 'group',
      vertical_id = null,
      created_by,
      member_ids = []
    } = conversationData;

    // Create conversation
    const query = `
      INSERT INTO conversations (name, description, conversation_type, vertical_id, created_by)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(query, [name, description, conversation_type, vertical_id, created_by]);
    const conversationId = result.insertId;

    // Add creator as admin member
    await this.addMember(conversationId, created_by, 'admin');

    // Add other members
    if (member_ids && member_ids.length > 0) {
      for (const memberId of member_ids) {
        if (memberId !== created_by) {
          await this.addMember(conversationId, memberId, 'member');
        }
      }
    }

    return this.findById(conversationId);
  },

  async update(id, updateData) {
    const allowedFields = ['name', 'description', 'is_archived'];
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
      UPDATE conversations 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, params);
    return this.findById(id);
  },

  async delete(id) {
    const conversation = await this.findById(id);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Soft delete by archiving
    await this.update(id, { is_archived: true });
    return conversation;
  },

  async getMembers(conversation_id, options = {}) {
    const { page = 1, limit = 50, active_only = true } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'cm.conversation_id = ?';
    const queryParams = [conversation_id];

    if (active_only) {
      whereClause += ' AND cm.left_at IS NULL';
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM conversation_members cm
      WHERE ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    // Main query
    const query = `
      SELECT 
        cm.*,
        u.first_name,
        u.last_name,
        u.email,
        r.name as role_name
      FROM conversation_members cm
      INNER JOIN users u ON cm.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE ${whereClause}
      ORDER BY cm.joined_at ASC
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

  async addMember(conversation_id, user_id, role = 'member') {
    const query = `
      INSERT INTO conversation_members (conversation_id, user_id, role)
      VALUES (?, ?, ?)
    `;

    await executeQuery(query, [conversation_id, user_id, role]);
    return { success: true };
  },

  async removeMember(conversation_id, user_id) {
    const query = `
      UPDATE conversation_members 
      SET left_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL
    `;

    await executeQuery(query, [conversation_id, user_id]);
    return { success: true };
  },

  async updateMemberRole(conversation_id, user_id, role) {
    const query = `
      UPDATE conversation_members 
      SET role = ?
      WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL
    `;

    await executeQuery(query, [role, conversation_id, user_id]);
    return { success: true };
  },

  async updateNotificationPreference(conversation_id, user_id, preference) {
    const query = `
      UPDATE conversation_members 
      SET notification_preference = ?
      WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL
    `;

    await executeQuery(query, [preference, conversation_id, user_id]);
    return { success: true };
  },

  async isMember(conversation_id, user_id) {
    const query = `
      SELECT id 
      FROM conversation_members 
      WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL
    `;

    const results = await executeQuery(query, [conversation_id, user_id]);
    return results.length > 0;
  },

  async getMemberRole(conversation_id, user_id) {
    const query = `
      SELECT role 
      FROM conversation_members 
      WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL
    `;

    const results = await executeQuery(query, [conversation_id, user_id]);
    return results[0]?.role || null;
  },

  async getMessages(conversation_id, options = {}) {
    const {
      page = 1,
      limit = 50,
      since_id = null,
      before_id = null,
      include_deleted = false
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['cm.conversation_id = ?'];
    let queryParams = [conversation_id];

    if (!include_deleted) {
      whereConditions.push('cm.is_deleted = FALSE');
    }

    if (since_id) {
      whereConditions.push('cm.id > ?');
      queryParams.push(since_id);
    }

    if (before_id) {
      whereConditions.push('cm.id < ?');
      queryParams.push(before_id);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM conversation_messages cm
      WHERE ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    // Main query
    const query = `
      SELECT 
        cm.*,
        sender.first_name as sender_first_name,
        sender.last_name as sender_last_name,
        sender.email as sender_email,
        deleter.first_name as deleted_by_first_name,
        deleter.last_name as deleted_by_last_name,
        (SELECT COUNT(*) FROM message_attachments ma WHERE ma.conversation_message_id = cm.id) as attachments_count,
        (SELECT COUNT(*) FROM message_read_receipts mrr WHERE mrr.conversation_message_id = cm.id) as read_count
      FROM conversation_messages cm
      INNER JOIN users sender ON cm.sender_id = sender.id
      LEFT JOIN users deleter ON cm.deleted_by = deleter.id
      WHERE ${whereClause}
      ORDER BY cm.created_at ASC
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

  async addMessage(conversation_id, sender_id, body, message_type = 'message') {
    const query = `
      INSERT INTO conversation_messages (conversation_id, sender_id, body, message_type)
      VALUES (?, ?, ?, ?)
    `;

    const result = await executeQuery(query, [conversation_id, sender_id, body, message_type]);
    
    // Update conversation updated_at
    await executeQuery(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [conversation_id]
    );

    return this.getMessageById(result.insertId);
  },

  async getMessageById(message_id) {
    const query = `
      SELECT 
        cm.*,
        sender.first_name as sender_first_name,
        sender.last_name as sender_last_name,
        sender.email as sender_email,
        (SELECT COUNT(*) FROM message_attachments ma WHERE ma.conversation_message_id = cm.id) as attachments_count
      FROM conversation_messages cm
      INNER JOIN users sender ON cm.sender_id = sender.id
      WHERE cm.id = ?
    `;

    const results = await executeQuery(query, [message_id]);
    return results[0] || null;
  },

  async updateMessage(message_id, body, updated_by) {
    const query = `
      UPDATE conversation_messages 
      SET body = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [body, message_id]);
    return this.getMessageById(message_id);
  },

  async deleteMessage(message_id, deleted_by) {
    const query = `
      UPDATE conversation_messages 
      SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = ?
      WHERE id = ?
    `;

    await executeQuery(query, [deleted_by, message_id]);
    return { success: true };
  },

  async pinMessage(message_id) {
    const query = `
      UPDATE conversation_messages 
      SET is_pinned = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [message_id]);
    return this.getMessageById(message_id);
  },

  async unpinMessage(message_id) {
    const query = `
      UPDATE conversation_messages 
      SET is_pinned = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [message_id]);
    return this.getMessageById(message_id);
  },

  async addReadReceipt(message_id, user_id) {
    const query = `
      INSERT INTO message_read_receipts (conversation_message_id, user_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE read_at = CURRENT_TIMESTAMP
    `;

    await executeQuery(query, [message_id, user_id]);
    
    // Update member's last_read_at
    const messageQuery = 'SELECT conversation_id FROM conversation_messages WHERE id = ?';
    const messageResult = await executeQuery(messageQuery, [message_id]);
    
    if (messageResult.length > 0) {
      const conversationId = messageResult[0].conversation_id;
      await executeQuery(
        'UPDATE conversation_members SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND user_id = ?',
        [conversationId, user_id]
      );
    }

    return { success: true };
  },

  async search(searchTerm, user_id, options = {}) {
    const { page = 1, limit = 10 } = options;
    return this.findAll({
      page,
      limit,
      user_id,
      search: searchTerm,
      sort: 'c.updated_at',
      order: 'desc'
    });
  },

  async getStats(options = {}) {
    const { vertical_id, user_id } = options;

    let whereClause = '1=1';
    let queryParams = [];

    if (vertical_id) {
      whereClause += ' AND vertical_id = ?';
      queryParams.push(vertical_id);
    }

    // Total conversations
    const totalQuery = `SELECT COUNT(*) as total FROM conversations WHERE ${whereClause}`;
    const totalResult = await executeQuery(totalQuery, queryParams);
    const total = totalResult[0].total;

    // Active conversations (not archived)
    const activeQuery = `
      SELECT COUNT(*) as active
      FROM conversations
      WHERE ${whereClause} AND is_archived = FALSE
    `;
    const activeResult = await executeQuery(activeQuery, queryParams);
    const active = activeResult[0].active;

    // By type
    const typeQuery = `
      SELECT conversation_type, COUNT(*) as count
      FROM conversations
      WHERE ${whereClause}
      GROUP BY conversation_type
    `;
    const byType = await executeQuery(typeQuery, queryParams);

    // Total messages in conversations
    const messagesQuery = `
      SELECT COUNT(*) as total_messages
      FROM conversation_messages cm
      INNER JOIN conversations c ON cm.conversation_id = c.id
      WHERE ${whereClause.replace('vertical_id', 'c.vertical_id')} AND cm.is_deleted = FALSE
    `;
    const messagesResult = await executeQuery(messagesQuery, queryParams);
    const totalMessages = messagesResult[0].total_messages;

    return {
      total_conversations: total,
      active_conversations: active,
      by_type: byType,
      total_messages: totalMessages
    };
  }
};

export default Conversation;
