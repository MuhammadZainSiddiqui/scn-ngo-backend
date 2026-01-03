import { executeQuery } from '../config/database.js';

export const AuditLog = {
  async create(logData) {
    const query = `
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, 
        old_values, new_values, ip_address, user_agent, request_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      logData.user_id || null,
      logData.action,
      logData.entity_type,
      logData.entity_id || null,
      logData.old_values ? JSON.stringify(logData.old_values) : null,
      logData.new_values ? JSON.stringify(logData.new_values) : null,
      logData.ip_address || null,
      logData.user_agent || null,
      logData.request_url || null
    ];

    return executeQuery(query, params);
  },

  async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      user_id,
      action,
      entity_type,
      entity_id,
      startDate,
      endDate,
      sort = 'created_at',
      order = 'desc'
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    if (user_id) {
      whereConditions.push('a.user_id = ?');
      params.push(user_id);
    }

    if (action) {
      whereConditions.push('a.action = ?');
      params.push(action);
    }

    if (entity_type) {
      whereConditions.push('a.entity_type = ?');
      params.push(entity_type);
    }

    if (entity_id) {
      whereConditions.push('a.entity_id = ?');
      params.push(entity_id);
    }

    if (startDate) {
      whereConditions.push('a.created_at >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('a.created_at <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const orderBy = `ORDER BY a.${sort} ${order.toUpperCase()}`;

    const query = `
      SELECT 
        a.*,
        u.first_name, u.last_name, u.email,
        r.name as role_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const countQuery = `SELECT COUNT(*) as total FROM audit_logs a ${whereClause}`;

    const [data, countResult] = await Promise.all([
      executeQuery(query, [...params, limit, offset]),
      executeQuery(countQuery, params)
    ]);

    return {
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    };
  },

  async getUserActivityReport(userId, days = 30) {
    const query = `
      SELECT 
        action,
        entity_type,
        COUNT(*) as count,
        MAX(created_at) as last_action_at
      FROM audit_logs
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY action, entity_type
      ORDER BY count DESC
    `;
    return executeQuery(query, [userId, days]);
  },

  async getSystemAuditReport(days = 30) {
    const query = `
      SELECT 
        DATE(created_at) as date,
        action,
        COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at), action
      ORDER BY date DESC, count DESC
    `;
    return executeQuery(query, [days]);
  },

  async getEntityHistory(entityType, entityId) {
    const query = `
      SELECT 
        a.*,
        u.first_name, u.last_name, u.email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.entity_type = ? AND a.entity_id = ?
      ORDER BY a.created_at DESC
    `;
    return executeQuery(query, [entityType, entityId]);
  }
};

export default AuditLog;
