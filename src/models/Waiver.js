import { executeQuery } from '../config/database.js';

export const Waiver = {
  async findAll(filters = {}, pagination = {}) {
    const { contact_id, fee_id, status, vertical_id } = filters;
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE w.status != "deleted"';
    const params = [];

    if (contact_id) {
      whereClause += ' AND w.contact_id = ?';
      params.push(contact_id);
    }

    if (fee_id) {
      whereClause += ' AND w.fee_id = ?';
      params.push(fee_id);
    }

    if (status && status !== 'all') {
      whereClause += ' AND w.status = ?';
      params.push(status);
    }

    if (vertical_id) {
      whereClause += ' AND f.vertical_id = ?';
      params.push(vertical_id);
    }

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM fee_waivers w
      LEFT JOIN fees f ON w.fee_id = f.id
      ${whereClause}
    `;

    const query = `
      SELECT 
        w.*,
        c.name as contact_name,
        c.email as contact_email,
        f.description as fee_description,
        f.amount as original_fee_amount,
        v.name as vertical_name,
        r.name as reviewer_name
      FROM fee_waivers w
      LEFT JOIN contacts c ON w.contact_id = c.id
      LEFT JOIN fees f ON w.fee_id = f.id
      LEFT JOIN verticals v ON f.vertical_id = v.id
      LEFT JOIN users r ON w.reviewed_by = r.id
      ${whereClause}
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const [countResult, waivers] = await Promise.all([
      executeQuery(countQuery, params.slice(0, params.length - 2)),
      executeQuery(query, params)
    ]);

    return {
      waivers,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  },

  async findById(id) {
    const query = `
      SELECT 
        w.*,
        c.name as contact_name,
        c.email as contact_email,
        f.description as fee_description,
        f.amount as original_fee_amount,
        v.name as vertical_name,
        r.name as reviewer_name
      FROM fee_waivers w
      LEFT JOIN contacts c ON w.contact_id = c.id
      LEFT JOIN fees f ON w.fee_id = f.id
      LEFT JOIN verticals v ON f.vertical_id = v.id
      LEFT JOIN users r ON w.reviewed_by = r.id
      WHERE w.id = ? AND w.status != 'deleted'
    `;
    const result = await executeQuery(query, [id]);
    return result[0] || null;
  },

  async create(waiverData) {
    const fee = await executeQuery('SELECT contact_id, vertical_id, amount FROM fees WHERE id = ?', [waiverData.fee_id]);
    if (!fee.length) throw new Error('Fee not found');

    const query = `
      INSERT INTO fee_waivers (
        fee_id, contact_id, waiver_type, reason,
        requested_amount, notes, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `;

    const params = [
      waiverData.fee_id,
      fee[0].contact_id,
      waiverData.waiver_type,
      waiverData.reason,
      waiverData.requested_amount || fee[0].amount,
      waiverData.notes || null,
      waiverData.created_by
    ];

    const result = await executeQuery(query, params);
    
    // Record audit log
    await executeQuery(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
       VALUES (?, 'waiver_requested', 'fee_waiver', ?, ?)`,
      [waiverData.created_by, result.insertId, JSON.stringify(waiverData)]
    );

    return this.findById(result.insertId);
  },

  async approve(id, reviewerId, notes = null) {
    const waiver = await this.findById(id);
    if (!waiver) throw new Error('Waiver not found');
    if (waiver.status !== 'pending') throw new Error('Waiver is not pending');

    const query = `
      UPDATE fee_waivers SET
        status = 'approved',
        reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        review_notes = ?
      WHERE id = ?
    `;

    await executeQuery(query, [reviewerId, notes, id]);
    
    // Update the associated fee
    await executeQuery(`
      UPDATE fees SET
        status = 'waived',
        waived_amount = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [waiver.requested_amount, waiver.fee_id]);
    
    // Record audit log
    await executeQuery(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
       VALUES (?, 'waiver_approved', 'fee_waiver', ?, ?, ?)`,
      [reviewerId, id, JSON.stringify({ previous_status: 'pending' }), JSON.stringify({ new_status: 'approved' })]
    );

    return this.findById(id);
  },

  async reject(id, reviewerId, notes = null) {
    const waiver = await this.findById(id);
    if (!waiver) throw new Error('Waiver not found');
    if (waiver.status !== 'pending') throw new Error('Waiver is not pending');

    const query = `
      UPDATE fee_waivers SET
        status = 'rejected',
        reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        review_notes = ?
      WHERE id = ?
    `;

    await executeQuery(query, [reviewerId, notes, id]);
    
    // Record audit log
    await executeQuery(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
       VALUES (?, 'waiver_rejected', 'fee_waiver', ?, ?, ?)`,
      [reviewerId, id, JSON.stringify({ previous_status: 'pending' }), JSON.stringify({ new_status: 'rejected' })]
    );

    return this.findById(id);
  },

  async getStatistics(filters = {}) {
    const { from_date, to_date, vertical_id } = filters;

    let whereClause = 'WHERE w.status != "deleted"';
    const params = [];

    if (from_date) {
      whereClause += ' AND w.created_at >= ?';
      params.push(from_date);
    }

    if (to_date) {
      whereClause += ' AND w.created_at <= ?';
      params.push(to_date);
    }

    if (vertical_id) {
      whereClause += ' AND f.vertical_id = ?';
      params.push(vertical_id);
    }

    const query = `
      SELECT 
        w.status,
        w.waiver_type,
        COUNT(*) as count,
        SUM(w.requested_amount) as total_amount
      FROM fee_waivers w
      LEFT JOIN fees f ON w.fee_id = f.id
      ${whereClause}
      GROUP BY w.status, w.waiver_type
      ORDER BY w.status, w.waiver_type
    `;

    const stats = await executeQuery(query, params);
    const summary = {
      pending: { count: 0, total_amount: 0 },
      approved: { count: 0, total_amount: 0 },
      rejected: { count: 0, total_amount: 0 },
      by_type: {}
    };

    stats.forEach(stat => {
      if (summary[stat.status]) {
        summary[stat.status].count += stat.count;
        summary[stat.status].total_amount += stat.total_amount;
      }
      
      if (!summary.by_type[stat.waiver_type]) {
        summary.by_type[stat.waiver_type] = { count: 0, total_amount: 0 };
      }
      summary.by_type[stat.waiver_type].count += stat.count;
      summary.by_type[stat.waiver_type].total_amount += stat.total_amount;
    });

    return summary;
  }
};

export default Waiver;