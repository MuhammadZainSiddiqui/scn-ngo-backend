import { executeQuery, executeTransaction } from '../config/database.js';

export const Safeguarding = {
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      severity,
      incident_type,
      vertical_id,
      program_id,
      confidential,
      search,
      startDate,
      endDate,
      sort = 'created_at',
      order = 'desc'
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    if (status) {
      whereConditions.push('s.status = ?');
      params.push(status);
    }

    if (severity) {
      whereConditions.push('s.severity = ?');
      params.push(severity);
    }

    if (incident_type) {
      whereConditions.push('s.incident_type = ?');
      params.push(incident_type);
    }

    if (vertical_id) {
      whereConditions.push('s.vertical_id = ?');
      params.push(vertical_id);
    }

    if (program_id) {
      whereConditions.push('s.program_id = ?');
      params.push(program_id);
    }

    if (confidential !== undefined) {
      whereConditions.push('s.confidential = ?');
      params.push(confidential === 'true' || confidential === true ? 1 : 0);
    }

    if (search) {
      whereConditions.push('(s.incident_number LIKE ? OR s.title LIKE ? OR s.description LIKE ? OR s.location LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (startDate) {
      whereConditions.push('s.incident_date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('s.incident_date <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const orderBy = `ORDER BY s.${sort} ${order.toUpperCase()}`;

    const query = `
      SELECT 
        s.*,
        v.name as vertical_name,
        p.name as program_name,
        u1.first_name as reported_by_first_name, u1.last_name as reported_by_last_name,
        u2.first_name as assigned_to_first_name, u2.last_name as assigned_to_last_name
      FROM safeguarding_records s
      LEFT JOIN verticals v ON s.vertical_id = v.id
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN users u1 ON s.reported_by = u1.id
      LEFT JOIN users u2 ON s.assigned_to = u2.id
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM safeguarding_records s ${whereClause}
    `;

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

  async findById(id) {
    const query = `
      SELECT 
        s.*,
        v.name as vertical_name,
        p.name as program_name,
        u1.first_name as reported_by_first_name, u1.last_name as reported_by_last_name,
        u2.first_name as assigned_to_first_name, u2.last_name as assigned_to_last_name
      FROM safeguarding_records s
      LEFT JOIN verticals v ON s.vertical_id = v.id
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN users u1 ON s.reported_by = u1.id
      LEFT JOIN users u2 ON s.assigned_to = u2.id
      WHERE s.id = ?
    `;
    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async create(data) {
    const incident_number = await this.generateIncidentNumber();
    const query = `
      INSERT INTO safeguarding_records (
        incident_number, title, incident_date, reported_date, incident_type, 
        severity, location, description, people_involved, 
        witness_details, immediate_action_taken, status, 
        reported_by, assigned_to, vertical_id, program_id, 
        confidential, external_authority_notified, authority_details
      ) VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      incident_number,
      data.title,
      data.incident_date,
      data.incident_type,
      data.severity,
      data.location || null,
      data.description,
      data.people_involved ? JSON.stringify(data.people_involved) : null,
      data.witness_details || null,
      data.immediate_action_taken || null,
      data.status || 'reported',
      data.reported_by,
      data.assigned_to || null,
      data.vertical_id || null,
      data.program_id || null,
      data.confidential !== undefined ? data.confidential : true,
      data.external_authority_notified || false,
      data.authority_details || null
    ];

    const result = await executeQuery(query, params);
    return { id: result.insertId, incident_number };
  },

  async update(id, data) {
    const allowedFields = [
      'title', 'incident_date', 'incident_type', 'severity', 'location', 
      'description', 'people_involved', 'witness_details', 
      'immediate_action_taken', 'status', 'resolution', 
      'resolution_date', 'assigned_to', 'vertical_id', 
      'program_id', 'confidential', 'external_authority_notified', 
      'authority_details'
    ];

    const updates = [];
    const params = [];

    Object.entries(data).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(key === 'people_involved' ? JSON.stringify(value) : value);
      }
    });

    if (updates.length === 0) return null;

    params.push(id);
    const query = `UPDATE safeguarding_records SET ${updates.join(', ')} WHERE id = ?`;
    return executeQuery(query, params);
  },

  async archive(id) {
    const query = "UPDATE safeguarding_records SET status = 'closed' WHERE id = ?";
    return executeQuery(query, [id]);
  },

  async logAccess(accessData) {
    const query = `
      INSERT INTO safeguarding_access_log (
        record_id, accessed_by, access_type, ip_address, user_agent, access_reason
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      accessData.record_id,
      accessData.accessed_by,
      accessData.access_type,
      accessData.ip_address || null,
      accessData.user_agent || null,
      accessData.access_reason || null
    ];
    return executeQuery(query, params);
  },

  async getAccessHistory(recordId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        l.*,
        u.first_name, u.last_name, u.email
      FROM safeguarding_access_log l
      JOIN users u ON l.accessed_by = u.id
      WHERE l.record_id = ?
      ORDER BY l.accessed_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `SELECT COUNT(*) as total FROM safeguarding_access_log WHERE record_id = ?`;

    const [data, countResult] = await Promise.all([
      executeQuery(query, [recordId, limit, offset]),
      executeQuery(countQuery, [recordId])
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

  async generateIncidentNumber() {
    const year = new Date().getFullYear();
    const query = `SELECT incident_number FROM safeguarding_records WHERE incident_number LIKE ? ORDER BY id DESC LIMIT 1`;
    const results = await executeQuery(query, [`INC-${year}-%`]);
    
    let nextNumber = 1;
    if (results.length > 0) {
      const lastNumber = parseInt(results[0].incident_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    
    return `INC-${year}-${nextNumber.toString().padStart(4, '0')}`;
  }
};

export default Safeguarding;
