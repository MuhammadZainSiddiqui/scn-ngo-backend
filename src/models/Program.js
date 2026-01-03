import { executeQuery } from '../config/database.js';

const PROGRAM_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];

const normalizeStatus = (status) => {
  if (!status) return status;
  if (status === 'suspended') return 'on_hold';
  return status;
};

const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const mapProgramRow = (row) => {
  if (!row) return row;

  const budget = toNumber(row.budget) ?? 0;
  const spent = toNumber(row.spent_amount) ?? 0;
  const donatedTotal = toNumber(row.donations_total) ?? 0;

  return {
    ...row,
    budget,
    spent_amount: spent,
    remaining_budget: toNumber(row.remaining_budget) ?? budget - spent,
    donations_total: donatedTotal,
    kpi_count: row.kpi_count !== undefined ? Number(row.kpi_count) : undefined,
    kpi_achieved_count: row.kpi_achieved_count !== undefined ? Number(row.kpi_achieved_count) : undefined,
    volunteer_count: row.volunteer_count !== undefined ? Number(row.volunteer_count) : undefined,
  };
};

export const Program = {
  PROGRAM_STATUSES,
  normalizeStatus,

  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      vertical_id,
      status,
      date_from,
      date_to,
      search,
      sort = 'p.created_at',
      order = 'desc',
    } = options;

    const offset = (page - 1) * limit;
    const whereConditions = ['1=1'];
    const params = [];

    if (vertical_id) {
      whereConditions.push('p.vertical_id = ?');
      params.push(vertical_id);
    }

    if (status) {
      const normalized = normalizeStatus(status);
      whereConditions.push('p.status = ?');
      params.push(normalized);
    }

    if (date_from) {
      whereConditions.push('(p.start_date IS NULL OR p.start_date >= ?)');
      params.push(date_from);
    }

    if (date_to) {
      whereConditions.push('(p.end_date IS NULL OR p.end_date <= ?)');
      params.push(date_to);
    }

    if (search) {
      whereConditions.push('(p.name LIKE ? OR p.code LIKE ? OR p.description LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const countQuery = `SELECT COUNT(*) as total FROM programs p ${whereClause}`;
    const [countRow] = await executeQuery(countQuery, params);
    const total = countRow?.total ?? 0;

    const query = `
      SELECT
        p.*, 
        v.name as vertical_name,
        mu.first_name as manager_first_name,
        mu.last_name as manager_last_name,
        cu.first_name as created_by_first_name,
        cu.last_name as created_by_last_name,
        (p.budget - p.spent_amount) as remaining_budget,
        COALESCE(k.kpi_count, 0) as kpi_count,
        COALESCE(k.kpi_achieved_count, 0) as kpi_achieved_count,
        COALESCE(vol.volunteer_count, 0) as volunteer_count,
        (COALESCE(dd.direct_donations, 0) + COALESCE(ad.allocated_donations, 0)) as donations_total
      FROM programs p
      LEFT JOIN verticals v ON p.vertical_id = v.id
      LEFT JOIN users mu ON p.manager_user_id = mu.id
      LEFT JOIN users cu ON p.created_by = cu.id
      LEFT JOIN (
        SELECT program_id, COUNT(*) as kpi_count, SUM(CASE WHEN status = 'achieved' THEN 1 ELSE 0 END) as kpi_achieved_count
        FROM program_kpis
        GROUP BY program_id
      ) k ON k.program_id = p.id
      LEFT JOIN (
        SELECT program_id, COUNT(DISTINCT volunteer_id) as volunteer_count
        FROM volunteer_assignments
        GROUP BY program_id
      ) vol ON vol.program_id = p.id
      LEFT JOIN (
        SELECT program_id, COALESCE(SUM(amount), 0) as direct_donations
        FROM donations
        WHERE program_id IS NOT NULL AND payment_status = 'received'
        GROUP BY program_id
      ) dd ON dd.program_id = p.id
      LEFT JOIN (
        SELECT da.program_id, COALESCE(SUM(da.amount), 0) as allocated_donations
        FROM donation_allocations da
        LEFT JOIN donations d ON da.donation_id = d.id
        WHERE da.program_id IS NOT NULL AND (d.payment_status = 'received' OR d.payment_status IS NULL)
        GROUP BY da.program_id
      ) ad ON ad.program_id = p.id
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT ? OFFSET ?
    `;

    const data = await executeQuery(query, [...params, limit, offset]);

    return {
      data: data.map(mapProgramRow),
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
        p.*,
        v.name as vertical_name,
        mu.first_name as manager_first_name,
        mu.last_name as manager_last_name,
        cu.first_name as created_by_first_name,
        cu.last_name as created_by_last_name,
        (p.budget - p.spent_amount) as remaining_budget,
        COALESCE(k.kpi_count, 0) as kpi_count,
        COALESCE(k.kpi_achieved_count, 0) as kpi_achieved_count,
        COALESCE(vol.volunteer_count, 0) as volunteer_count,
        (COALESCE(dd.direct_donations, 0) + COALESCE(ad.allocated_donations, 0)) as donations_total
      FROM programs p
      LEFT JOIN verticals v ON p.vertical_id = v.id
      LEFT JOIN users mu ON p.manager_user_id = mu.id
      LEFT JOIN users cu ON p.created_by = cu.id
      LEFT JOIN (
        SELECT program_id, COUNT(*) as kpi_count, SUM(CASE WHEN status = 'achieved' THEN 1 ELSE 0 END) as kpi_achieved_count
        FROM program_kpis
        GROUP BY program_id
      ) k ON k.program_id = p.id
      LEFT JOIN (
        SELECT program_id, COUNT(DISTINCT volunteer_id) as volunteer_count
        FROM volunteer_assignments
        GROUP BY program_id
      ) vol ON vol.program_id = p.id
      LEFT JOIN (
        SELECT program_id, COALESCE(SUM(amount), 0) as direct_donations
        FROM donations
        WHERE program_id IS NOT NULL AND payment_status = 'received'
        GROUP BY program_id
      ) dd ON dd.program_id = p.id
      LEFT JOIN (
        SELECT da.program_id, COALESCE(SUM(da.amount), 0) as allocated_donations
        FROM donation_allocations da
        LEFT JOIN donations d ON da.donation_id = d.id
        WHERE da.program_id IS NOT NULL AND (d.payment_status = 'received' OR d.payment_status IS NULL)
        GROUP BY da.program_id
      ) ad ON ad.program_id = p.id
      WHERE p.id = ?
    `;

    const results = await executeQuery(query, [id]);
    return mapProgramRow(results[0] || null);
  },

  async generateProgramCode(name) {
    const base = String(name || 'PROGRAM')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24);

    const today = new Date();
    const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const code = `${base}_${datePart}_${suffix}`.slice(0, 50);
      const exists = await executeQuery('SELECT id FROM programs WHERE code = ? LIMIT 1', [code]);
      if (!exists.length) return code;
    }

    return `${base}_${datePart}_${Date.now()}`.slice(0, 50);
  },

  async create(programData) {
    const code = programData.code || (await this.generateProgramCode(programData.name));

    const query = `
      INSERT INTO programs (
        name, code, description, vertical_id,
        start_date, end_date, budget, spent_amount, status,
        manager_user_id, location, beneficiary_target, beneficiary_reached,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      programData.name,
      code,
      programData.description || null,
      programData.vertical_id,
      programData.start_date || null,
      programData.end_date || null,
      programData.budget ?? 0,
      programData.spent_amount ?? 0,
      normalizeStatus(programData.status) || 'planning',
      programData.manager_user_id || null,
      programData.location || null,
      programData.beneficiary_target ?? 0,
      programData.beneficiary_reached ?? 0,
      programData.created_by,
    ];

    const result = await executeQuery(query, params);
    return this.findById(result.insertId);
  },

  async update(id, updateData) {
    const allowedFields = [
      'name',
      'code',
      'description',
      'vertical_id',
      'start_date',
      'end_date',
      'budget',
      'spent_amount',
      'status',
      'manager_user_id',
      'location',
      'beneficiary_target',
      'beneficiary_reached',
    ];

    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        const value = field === 'status' ? normalizeStatus(updateData[field]) : updateData[field];
        updates.push(`${field} = ?`);
        params.push(value);
      }
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = `UPDATE programs SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    return this.findById(id);
  },

  async updateStatus(id, status) {
    const normalized = normalizeStatus(status);
    if (normalized && !PROGRAM_STATUSES.includes(normalized)) {
      throw new Error('Invalid program status');
    }

    const query = `UPDATE programs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await executeQuery(query, [normalized, id]);
    return this.findById(id);
  },

  async archive(id) {
    const query = `UPDATE programs SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await executeQuery(query, [id]);
    return this.findById(id);
  },

  async delete(id) {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Program not found');

    await executeQuery('DELETE FROM programs WHERE id = ?', [id]);
    return existing;
  },

  async getBudgetInfo(programId) {
    const program = await this.findById(programId);
    if (!program) return null;

    const [directRow] = await executeQuery(
      `
        SELECT
          COUNT(*) as donation_count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM donations
        WHERE program_id = ? AND payment_status = 'received'
      `,
      [programId]
    );

    const [allocatedRow] = await executeQuery(
      `
        SELECT
          COUNT(*) as allocation_count,
          COALESCE(SUM(da.amount), 0) as total_amount
        FROM donation_allocations da
        LEFT JOIN donations d ON da.donation_id = d.id
        WHERE da.program_id = ? AND (d.payment_status = 'received' OR d.payment_status IS NULL)
      `,
      [programId]
    );

    const directTotal = toNumber(directRow?.total_amount) ?? 0;
    const allocatedTotal = toNumber(allocatedRow?.total_amount) ?? 0;

    const budget = program.budget ?? 0;
    const spent = program.spent_amount ?? 0;

    return {
      program_id: programId,
      budget,
      spent_amount: spent,
      remaining_budget: budget - spent,
      funding_received: directTotal + allocatedTotal,
      funding_received_breakdown: {
        direct_donations: {
          count: Number(directRow?.donation_count ?? 0),
          total: directTotal,
        },
        allocated_donations: {
          count: Number(allocatedRow?.allocation_count ?? 0),
          total: allocatedTotal,
        },
      },
      funding_gap: budget - (directTotal + allocatedTotal),
    };
  },

  async getVolunteers(programId, options = {}) {
    const { page = 1, limit = 25 } = options;
    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM volunteer_assignments va
      WHERE va.program_id = ?
    `;
    const [countRow] = await executeQuery(countQuery, [programId]);
    const total = countRow?.total ?? 0;

    const query = `
      SELECT
        va.*,
        v.first_name as volunteer_first_name,
        v.last_name as volunteer_last_name,
        v.email as volunteer_email,
        v.phone as volunteer_phone,
        COALESCE(h.total_hours, 0) as total_hours
      FROM volunteer_assignments va
      LEFT JOIN volunteers v ON va.volunteer_id = v.id
      LEFT JOIN (
        SELECT volunteer_id, program_id, COALESCE(SUM(hours), 0) as total_hours
        FROM volunteer_hours
        GROUP BY volunteer_id, program_id
      ) h ON h.volunteer_id = va.volunteer_id AND h.program_id = va.program_id
      WHERE va.program_id = ?
      ORDER BY va.start_date DESC, va.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await executeQuery(query, [programId, limit, offset]);

    return {
      data: rows.map((row) => ({ ...row, total_hours: toNumber(row.total_hours) ?? 0 })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getDonations(programId, options = {}) {
    const { page = 1, limit = 25 } = options;
    const offset = (page - 1) * limit;

    const directQuery = `
      SELECT
        d.id as donation_id,
        NULL as allocation_id,
        'direct' as link_type,
        d.donation_number,
        d.amount,
        d.currency,
        d.donation_date,
        d.payment_status,
        d.donor_id,
        c.first_name as donor_first_name,
        c.last_name as donor_last_name,
        c.organization_name as donor_organization,
        c.email as donor_email,
        c.phone as donor_phone
      FROM donations d
      LEFT JOIN contacts c ON d.donor_id = c.id
      WHERE d.program_id = ?
      ORDER BY d.donation_date DESC, d.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const allocationQuery = `
      SELECT
        d.id as donation_id,
        da.id as allocation_id,
        'allocation' as link_type,
        d.donation_number,
        da.amount,
        d.currency,
        d.donation_date,
        d.payment_status,
        d.donor_id,
        c.first_name as donor_first_name,
        c.last_name as donor_last_name,
        c.organization_name as donor_organization,
        c.email as donor_email,
        c.phone as donor_phone
      FROM donation_allocations da
      LEFT JOIN donations d ON da.donation_id = d.id
      LEFT JOIN contacts c ON d.donor_id = c.id
      WHERE da.program_id = ?
      ORDER BY d.donation_date DESC, da.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [directRows, allocationRows] = await Promise.all([
      executeQuery(directQuery, [programId, limit, offset]),
      executeQuery(allocationQuery, [programId, limit, offset]),
    ]);

    return {
      direct: directRows.map((row) => ({ ...row, amount: toNumber(row.amount) ?? 0 })),
      allocations: allocationRows.map((row) => ({ ...row, amount: toNumber(row.amount) ?? 0 })),
      pagination: {
        page,
        limit,
      },
    };
  },

  async getSummaryStats(options = {}) {
    const { vertical_id } = options;

    const whereConditions = ['1=1'];
    const params = [];

    if (vertical_id) {
      whereConditions.push('p.vertical_id = ?');
      params.push(vertical_id);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT
        COUNT(*) as total_programs,
        SUM(CASE WHEN p.status = 'active' THEN 1 ELSE 0 END) as active_programs,
        SUM(CASE WHEN p.status = 'planning' THEN 1 ELSE 0 END) as planning_programs,
        SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed_programs,
        SUM(CASE WHEN p.status IN ('on_hold', 'cancelled') THEN 1 ELSE 0 END) as inactive_programs,
        COALESCE(SUM(p.budget), 0) as total_budget,
        COALESCE(SUM(p.spent_amount), 0) as total_spent,
        COALESCE(SUM(p.budget - p.spent_amount), 0) as total_remaining
      FROM programs p
      ${whereClause}
    `;

    const [row] = await executeQuery(query, params);

    return {
      total_programs: Number(row?.total_programs ?? 0),
      active_programs: Number(row?.active_programs ?? 0),
      planning_programs: Number(row?.planning_programs ?? 0),
      completed_programs: Number(row?.completed_programs ?? 0),
      inactive_programs: Number(row?.inactive_programs ?? 0),
      total_budget: toNumber(row?.total_budget) ?? 0,
      total_spent: toNumber(row?.total_spent) ?? 0,
      total_remaining: toNumber(row?.total_remaining) ?? 0,
    };
  },
};

export default Program;
