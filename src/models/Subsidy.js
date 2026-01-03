import { executeQuery } from '../config/database.js';

export const Subsidy = {
  async findAll(filters = {}, pagination = {}) {
    const { contact_id, vertical_id, program_id, status } = filters;
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE s.status != "deleted"';
    const params = [];

    if (contact_id) {
      whereClause += ' AND s.contact_id = ?';
      params.push(contact_id);
    }

    if (vertical_id) {
      whereClause += ' AND s.vertical_id = ?';
      params.push(vertical_id);
    }

    if (program_id) {
      whereClause += ' AND s.program_id = ?';
      params.push(program_id);
    }

    if (status && status !== 'all') {
      whereClause += ' AND s.status = ?';
      params.push(status);
    }

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM subsidies s
      ${whereClause}
    `;

    const query = `
      SELECT 
        s.*,
        c.name as contact_name,
        c.email as contact_email,
        v.name as vertical_name,
        p.name as program_name,
        u.name as allocated_by_name
      FROM subsidies s
      LEFT JOIN contacts c ON s.contact_id = c.id
      LEFT JOIN verticals v ON s.vertical_id = v.id
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN users u ON s.allocated_by = u.id
      ${whereClause}
      ORDER BY s.allocated_date DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const [countResult, subsidies] = await Promise.all([
      executeQuery(countQuery, params.slice(0, params.length - 2)),
      executeQuery(query, params)
    ]);

    return {
      subsidies,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  },

  async findById(id) {
    const query = `
      SELECT 
        s.*,
        c.name as contact_name,
        c.email as contact_email,
        v.name as vertical_name,
        p.name as program_name,
        u.name as allocated_by_name
      FROM subsidies s
      LEFT JOIN contacts c ON s.contact_id = c.id
      LEFT JOIN verticals v ON s.vertical_id = v.id
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN users u ON s.allocated_by = u.id
      WHERE s.id = ? AND s.status != 'deleted'
    `;
    const result = await executeQuery(query, [id]);
    return result[0] || null;
  },

  async create(subsidyData) {
    const query = `
      INSERT INTO subsidies (
        contact_id, vertical_id, program_id, amount, currency,
        subsidy_type, description, eligibility_criteria, start_date,
        end_date, allocated_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `;

    const params = [
      subsidyData.contact_id,
      subsidyData.vertical_id,
      subsidyData.program_id || null,
      subsidyData.amount,
      subsidyData.currency || 'INR',
      subsidyData.subsidy_type,
      subsidyData.description || null,
      subsidyData.eligibility_criteria || null,
      subsidyData.start_date || null,
      subsidyData.end_date || null,
      subsidyData.allocated_by
    ];

    const result = await executeQuery(query, params);
    
    // Record audit log
    await executeQuery(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
       VALUES (?, 'subsidy_created', 'subsidy', ?, ?)`,
      [subsidyData.allocated_by, result.insertId, JSON.stringify(subsidyData)]
    );

    return this.findById(result.insertId);
  },

  async update(id, subsidyData) {
    const query = `
      UPDATE subsidies SET
        amount = COALESCE(?, amount),
        subsidy_type = COALESCE(?, subsidy_type),
        description = COALESCE(?, description),
        eligibility_criteria = COALESCE(?, eligibility_criteria),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status != 'deleted'
    `;

    const params = [
      subsidyData.amount,
      subsidyData.subsidy_type,
      subsidyData.description,
      subsidyData.eligibility_criteria,
      subsidyData.start_date,
      subsidyData.end_date,
      subsidyData.status,
      id
    ];

    await executeQuery(query, params);
    
    // Record audit log
    if (subsidyData.updated_by) {
      await executeQuery(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES (?, 'subsidy_updated', 'subsidy', ?, ?)`,
        [subsidyData.updated_by, id, JSON.stringify(subsidyData)]
      );
    }

    return this.findById(id);
  },

  async allocate(subsidyId, feeId, allocatedAmount, allocatedBy) {
    const query = `
      INSERT INTO subsidy_allocations (
        subsidy_id, fee_id, allocated_amount, allocated_by
      ) VALUES (?, ?, ?, ?)
    `;

    const result = await executeQuery(query, [subsidyId, feeId, allocatedAmount, allocatedBy]);
    
    // Update fee amount to reflect subsidy
    await executeQuery(`
      UPDATE fees 
      SET amount = amount - ?, 
          subsidy_applied = COALESCE(subsidy_applied, 0) + ?,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [allocatedAmount, allocatedAmount, feeId]);

    // Record audit log
    await executeQuery(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
       VALUES (?, 'subsidy_allocated', 'subsidy_allocation', ?, ?)`,
      [allocatedBy, result.insertId, JSON.stringify({ subsidy_id: subsidyId, fee_id: feeId, amount: allocatedAmount })]
    );

    return result.insertId;
  },

  async getAllocationStats(filters = {}) {
    const { contact_id, vertical_id, program_id, from_date, to_date } = filters;

    let whereClause = 'WHERE s.status = "active"';
    const params = [];

    if (contact_id) {
      whereClause += ' AND s.contact_id = ?';
      params.push(contact_id);
    }

    if (vertical_id) {
      whereClause += ' AND s.vertical_id = ?';
      params.push(vertical_id);
    }

    if (program_id) {
      whereClause += ' AND s.program_id = ?';
      params.push(program_id);
    }

    if (from_date) {
      whereClause += ' AND s.allocated_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      whereClause += ' AND s.allocated_date <= ?';
      params.push(to_date);
    }

    const query = `
      SELECT 
        s.subsidy_type,
        v.name as vertical_name,
        COUNT(*) as active_subsidies,
        SUM(s.amount) as total_allocated,
        COUNT(DISTINCT s.contact_id) as unique_recipients
      FROM subsidies s
      LEFT JOIN verticals v ON s.vertical_id = v.id
      ${whereClause}
      GROUP BY s.subsidy_type, v.name
      ORDER BY total_allocated DESC
    `;

    return executeQuery(query, params);
  },

  async getUsageReport(filters = {}) {
    const { from_date, to_date, vertical_id } = filters;

    let whereClause = 'WHERE sa.created_at IS NOT NULL';
    const params = [];

    if (from_date) {
      whereClause += ' AND sa.created_at >= ?';
      params.push(from_date);
    }

    if (to_date) {
      whereClause += ' AND sa.created_at <= ?';
      params.push(to_date);
    }

    if (vertical_id) {
      whereClause += ' AND s.vertical_id = ?';
      params.push(vertical_id);
    }

    const query = `
      SELECT 
        s.subsidy_type,
        DATE_FORMAT(sa.created_at, '%Y-%m') as usage_month,
        COUNT(DISTINCT sa.id) as usage_count,
        SUM(sa.allocated_amount) as total_used
      FROM subsidy_allocations sa
      LEFT JOIN subsidies s ON sa.subsidy_id = s.id
      LEFT JOIN fees f ON sa.fee_id = f.id
      ${whereClause}
      GROUP BY s.subsidy_type, DATE_FORMAT(sa.created_at, '%Y-%m')
      ORDER BY usage_month DESC, total_used DESC
    `;

    return executeQuery(query, params);
  },

  async delete(id, userId) {
    const query = `
      UPDATE subsidies SET
        status = 'deleted',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [id]);
    
    // Record audit log
    await executeQuery(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
       VALUES (?, 'subsidy_deleted', 'subsidy', ?)`,
      [userId, id]
    );

    return true;
  }
};

export default Subsidy;