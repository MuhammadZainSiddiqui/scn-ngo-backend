import { executeQuery } from '../config/database.js';

export const FeePayment = {
  async findAll(filters = {}, pagination = {}) {
    const { fee_id, contact_id, payment_method, from_date, to_date } = filters;
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.status = "completed"';
    const params = [];

    if (fee_id) {
      whereClause += ' AND p.fee_id = ?';
      params.push(fee_id);
    }

    if (contact_id) {
      whereClause += ' AND f.contact_id = ?';
      params.push(contact_id);
    }

    if (payment_method) {
      whereClause += ' AND p.payment_method = ?';
      params.push(payment_method);
    }

    if (from_date) {
      whereClause += ' AND p.payment_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      whereClause += ' AND p.payment_date <= ?';
      params.push(to_date);
    }

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM fee_payments p
      LEFT JOIN fees f ON p.fee_id = f.id
      ${whereClause}
    `;

    const query = `
      SELECT 
        p.*,
        f.contact_id,
        f.description as fee_description,
        c.name as contact_name,
        c.email as contact_email
      FROM fee_payments p
      LEFT JOIN fees f ON p.fee_id = f.id
      LEFT JOIN contacts c ON f.contact_id = c.id
      ${whereClause}
      ORDER BY p.payment_date DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const [countResult, payments] = await Promise.all([
      executeQuery(countQuery, params.slice(0, params.length - 2)),
      executeQuery(query, params)
    ]);

    return {
      payments,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  },

  async findById(id) {
    const query = `
      SELECT 
        p.*,
        f.contact_id,
        f.description as fee_description,
        c.name as contact_name,
        c.email as contact_email
      FROM fee_payments p
      LEFT JOIN fees f ON p.fee_id = f.id
      LEFT JOIN contacts c ON f.contact_id = c.id
      WHERE p.id = ? AND p.status = 'completed'
    `;
    const result = await executeQuery(query, [id]);
    return result[0] || null;
  },

  async create(paymentData) {
    const query = `
      INSERT INTO fee_payments (
        fee_id, amount, payment_date, payment_method,
        reference, notes, processed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const fee = await executeQuery('SELECT contact_id, amount, total_paid FROM fees WHERE id = ?', [paymentData.fee_id]);
    if (!fee.length) throw new Error('Fee not found');

    const params = [
      paymentData.fee_id,
      paymentData.amount,
      paymentData.payment_date || new Date().toISOString(),
      paymentData.payment_method,
      paymentData.reference || null,
      paymentData.notes || null,
      paymentData.processed_by
    ];

    const result = await executeQuery(query, params);
    
    // Update fee status based on payment
    const updatedFee = await this.updateFeeAfterPayment(paymentData.fee_id);
    
    // Record audit log
    await executeQuery(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
       VALUES (?, 'payment_recorded', 'fee_payment', ?, ?)`,
      [paymentData.processed_by, result.insertId, JSON.stringify(paymentData)]
    );

    return this.findById(result.insertId);
  },

  async updateFeeAfterPayment(feeId) {
    const fee = await executeQuery(`
      SELECT amount FROM fees WHERE id = ?
    `, [feeId]);

    if (!fee.length) return null;

    const payments = await executeQuery(`
      SELECT COALESCE(SUM(amount), 0) as total_paid 
      FROM fee_payments 
      WHERE fee_id = ? AND status = 'completed'
    `, [feeId]);

    const totalPaid = payments[0].total_paid;
    let newStatus = 'pending';

    if (totalPaid >= fee[0].amount) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partial';
    }

    await executeQuery(`
      UPDATE fees 
      SET status = ?, total_paid = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [newStatus, totalPaid, feeId]);

    return { feeId, status: newStatus, totalPaid };
  },

  async getPaymentStats(filters = {}) {
    const { from_date, to_date, vertical_id } = filters;

    let whereClause = 'WHERE p.status = "completed"';
    const params = [];

    if (from_date) {
      whereClause += ' AND p.payment_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      whereClause += ' AND p.payment_date <= ?';
      params.push(to_date);
    }

    if (vertical_id) {
      whereClause += ' AND f.vertical_id = ?';
      params.push(vertical_id);
    }

    const query = `
      SELECT 
        COUNT(*) as total_payments,
        SUM(p.amount) as total_amount,
        p.payment_method,
        COUNT(DISTINCT f.contact_id) as unique_payers
      FROM fee_payments p
      LEFT JOIN fees f ON p.fee_id = f.id
      ${whereClause}
      GROUP BY p.payment_method
      ORDER BY total_amount DESC
    `;

    return executeQuery(query, params);
  }
};

export default FeePayment;