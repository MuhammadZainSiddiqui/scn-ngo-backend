import { executeQuery } from '../config/database.js';

export const FeePlan = {
  async findAll(filters = {}, pagination = {}) {
    const { vertical_id, search } = filters;
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE status = "active"';
    const params = [];

    if (vertical_id) {
      whereClause += ' AND vertical_id = ?';
      params.push(vertical_id);
    }

    if (search) {
      whereClause += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM fee_plans 
      ${whereClause}
    `;

    const query = `
      SELECT fp.*, v.name as vertical_name
      FROM fee_plans fp
      LEFT JOIN verticals v ON fp.vertical_id = v.id
      ${whereClause}
      ORDER BY fp.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const [countResult, plans] = await Promise.all([
      executeQuery(countQuery, params.slice(0, params.length - 2)),
      executeQuery(query, params)
    ]);

    return {
      plans,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  },

  async findById(id) {
    const query = `
      SELECT fp.*, v.name as vertical_name
      FROM fee_plans fp
      LEFT JOIN verticals v ON fp.vertical_id = v.id
      WHERE fp.id = ? AND fp.status = 'active'
    `;
    const result = await executeQuery(query, [id]);
    return result[0] || null;
  },

  async create(planData) {
    const query = `
      INSERT INTO fee_plans (
        name, description, fee_type, amount, billing_frequency,
        vertical_id, is_template, template_category, billing_day,
        due_day, grace_period_days, late_fee_amount, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      planData.name,
      planData.description || null,
      planData.fee_type,
      planData.amount,
      planData.billing_frequency || 'monthly',
      planData.vertical_id || null,
      planData.is_template || false,
      planData.template_category || null,
      planData.billing_day || 1,
      planData.due_day || 5,
      planData.grace_period_days || 7,
      planData.late_fee_amount || 0,
      planData.created_by
    ];

    const result = await executeQuery(query, params);
    return this.findById(result.insertId);
  },

  async update(id, planData) {
    const query = `
      UPDATE fee_plans SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        fee_type = COALESCE(?, fee_type),
        amount = COALESCE(?, amount),
        billing_frequency = COALESCE(?, billing_frequency),
        vertical_id = COALESCE(?, vertical_id),
        is_template = COALESCE(?, is_template),
        template_category = COALESCE(?, template_category),
        billing_day = COALESCE(?, billing_day),
        due_day = COALESCE(?, due_day),
        grace_period_days = COALESCE(?, grace_period_days),
        late_fee_amount = COALESCE(?, late_fee_amount),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'active'
    `;

    const params = [
      planData.name,
      planData.description,
      planData.fee_type,
      planData.amount,
      planData.billing_frequency,
      planData.vertical_id,
      planData.is_template,
      planData.template_category,
      planData.billing_day,
      planData.due_day,
      planData.grace_period_days,
      planData.late_fee_amount,
      id
    ];

    await executeQuery(query, params);
    return this.findById(id);
  },

  async delete(id) {
    const query = `
      UPDATE fee_plans SET status = 'inactive' 
      WHERE id = ? AND status = 'active'
    `;
    const result = await executeQuery(query, [id]);
    return result.affectedRows > 0;
  },

  async findTemplates(category) {
    let query = `
      SELECT * FROM fee_plans 
      WHERE is_template = true AND status = 'active'
    `;
    const params = [];

    if (category) {
      query += ' AND template_category = ?';
      params.push(category);
    }

    query += ' ORDER BY name';

    return executeQuery(query, params);
  }
};

export default FeePlan;