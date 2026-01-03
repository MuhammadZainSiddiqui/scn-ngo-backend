import { executeQuery } from '../config/database.js';

const KPI_STATUSES = ['on_track', 'at_risk', 'behind', 'achieved'];
const KPI_FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one_time'];

const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const calculateProgressPercent = (currentValue, targetValue) => {
  const current = toNumber(currentValue);
  const target = toNumber(targetValue);
  if (current === null || target === null || target === 0) return null;

  const percent = (current / target) * 100;
  return Math.max(0, Math.min(100, percent));
};

const inferStatus = ({ current_value, target_value }) => {
  const current = toNumber(current_value);
  const target = toNumber(target_value);
  if (current === null || target === null || target === 0) return 'on_track';

  if (current >= target) return 'achieved';

  const ratio = current / target;
  if (ratio >= 0.8) return 'on_track';
  if (ratio >= 0.5) return 'at_risk';
  return 'behind';
};

const mapKpiRow = (row) => {
  if (!row) return row;
  const currentValue = toNumber(row.current_value) ?? 0;
  const targetValue = toNumber(row.target_value);

  return {
    ...row,
    target_value: targetValue,
    current_value: currentValue,
    progress_percentage: calculateProgressPercent(currentValue, targetValue),
  };
};

export const Kpi = {
  KPI_STATUSES,
  KPI_FREQUENCIES,
  calculateProgressPercent,
  inferStatus,

  async findAll(options = {}) {
    const {
      page = 1,
      limit = 25,
      program_id,
      vertical_id,
      status,
      search,
      sort = 'k.updated_at',
      order = 'desc',
    } = options;

    const offset = (page - 1) * limit;
    const whereConditions = ['1=1'];
    const params = [];

    if (program_id) {
      whereConditions.push('k.program_id = ?');
      params.push(program_id);
    }

    if (vertical_id) {
      whereConditions.push('p.vertical_id = ?');
      params.push(vertical_id);
    }

    if (status) {
      whereConditions.push('k.status = ?');
      params.push(status);
    }

    if (search) {
      whereConditions.push('(k.kpi_name LIKE ? OR k.description LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM program_kpis k
      LEFT JOIN programs p ON k.program_id = p.id
      ${whereClause}
    `;

    const [countRow] = await executeQuery(countQuery, params);
    const total = countRow?.total ?? 0;

    const query = `
      SELECT
        k.*,
        p.name as program_name,
        p.vertical_id,
        v.name as vertical_name
      FROM program_kpis k
      LEFT JOIN programs p ON k.program_id = p.id
      LEFT JOIN verticals v ON p.vertical_id = v.id
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT ? OFFSET ?
    `;

    const rows = await executeQuery(query, [...params, limit, offset]);

    return {
      data: rows.map(mapKpiRow),
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
        k.*,
        p.name as program_name,
        p.vertical_id,
        v.name as vertical_name
      FROM program_kpis k
      LEFT JOIN programs p ON k.program_id = p.id
      LEFT JOIN verticals v ON p.vertical_id = v.id
      WHERE k.id = ?
    `;

    const results = await executeQuery(query, [id]);
    return mapKpiRow(results[0] || null);
  },

  async findByProgram(programId, options = {}) {
    return this.findAll({ ...options, program_id: programId });
  },

  async create(kpiData) {
    const status = kpiData.status || inferStatus(kpiData);

    const query = `
      INSERT INTO program_kpis (
        program_id, kpi_name, description,
        target_value, current_value, unit,
        measurement_frequency, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      kpiData.program_id,
      kpiData.kpi_name,
      kpiData.description || null,
      kpiData.target_value ?? null,
      kpiData.current_value ?? 0,
      kpiData.unit || null,
      kpiData.measurement_frequency || 'monthly',
      status,
    ];

    const result = await executeQuery(query, params);
    return this.findById(result.insertId);
  },

  async update(id, updateData) {
    const allowedFields = [
      'kpi_name',
      'description',
      'target_value',
      'current_value',
      'unit',
      'measurement_frequency',
      'status',
    ];

    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(updateData[field]);
      }
    }

    if (!updates.length) {
      return this.findById(id);
    }

    if (updateData.status === undefined && (updateData.current_value !== undefined || updateData.target_value !== undefined)) {
      const existing = await this.findById(id);
      if (existing) {
        const merged = {
          current_value: updateData.current_value ?? existing.current_value,
          target_value: updateData.target_value ?? existing.target_value,
        };
        updates.push('status = ?');
        params.push(inferStatus(merged));
      }
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = `UPDATE program_kpis SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    return this.findById(id);
  },

  async updateProgress(id, { current_value, status } = {}) {
    const existing = await this.findById(id);
    if (!existing) throw new Error('KPI not found');

    const next = {
      current_value: current_value ?? existing.current_value,
      target_value: existing.target_value,
    };

    const finalStatus = status || inferStatus(next);

    const query = `
      UPDATE program_kpis
      SET current_value = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [current_value ?? existing.current_value, finalStatus, id]);
    return this.findById(id);
  },

  async delete(id) {
    const existing = await this.findById(id);
    if (!existing) throw new Error('KPI not found');

    await executeQuery('DELETE FROM program_kpis WHERE id = ?', [id]);
    return existing;
  },

  async getStatistics(options = {}) {
    const { program_id, vertical_id } = options;

    const whereConditions = ['1=1'];
    const params = [];

    if (program_id) {
      whereConditions.push('k.program_id = ?');
      params.push(program_id);
    }

    if (vertical_id) {
      whereConditions.push('p.vertical_id = ?');
      params.push(vertical_id);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT
        COUNT(*) as total_kpis,
        SUM(CASE WHEN k.status = 'on_track' THEN 1 ELSE 0 END) as on_track,
        SUM(CASE WHEN k.status = 'at_risk' THEN 1 ELSE 0 END) as at_risk,
        SUM(CASE WHEN k.status = 'behind' THEN 1 ELSE 0 END) as behind,
        SUM(CASE WHEN k.status = 'achieved' THEN 1 ELSE 0 END) as achieved,
        COALESCE(AVG(CASE WHEN k.target_value IS NULL OR k.target_value = 0 THEN NULL ELSE (k.current_value / k.target_value) * 100 END), 0) as avg_progress
      FROM program_kpis k
      LEFT JOIN programs p ON k.program_id = p.id
      ${whereClause}
    `;

    const [row] = await executeQuery(query, params);

    return {
      total_kpis: Number(row?.total_kpis ?? 0),
      by_status: {
        on_track: Number(row?.on_track ?? 0),
        at_risk: Number(row?.at_risk ?? 0),
        behind: Number(row?.behind ?? 0),
        achieved: Number(row?.achieved ?? 0),
      },
      avg_progress_percentage: Math.max(0, Math.min(100, toNumber(row?.avg_progress) ?? 0)),
    };
  },
};

export default Kpi;
