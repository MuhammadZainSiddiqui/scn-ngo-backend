import { executeQuery } from '../config/database.js';

export const Fee = {
  async findAll(filters = {}, pagination = {}) {
    const {
      contact_id,
      vertical_id,
      status,
      fee_plan_id,
      from_date,
      to_date,
      include_overdue
    } = filters;
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE f.status != "deleted"';
    const params = [];

    if (contact_id) {
      whereClause += ' AND f.contact_id = ?';
      params.push(contact_id);
    }

    if (vertical_id) {
      whereClause += ' AND f.vertical_id = ?';
      params.push(vertical_id);
    }

    if (status) {
      whereClause += ' AND f.status = ?';
      params.push(status);
    } else if (include_overdue !== true) {
      whereClause += ' AND f.status != "overdue"';
    }

    if (fee_plan_id) {
      whereClause += ' AND f.fee_plan_id = ?';
      params.push(fee_plan_id);
    }

    if (from_date) {
      whereClause += ' AND f.due_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      whereClause += ' AND f.due_date <= ?';
      params.push(to_date);
    }

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM fees f
      ${whereClause}
    `;

    const query = `
      SELECT 
        f.*,
        c.name as contact_name,
        c.email as contact_email,
        fp.name as fee_plan_name,
        v.name as vertical_name,
        COALESCE(SUM(p.amount), 0) as total_paid
      FROM fees f
      LEFT JOIN contacts c ON f.contact_id = c.id
      LEFT JOIN fee_plans fp ON f.fee_plan_id = fp.id
      LEFT JOIN verticals v ON f.vertical_id = v.id
      LEFT JOIN fee_payments p ON f.id = p.fee_id AND p.status = 'completed'
      ${whereClause}
      GROUP BY f.id
      ORDER BY f.due_date DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const [countResult, fees] = await Promise.all([
      executeQuery(countQuery, params.slice(0, params.length - 2)),
      executeQuery(query, params)
    ]);

    return {
      fees,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  },

  async findById(id) {
    const query = `
      SELECT 
        f.*,
        c.name as contact_name,
        c.email as contact_email,
        fp.name as fee_plan_name,
        v.name as vertical_name,
        COALESCE(SUM(p.amount), 0) as total_paid,
        GROUP_CONCAT(
          JSON_OBJECT(
            'id', p.id,
            'amount', p.amount,
            'payment_date', p.payment_date,
            'payment_method', p.payment_method,
            'reference', p.reference
          )
        ) as payments
      FROM fees f
      LEFT JOIN contacts c ON f.contact_id = c.id
      LEFT JOIN fee_plans fp ON f.fee_plan_id = fp.id
      LEFT JOIN verticals v ON f.vertical_id = v.id
      LEFT JOIN fee_payments p ON f.id = p.fee_id AND p.status = 'completed'
      WHERE f.id = ? AND f.status != 'deleted'
      GROUP BY f.id
    `;
    const result = await executeQuery(query, [id]);
    return result[0] || null;
  },

  async create(feeData) {
    const query = `
      INSERT INTO fees (
        contact_id, fee_plan_id, vertical_id, amount, currency,
        description, due_date, billing_period_start, billing_period_end,
        status, created_by, original_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `;

    const params = [
      feeData.contact_id,
      feeData.fee_plan_id,
      feeData.vertical_id,
      feeData.amount,
      feeData.currency || 'INR',
      feeData.description,
      feeData.due_date,
      feeData.billing_period_start || null,
      feeData.billing_period_end || null,
      feeData.created_by,
      feeData.amount // original_amount
    ];

    const result = await executeQuery(query, params);
    return this.findById(result.insertId);
  },

  async updateStatus(id, status, userId, notes = null) {
    const query = `
      UPDATE fees SET
        status = ?,
        updated_by = ?,
        status_change_notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status != 'deleted'
    `;

    await executeQuery(query, [status, userId, notes, id]);
    const updatedFee = await this.findById(id);
    
    // Record audit log for status change
    if (updatedFee) {
      await executeQuery(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
         VALUES (?, 'fee_status_change', 'fee', ?, ?, ?)`,
        [userId, id, JSON.stringify({ previous_status: updatedFee.status }), JSON.stringify({ new_status: status })]
      );
    }
    
    return updatedFee;
  },

  async updateAmount(id, newAmount, userId, reason = null) {
    const fee = await this.findById(id);
    if (!fee) return null;

    const oldAmount = fee.amount;
    const query = `
      UPDATE fees SET
        amount = ?,
        previous_amount = ?,
        amount_change_reason = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status != 'deleted'
    `;

    await executeQuery(query, [newAmount, oldAmount, reason, userId, id]);
    
    // Record audit log
    await executeQuery(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
       VALUES (?, 'fee_amount_change', 'fee', ?, ?, ?)`,
      [userId, id, JSON.stringify({ previous_amount: oldAmount }), JSON.stringify({ new_amount: newAmount })]
    );
    
    return this.findById(id);
  },

  async getStatistics(filters = {}) {
    const { contact_id, vertical_id, from_date, to_date } = filters;

    let whereClause = 'WHERE status != "deleted" AND status != "waived"';
    const params = [];

    if (contact_id) {
      whereClause += ' AND contact_id = ?';
      params.push(contact_id);
    }

    if (vertical_id) {
      whereClause += ' AND vertical_id = ?';
      params.push(vertical_id);
    }

    if (from_date) {
      whereClause += ' AND due_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      whereClause += ' AND due_date <= ?';
      params.push(to_date);
    }

    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM fees
      ${whereClause}
      GROUP BY status
    `;

    const stats = await executeQuery(query, params);
    const summary = {
      pending: 0,
      paid: 0,
      overdue: 0,
      waived: 0,
      total_pending_amount: 0,
      total_paid_amount: 0,
      total_overdue_amount: 0,
      total_waived_amount: 0
    };

    stats.forEach(stat => {
      summary[stat.status] = stat.count;
      summary[`total_${stat.status}_amount`] = stat.total_amount;
    });

    return summary;
  },

  async getAgingReport(vertical_id = null) {
    let whereClause = 'WHERE status = "overdue"';
    const params = [];

    if (vertical_id) {
      whereClause += ' AND vertical_id = ?';
      params.push(vertical_id);
    }

    const query = `
      SELECT 
        CASE 
          WHEN DATEDIFF(CURRENT_DATE, due_date) <= 30 THEN '0-30 days'
          WHEN DATEDIFF(CURRENT_DATE, due_date) <= 60 THEN '31-60 days'
          WHEN DATEDIFF(CURRENT_DATE, due_date) <= 90 THEN '61-90 days'
          ELSE '90+ days'
        END as aging_bucket,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM fees
      ${whereClause}
      GROUP BY aging_bucket
      ORDER BY aging_bucket
    `;

    return executeQuery(query, params);
  },

  async delete(id, userId) {
    const fee = await this.findById(id);
    if (!fee) return false;

    const query = `
      UPDATE fees SET
        status = 'deleted',
        deleted_by = ?,
        deleted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [userId, id]);
    
    // Record audit log
    await executeQuery(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
       VALUES (?, 'fee_deleted', 'fee', ?)`,
      [userId, id]
    );
    
    return true;
  },

  async bulkCreateFromPlan(planId, contactIds, userId, billingDate = null) {
    const plan = await executeQuery('SELECT * FROM fee_plans WHERE id = ? AND status = "active"', [planId]);
    if (!plan.length) throw new Error('Fee plan not found');

    const planData = plan[0];
    const dueDate = billingDate || new Date();
    dueDate.setDate(dueDate.getDate() + (planData.due_day || 5));

    const query = `
      INSERT INTO fees (
        contact_id, fee_plan_id, vertical_id, amount, currency,
        description, due_date, billing_period_start, billing_period_end,
        status, created_by, original_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `;

    const insertPromises = contactIds.map(contactId => {
      const params = [
        contactId,
        planId,
        planData.vertical_id,
        planData.amount,
        'INR',
        `Fee for ${planData.name}`,
        dueDate.toISOString().split('T')[0],
        new Date().toISOString().split('T')[0],
        null,
        userId,
        planData.amount
      ];
      return executeQuery(query, params);
    });

    const results = await Promise.all(insertPromises);
    return results.map(result => result.insertId);
  }
};

export default Fee;