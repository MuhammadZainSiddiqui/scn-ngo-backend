import { executeQuery } from '../config/database.js';

export const Exception = {
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      severity,
      vertical_id,
      assigned_to,
      created_by,
      priority,
      category,
      start_date,
      end_date,
      search,
      sort = 'e.created_at',
      order = 'desc',
      overdue_only = false,
      sla_breach_only = false
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['1=1'];
    let queryParams = [];

    // Apply vertical filtering
    if (vertical_id) {
      whereConditions.push('e.vertical_id = ?');
      queryParams.push(vertical_id);
    }

    // Status filter
    if (status) {
      whereConditions.push('e.status = ?');
      queryParams.push(status);
    }

    // Severity filter
    if (severity) {
      whereConditions.push('e.severity = ?');
      queryParams.push(severity);
    }

    // Assigned to filter
    if (assigned_to) {
      whereConditions.push('e.assigned_to = ?');
      queryParams.push(assigned_to);
    }

    // Created by filter
    if (created_by) {
      whereConditions.push('e.created_by = ?');
      queryParams.push(created_by);
    }

    // Priority filter
    if (priority !== undefined) {
      whereConditions.push('e.priority = ?');
      queryParams.push(priority ? 1 : 0);
    }

    // Category filter
    if (category) {
      whereConditions.push('e.category = ?');
      queryParams.push(category);
    }

    // Date range filter
    if (start_date) {
      whereConditions.push('DATE(e.created_at) >= ?');
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push('DATE(e.created_at) <= ?');
      queryParams.push(end_date);
    }

    // Search filter
    if (search) {
      whereConditions.push('(e.title LIKE ? OR e.description LIKE ? OR e.exception_number LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Overdue filter
    if (overdue_only) {
      whereConditions.push('(e.due_date < NOW() AND e.status IN ("open", "in_progress"))');
    }

    // SLA breach filter
    if (sla_breach_only) {
      whereConditions.push('e.sla_breach = ?');
      queryParams.push(1);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM exceptions e
      WHERE ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    // Main query with JOINs
    const query = `
      SELECT 
        e.*,
        v.name as vertical_name,
        p.name as program_name,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name,
        creator.email as created_by_email,
        assigned.first_name as assigned_to_first_name,
        assigned.last_name as assigned_to_last_name,
        assigned.email as assigned_to_email,
        resolver.first_name as resolved_by_first_name,
        resolver.last_name as resolved_by_last_name,
        closer.first_name as closed_by_first_name,
        closer.last_name as closed_by_last_name,
        DATEDIFF(NOW(), e.created_at) as age_days,
        DATEDIFF(e.due_date, NOW()) as days_until_due,
        CASE 
          WHEN e.status = 'closed' THEN DATEDIFF(e.closed_at, e.created_at)
          WHEN e.status = 'resolved' THEN DATEDIFF(e.resolved_at, e.created_at)
          WHEN e.due_date IS NOT NULL THEN DATEDIFF(NOW(), e.due_date)
          ELSE 0
        END as resolution_age_days,
        (SELECT COUNT(*) FROM exception_comments ec WHERE ec.exception_id = e.id) as comments_count,
        (SELECT COUNT(*) FROM exception_attachments ea WHERE ea.exception_id = e.id) as attachments_count
      FROM exceptions e
      LEFT JOIN verticals v ON e.vertical_id = v.id
      LEFT JOIN programs p ON e.program_id = p.id
      LEFT JOIN users creator ON e.created_by = creator.id
      LEFT JOIN users assigned ON e.assigned_to = assigned.id
      LEFT JOIN users resolver ON e.resolved_by = resolver.id
      LEFT JOIN users closer ON e.closed_by = closer.id
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
        e.*,
        v.name as vertical_name,
        v.code as vertical_code,
        p.name as program_name,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name,
        creator.email as created_by_email,
        creator.role_id as created_by_role_id,
        assigned.first_name as assigned_to_first_name,
        assigned.last_name as assigned_to_last_name,
        assigned.email as assigned_to_email,
        assigned.role_id as assigned_to_role_id,
        resolver.first_name as resolved_by_first_name,
        resolver.last_name as resolved_by_last_name,
        closer.first_name as closed_by_first_name,
        closer.last_name as closed_by_last_name,
        DATEDIFF(NOW(), e.created_at) as age_days,
        DATEDIFF(e.due_date, NOW()) as days_until_due,
        CASE 
          WHEN e.status = 'closed' THEN TIMESTAMPDIFF(HOUR, e.created_at, e.closed_at)
          WHEN e.status = 'resolved' THEN TIMESTAMPDIFF(HOUR, e.created_at, e.resolved_at)
          WHEN e.due_date IS NOT NULL AND e.due_date < NOW() THEN TIMESTAMPDIFF(HOUR, e.created_at, NOW())
          ELSE NULL
        END as hours_to_resolve,
        (SELECT COUNT(*) FROM exception_comments ec WHERE ec.exception_id = e.id) as comments_count,
        (SELECT COUNT(*) FROM exception_attachments ea WHERE ea.exception_id = e.id) as attachments_count,
        (SELECT COUNT(*) FROM exception_escalations ee WHERE ee.exception_id = e.id) as escalations_count
      FROM exceptions e
      LEFT JOIN verticals v ON e.vertical_id = v.id
      LEFT JOIN programs p ON e.program_id = p.id
      LEFT JOIN users creator ON e.created_by = creator.id
      LEFT JOIN users assigned ON e.assigned_to = assigned.id
      LEFT JOIN users resolver ON e.resolved_by = resolver.id
      LEFT JOIN users closer ON e.closed_by = closer.id
      WHERE e.id = ?
    `;

    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async findByExceptionNumber(exceptionNumber) {
    const query = 'SELECT * FROM exceptions WHERE exception_number = ?';
    const results = await executeQuery(query, [exceptionNumber]);
    return results[0] || null;
  },

  async create(exceptionData) {
    const {
      title,
      description,
      category,
      severity = 'medium',
      vertical_id,
      program_id,
      created_by,
      assigned_to = null,
      priority = false,
      due_date = null,
      tags = null,
      notes = null
    } = exceptionData;

    // Generate exception number
    const [exceptionNumberResult] = await executeQuery('CALL sp_generate_exception_number(@exception_num)');
    const exceptionNumber = exceptionNumberResult[0].exception_num;

    // Calculate due date based on severity SLA if not provided
    let finalDueDate = due_date;
    if (!finalDueDate) {
      const slaQuery = `
        SELECT resolution_time_hours 
        FROM exception_sla_rules 
        WHERE severity = ? AND active = TRUE 
        LIMIT 1
      `;
      const slaResult = await executeQuery(slaQuery, [severity]);
      if (slaResult.length > 0) {
        finalDueDate = `DATE_ADD(NOW(), INTERVAL ${slaResult[0].resolution_time_hours} HOUR)`;
      }
    }

    const query = `
      INSERT INTO exceptions (
        exception_number, title, description, category, severity, status,
        vertical_id, program_id, created_by, assigned_to, priority,
        due_date, tags, notes
      ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ${finalDueDate ? '?' : 'NULL'}, ?, ?)
    `;

    const params = [
      exceptionNumber, title, description, category, severity,
      vertical_id, program_id, created_by, assigned_to, priority ? 1 : 0,
      ...(finalDueDate && finalDueDate !== due_date ? [finalDueDate] : []),
      tags, notes
    ];

    const result = await executeQuery(query, params);
    return this.findById(result.insertId);
  },

  async update(id, updateData) {
    const allowedFields = [
      'title', 'description', 'category', 'severity', 'status',
      'vertical_id', 'program_id', 'assigned_to', 'priority',
      'due_date', 'tags', 'notes'
    ];

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
      UPDATE exceptions 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, params);
    return this.findById(id);
  },

  async updateStatus(id, status, userId = null) {
    const query = `
      UPDATE exceptions 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [status, id]);
    return this.findById(id);
  },

  async assign(id, assignedTo, assignedBy) {
    const query = `
      UPDATE exceptions 
      SET assigned_to = ?, 
          assigned_date = CURRENT_TIMESTAMP,
          status = 'in_progress',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [assignedTo, id]);
    return this.findById(id);
  },

  async reassign(id, assignedTo, reassignedBy) {
    const query = `
      UPDATE exceptions 
      SET assigned_to = ?, 
          assigned_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [assignedTo, id]);
    return this.findById(id);
  },

  async resolve(id, resolutionNotes, resolvedBy) {
    const query = `
      UPDATE exceptions 
      SET status = 'resolved',
          resolution_notes = ?,
          resolved_at = CURRENT_TIMESTAMP,
          resolved_by = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [resolutionNotes, resolvedBy, id]);
    return this.findById(id);
  },

  async close(id, closedBy) {
    const query = `
      UPDATE exceptions 
      SET status = 'closed',
          closed_at = CURRENT_TIMESTAMP,
          closed_by = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [closedBy, id]);
    return this.findById(id);
  },

  async delete(id) {
    const exception = await this.findById(id);
    if (!exception) {
      throw new Error('Exception not found');
    }

    const query = 'DELETE FROM exceptions WHERE id = ?';
    await executeQuery(query, [id]);
    return exception;
  },

  async search(searchTerm, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        e.id, e.exception_number, e.title, e.severity, e.status,
        e.vertical_id, e.created_at, e.due_date,
        v.name as vertical_name,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name,
        assigned.first_name as assigned_to_first_name,
        assigned.last_name as assigned_to_last_name
      FROM exceptions e
      LEFT JOIN verticals v ON e.vertical_id = v.id
      LEFT JOIN users creator ON e.created_by = creator.id
      LEFT JOIN users assigned ON e.assigned_to = assigned.id
      WHERE (
        e.title LIKE ? OR 
        e.description LIKE ? OR 
        e.exception_number LIKE ? OR
        e.tags LIKE ?
      )
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const searchPattern = `%${searchTerm}%`;
    const results = await executeQuery(query, [
      searchPattern, searchPattern, searchPattern, searchPattern,
      limit, offset
    ]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM exceptions e
      WHERE (
        e.title LIKE ? OR 
        e.description LIKE ? OR 
        e.exception_number LIKE ? OR
        e.tags LIKE ?
      )
    `;
    const countResult = await executeQuery(countQuery, [
      searchPattern, searchPattern, searchPattern, searchPattern
    ]);
    const total = countResult[0].total;

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

  async getByStatus(status, options = {}) {
    return this.findAll({ ...options, status });
  },

  async getBySeverity(severity, options = {}) {
    return this.findAll({ ...options, severity });
  },

  async getAssignedToUser(userId, options = {}) {
    return this.findAll({ ...options, assigned_to: userId });
  },

  async getCreatedByUser(userId, options = {}) {
    return this.findAll({ ...options, created_by: userId });
  },

  async getOverdue(options = {}) {
    return this.findAll({ ...options, overdue_only: true });
  },

  async getByVertical(verticalId, options = {}) {
    return this.findAll({ ...options, vertical_id: verticalId });
  },

  async getStats(options = {}) {
    const { vertical_id } = options;

    let whereClause = '';
    let queryParams = [];

    if (vertical_id) {
      whereClause = 'WHERE vertical_id = ?';
      queryParams.push(vertical_id);
    }

    // Total exceptions
    const totalQuery = `SELECT COUNT(*) as total FROM exceptions ${whereClause}`;
    const totalResult = await executeQuery(totalQuery, queryParams);
    const total = totalResult[0].total;

    // By status
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM exceptions
      ${whereClause}
      GROUP BY status
    `;
    const byStatus = await executeQuery(statusQuery, queryParams);

    // By severity
    const severityQuery = `
      SELECT severity, COUNT(*) as count
      FROM exceptions
      ${whereClause}
      GROUP BY severity
    `;
    const bySeverity = await executeQuery(severityQuery, queryParams);

    // By category
    const categoryQuery = `
      SELECT category, COUNT(*) as count
      FROM exceptions
      ${whereClause}
      WHERE category IS NOT NULL
      GROUP BY category
    `;
    const byCategory = await executeQuery(categoryQuery, queryParams);

    // Open exceptions
    const openQuery = `SELECT COUNT(*) as total FROM exceptions WHERE status = 'open' ${vertical_id ? 'AND vertical_id = ?' : ''}`;
    const openResult = await executeQuery(openQuery, vertical_id ? [vertical_id] : []);
    const open = openResult[0].total;

    // In progress
    const inProgressQuery = `SELECT COUNT(*) as total FROM exceptions WHERE status = 'in_progress' ${vertical_id ? 'AND vertical_id = ?' : ''}`;
    const inProgressResult = await executeQuery(inProgressQuery, vertical_id ? [vertical_id] : []);
    const inProgress = inProgressResult[0].total;

    // Overdue
    const overdueQuery = `
      SELECT COUNT(*) as total 
      FROM exceptions 
      WHERE due_date < NOW() AND status IN ('open', 'in_progress')
      ${vertical_id ? 'AND vertical_id = ?' : ''}
    `;
    const overdueResult = await executeQuery(overdueQuery, vertical_id ? [vertical_id] : []);
    const overdue = overdueResult[0].total;

    // SLA breaches
    const slaBreachQuery = `SELECT COUNT(*) as total FROM exceptions WHERE sla_breach = ? ${vertical_id ? 'AND vertical_id = ?' : ''}`;
    const slaBreachResult = await executeQuery(slaBreachQuery, [1, ...(vertical_id ? [vertical_id] : [])]);
    const slaBreach = slaBreachResult[0].total;

    // Average resolution time (hours)
    const avgResolutionQuery = `
      SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours
      FROM exceptions
      WHERE status = 'resolved' AND resolved_at IS NOT NULL
      ${vertical_id ? 'AND vertical_id = ?' : ''}
    `;
    const avgResolutionResult = await executeQuery(avgResolutionQuery, vertical_id ? [vertical_id] : []);
    const avgResolutionTime = avgResolutionResult[0].avg_hours || 0;

    // Priority exceptions
    const priorityQuery = `SELECT COUNT(*) as total FROM exceptions WHERE priority = ? ${vertical_id ? 'AND vertical_id = ?' : ''}`;
    const priorityResult = await executeQuery(priorityQuery, [1, ...(vertical_id ? [vertical_id] : [])]);
    const priority = priorityResult[0].total;

    // Escalated exceptions
    const escalatedQuery = `SELECT COUNT(*) as total FROM exceptions WHERE escalation_level > 0 ${vertical_id ? 'AND vertical_id = ?' : ''}`;
    const escalatedResult = await executeQuery(escalatedQuery, vertical_id ? [vertical_id] : []);
    const escalated = escalatedResult[0].total;

    return {
      total,
      open,
      in_progress: inProgress,
      resolved: (byStatus.find(s => s.status === 'resolved') || {}).count || 0,
      closed: (byStatus.find(s => s.status === 'closed') || {}).count || 0,
      overdue,
      sla_breach: slaBreach,
      priority,
      escalated,
      avg_resolution_hours: Math.round(avgResolutionTime * 100) / 100,
      by_status: byStatus,
      by_severity: bySeverity,
      by_category: byCategory
    };
  },

  async getEscalationReport(options = {}) {
    const { vertical_id, severity, start_date, end_date } = options;

    let whereConditions = ['e.escalation_level > 0'];
    let queryParams = [];

    if (vertical_id) {
      whereConditions.push('e.vertical_id = ?');
      queryParams.push(vertical_id);
    }

    if (severity) {
      whereConditions.push('e.severity = ?');
      queryParams.push(severity);
    }

    if (start_date) {
      whereConditions.push('DATE(e.created_at) >= ?');
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push('DATE(e.created_at) <= ?');
      queryParams.push(end_date);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        e.id,
        e.exception_number,
        e.title,
        e.severity,
        e.status,
        e.escalation_level,
        e.escalation_count,
        e.created_at,
        e.vertical_id,
        v.name as vertical_name,
        e.created_by,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name,
        e.assigned_to,
        assigned.first_name as assigned_to_first_name,
        assigned.last_name as assigned_to_last_name,
        DATEDIFF(NOW(), e.created_at) as age_days,
        (SELECT COUNT(*) FROM exception_escalations ee WHERE ee.exception_id = e.id) as total_escalations
      FROM exceptions e
      LEFT JOIN verticals v ON e.vertical_id = v.id
      LEFT JOIN users creator ON e.created_by = creator.id
      LEFT JOIN users assigned ON e.assigned_to = assigned.id
      WHERE ${whereClause}
      ORDER BY e.escalation_level DESC, e.created_at DESC
    `;

    const results = await executeQuery(query, queryParams);

    return {
      data: results,
      total: results.length,
      summary: {
        total_escalated: results.length,
        by_severity: results.reduce((acc, e) => {
          acc[e.severity] = (acc[e.severity] || 0) + 1;
          return acc;
        }, {}),
        by_level: results.reduce((acc, e) => {
          acc[e.escalation_level] = (acc[e.escalation_level] || 0) + 1;
          return acc;
        }, {})
      }
    };
  },

  async getUserWorkload(userId, options = {}) {
    const { status } = options;

    let whereConditions = ['assigned_to = ?'];
    let queryParams = [userId];

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        COUNT(*) as total_assigned,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN priority = 1 THEN 1 ELSE 0 END) as priority,
        SUM(CASE WHEN due_date < NOW() AND status IN ('open', 'in_progress') THEN 1 ELSE 0 END) as overdue,
        AVG(CASE WHEN status IN ('open', 'in_progress') THEN DATEDIFF(NOW(), created_at) ELSE NULL END) as avg_age_days
      FROM exceptions
      WHERE ${whereClause}
    `;

    const result = await executeQuery(query, queryParams);
    return result[0];
  },

  async getVerticalSummary(verticalId) {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN priority = 1 THEN 1 ELSE 0 END) as priority,
        SUM(CASE WHEN due_date < NOW() AND status IN ('open', 'in_progress') THEN 1 ELSE 0 END) as overdue,
        AVG(CASE WHEN status = 'resolved' THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) ELSE NULL END) as avg_resolution_hours
      FROM exceptions
      WHERE vertical_id = ?
    `;

    const result = await executeQuery(query, [verticalId]);
    return result[0];
  },

  async addComment(exceptionId, userId, comment, isInternal = false) {
    const query = `
      INSERT INTO exception_comments (exception_id, user_id, comment, is_internal)
      VALUES (?, ?, ?, ?)
    `;

    const result = await executeQuery(query, [exceptionId, userId, comment, isInternal ? 1 : 0]);
    return result.insertId;
  },

  async getComments(exceptionId, options = {}) {
    const { internal_only = false } = options;

    const query = `
      SELECT 
        ec.*,
        u.first_name,
        u.last_name,
        u.email,
        u.role_id
      FROM exception_comments ec
      JOIN users u ON ec.user_id = u.id
      WHERE ec.exception_id = ? ${internal_only ? 'AND ec.is_internal = 1' : ''}
      ORDER BY ec.created_at ASC
    `;

    return await executeQuery(query, [exceptionId]);
  },

  async addHistory(exceptionId, action, performedBy, oldValues = null, newValues = null, description = null) {
    const query = `
      INSERT INTO exception_history (exception_id, action, performed_by, old_values, new_values, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(query, [
      exceptionId,
      action,
      performedBy,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      description
    ]);
    return result.insertId;
  },

  async getHistory(exceptionId) {
    const query = `
      SELECT 
        eh.*,
        u.first_name,
        u.last_name,
        u.email
      FROM exception_history eh
      JOIN users u ON eh.performed_by = u.id
      WHERE eh.exception_id = ?
      ORDER BY eh.created_at ASC
    `;

    return await executeQuery(query, [exceptionId]);
  },

  async escalate(exceptionId, escalatedBy, reason, escalationLevel = 1, escalatedToUserId = null) {
    // Get current exception
    const exception = await this.findById(exceptionId);
    if (!exception) {
      throw new Error('Exception not found');
    }

    // Create escalation record
    const escalationQuery = `
      INSERT INTO exception_escalations (
        exception_id, escalated_from_user_id, escalated_to_user_id,
        escalated_by, escalation_level, reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `;

    await executeQuery(escalationQuery, [
      exceptionId,
      exception.assigned_to,
      escalatedToUserId,
      escalatedBy,
      escalationLevel,
      reason
    ]);

    // Update exception
    const updateQuery = `
      UPDATE exceptions 
      SET escalation_level = ?,
          escalation_count = escalation_count + 1,
          last_escalated_at = CURRENT_TIMESTAMP,
          ${escalatedToUserId ? 'assigned_to = ?,' : ''}
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const updateParams = [escalationLevel];
    if (escalatedToUserId) {
      updateParams.push(escalatedToUserId);
    }
    updateParams.push(exceptionId);

    await executeQuery(updateQuery, updateParams);

    return this.findById(exceptionId);
  },

  async getEscalations(exceptionId) {
    const query = `
      SELECT 
        ee.*,
        from_user.first_name as escalated_from_first_name,
        from_user.last_name as escalated_from_last_name,
        to_user.first_name as escalated_to_first_name,
        to_user.last_name as escalated_to_last_name,
        by_user.first_name as escalated_by_first_name,
        by_user.last_name as escalated_by_last_name
      FROM exception_escalations ee
      LEFT JOIN users from_user ON ee.escalated_from_user_id = from_user.id
      LEFT JOIN users to_user ON ee.escalated_to_user_id = to_user.id
      LEFT JOIN users by_user ON ee.escalated_by = by_user.id
      WHERE ee.exception_id = ?
      ORDER BY ee.escalated_at DESC
    `;

    return await executeQuery(query, [exceptionId]);
  },

  async checkSLABreach() {
    // This would typically be run by a cron job
    const query = `
      UPDATE exceptions e
      JOIN exception_sla_rules sla ON e.severity = sla.severity
      SET e.sla_breach = TRUE,
          e.updated_at = CURRENT_TIMESTAMP
      WHERE e.status IN ('open', 'in_progress')
        AND sla.active = TRUE
        AND e.due_date < NOW()
        AND e.sla_breach = FALSE
    `;

    return await executeQuery(query);
  }
};
