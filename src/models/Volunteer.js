import { executeQuery } from '../config/database.js';

const BURNOUT_THRESHOLDS = {
  medium: 40,
  high: 80,
};

const buildInsuranceWhereCondition = (insuranceStatus, whereConditions) => {
  if (!insuranceStatus) return;

  switch (insuranceStatus) {
    case 'none':
      whereConditions.push('v.insurance_expiry_date IS NULL');
      break;
    case 'expired':
      whereConditions.push('v.insurance_expiry_date IS NOT NULL AND v.insurance_expiry_date < CURDATE()');
      break;
    case 'expiring':
    case 'expiring_soon':
      whereConditions.push(
        'v.insurance_expiry_date IS NOT NULL AND v.insurance_expiry_date >= CURDATE() AND v.insurance_expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)'
      );
      break;
    case 'active':
      whereConditions.push(
        'v.insurance_expiry_date IS NOT NULL AND v.insurance_expiry_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY)'
      );
      break;
    default:
      break;
  }
};

const buildBurnoutWhereCondition = (burnoutRisk, whereConditions) => {
  if (!burnoutRisk) return;

  const hoursExpr = 'COALESCE(h.hours_28_days, 0)';

  switch (burnoutRisk) {
    case 'low':
      whereConditions.push(`${hoursExpr} < ${BURNOUT_THRESHOLDS.medium}`);
      break;
    case 'medium':
      whereConditions.push(`${hoursExpr} >= ${BURNOUT_THRESHOLDS.medium} AND ${hoursExpr} < ${BURNOUT_THRESHOLDS.high}`);
      break;
    case 'high':
      whereConditions.push(`${hoursExpr} >= ${BURNOUT_THRESHOLDS.high}`);
      break;
    default:
      break;
  }
};

export const Volunteer = {
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      vertical_id,
      status,
      tier,
      insurance_status,
      burnout_risk,
      search,
      sort = 'v.created_at',
      order = 'desc',
    } = options;

    const offset = (page - 1) * limit;
    const whereConditions = ['1=1'];
    const params = [];

    if (vertical_id) {
      whereConditions.push('v.vertical_id = ?');
      params.push(vertical_id);
    }

    if (status) {
      whereConditions.push('v.status = ?');
      params.push(status);
    }

    if (tier) {
      whereConditions.push('v.tier = ?');
      params.push(tier);
    }

    if (search) {
      whereConditions.push(
        '(v.first_name LIKE ? OR v.last_name LIKE ? OR v.email LIKE ? OR v.phone LIKE ?)'
      );
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    buildInsuranceWhereCondition(insurance_status, whereConditions);
    buildBurnoutWhereCondition(burnout_risk, whereConditions);

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM volunteers v
      LEFT JOIN (
        SELECT volunteer_id, COALESCE(SUM(hours), 0) as hours_28_days
        FROM volunteer_hours
        WHERE work_date >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
        GROUP BY volunteer_id
      ) h ON h.volunteer_id = v.id
      ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, params);
    const total = countResult[0]?.total ?? 0;

    const query = `
      SELECT 
        v.*,
        vt.name as vertical_name,
        COALESCE(h.hours_28_days, 0) as hours_last_28_days,
        CASE
          WHEN COALESCE(h.hours_28_days, 0) >= ${BURNOUT_THRESHOLDS.high} THEN 'high'
          WHEN COALESCE(h.hours_28_days, 0) >= ${BURNOUT_THRESHOLDS.medium} THEN 'medium'
          ELSE 'low'
        END as burnout_risk,
        CASE
          WHEN v.insurance_expiry_date IS NULL THEN 'none'
          WHEN v.insurance_expiry_date < CURDATE() THEN 'expired'
          WHEN v.insurance_expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'expiring'
          ELSE 'active'
        END as insurance_compliance_status,
        CASE
          WHEN v.insurance_expiry_date IS NOT NULL AND v.insurance_expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1
          ELSE 0
        END as insurance_alert
      FROM volunteers v
      LEFT JOIN verticals vt ON v.vertical_id = vt.id
      LEFT JOIN (
        SELECT volunteer_id, COALESCE(SUM(hours), 0) as hours_28_days
        FROM volunteer_hours
        WHERE work_date >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
        GROUP BY volunteer_id
      ) h ON h.volunteer_id = v.id
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT ? OFFSET ?
    `;

    const data = await executeQuery(query, [...params, limit, offset]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(id) {
    const query = `
      SELECT 
        v.*,
        vt.name as vertical_name,
        COALESCE(h.hours_28_days, 0) as hours_last_28_days,
        CASE
          WHEN COALESCE(h.hours_28_days, 0) >= ${BURNOUT_THRESHOLDS.high} THEN 'high'
          WHEN COALESCE(h.hours_28_days, 0) >= ${BURNOUT_THRESHOLDS.medium} THEN 'medium'
          ELSE 'low'
        END as burnout_risk,
        CASE
          WHEN v.insurance_expiry_date IS NULL THEN 'none'
          WHEN v.insurance_expiry_date < CURDATE() THEN 'expired'
          WHEN v.insurance_expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'expiring'
          ELSE 'active'
        END as insurance_compliance_status,
        CASE
          WHEN v.insurance_expiry_date IS NOT NULL AND v.insurance_expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1
          ELSE 0
        END as insurance_alert
      FROM volunteers v
      LEFT JOIN verticals vt ON v.vertical_id = vt.id
      LEFT JOIN (
        SELECT volunteer_id, COALESCE(SUM(hours), 0) as hours_28_days
        FROM volunteer_hours
        WHERE work_date >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
        GROUP BY volunteer_id
      ) h ON h.volunteer_id = v.id
      WHERE v.id = ?
    `;

    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async create(volunteerData) {
    const query = `
      INSERT INTO volunteers (
        first_name, last_name, email, phone, address,
        tier, status, vertical_id,
        insurance_provider, insurance_policy_number, insurance_expiry_date,
        emergency_contact_name, emergency_contact_phone,
        notes,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      volunteerData.first_name,
      volunteerData.last_name,
      volunteerData.email || null,
      volunteerData.phone || null,
      volunteerData.address || null,
      volunteerData.tier || null,
      volunteerData.status || 'active',
      volunteerData.vertical_id || null,
      volunteerData.insurance_provider || null,
      volunteerData.insurance_policy_number || null,
      volunteerData.insurance_expiry_date || null,
      volunteerData.emergency_contact_name || null,
      volunteerData.emergency_contact_phone || null,
      volunteerData.notes || null,
    ];

    const result = await executeQuery(query, params);
    return this.findById(result.insertId);
  },

  async update(id, updateData) {
    const allowedFields = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'address',
      'tier',
      'status',
      'vertical_id',
      'insurance_provider',
      'insurance_policy_number',
      'insurance_expiry_date',
      'emergency_contact_name',
      'emergency_contact_phone',
      'notes',
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
      return this.findById(id);
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    const query = `UPDATE volunteers SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    return this.findById(id);
  },

  async deactivate(id) {
    const query = 'UPDATE volunteers SET status = "inactive", updated_at = NOW() WHERE id = ?';
    await executeQuery(query, [id]);
    return true;
  },

  async checkEmailExists(email, excludeId = null) {
    if (!email) return false;

    let query = 'SELECT id FROM volunteers WHERE email = ?';
    const params = [email];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const results = await executeQuery(query, params);
    return results.length > 0;
  },

  async checkPhoneExists(phone, excludeId = null) {
    if (!phone) return false;

    let query = 'SELECT id FROM volunteers WHERE phone = ?';
    const params = [phone];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const results = await executeQuery(query, params);
    return results.length > 0;
  },

  async getStats(options = {}) {
    const { vertical_id } = options;

    const where = [];
    const params = [];

    if (vertical_id) {
      where.push('v.vertical_id = ?');
      params.push(vertical_id);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const statsQuery = `
      SELECT
        COUNT(*) as total_volunteers,
        SUM(CASE WHEN v.status = 'active' THEN 1 ELSE 0 END) as active_volunteers,
        SUM(CASE WHEN v.status = 'inactive' THEN 1 ELSE 0 END) as inactive_volunteers,
        SUM(CASE WHEN v.insurance_expiry_date IS NULL THEN 1 ELSE 0 END) as insurance_none,
        SUM(CASE WHEN v.insurance_expiry_date IS NOT NULL AND v.insurance_expiry_date < CURDATE() THEN 1 ELSE 0 END) as insurance_expired,
        SUM(CASE WHEN v.insurance_expiry_date IS NOT NULL AND v.insurance_expiry_date >= CURDATE() AND v.insurance_expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as insurance_expiring,
        SUM(CASE WHEN v.insurance_expiry_date IS NOT NULL AND v.insurance_expiry_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as insurance_active
      FROM volunteers v
      ${whereClause}
    `;

    const [stats] = await executeQuery(statsQuery, params);

    const hoursQuery = `
      SELECT COALESCE(SUM(vh.hours), 0) as total_hours
      FROM volunteer_hours vh
      LEFT JOIN volunteers v ON vh.volunteer_id = v.id
      ${whereClause.replace('v.', 'v.')}
    `;

    const [hours] = await executeQuery(hoursQuery, params);

    return {
      ...stats,
      total_hours: parseFloat(hours?.total_hours ?? 0),
    };
  },
};

export default Volunteer;
