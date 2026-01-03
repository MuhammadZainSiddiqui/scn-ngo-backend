import { executeQuery } from '../config/database.js';

export const VolunteerAssignment = {
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      volunteer_id,
      program_id,
      vertical_id,
      status,
      active,
      sort = 'va.created_at',
      order = 'desc',
    } = options;

    const offset = (page - 1) * limit;
    const whereConditions = ['1=1'];
    const params = [];

    if (volunteer_id) {
      whereConditions.push('va.volunteer_id = ?');
      params.push(volunteer_id);
    }

    if (program_id) {
      whereConditions.push('va.program_id = ?');
      params.push(program_id);
    }

    if (vertical_id) {
      whereConditions.push('p.vertical_id = ?');
      params.push(vertical_id);
    }

    if (status) {
      whereConditions.push('va.status = ?');
      params.push(status);
    }

    if (active !== undefined) {
      if (active) {
        whereConditions.push('va.status = "active" AND (va.end_date IS NULL OR va.end_date >= CURDATE())');
      } else {
        whereConditions.push('(va.status != "active" OR (va.end_date IS NOT NULL AND va.end_date < CURDATE()))');
      }
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM volunteer_assignments va
      LEFT JOIN programs p ON va.program_id = p.id
      ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, params);
    const total = countResult[0]?.total ?? 0;

    const query = `
      SELECT
        va.*,
        v.first_name as volunteer_first_name,
        v.last_name as volunteer_last_name,
        v.email as volunteer_email,
        v.phone as volunteer_phone,
        p.name as program_name,
        p.vertical_id as program_vertical_id,
        vt.name as vertical_name,
        COALESCE(h.total_hours, 0) as total_hours
      FROM volunteer_assignments va
      LEFT JOIN volunteers v ON va.volunteer_id = v.id
      LEFT JOIN programs p ON va.program_id = p.id
      LEFT JOIN verticals vt ON p.vertical_id = vt.id
      LEFT JOIN (
        SELECT volunteer_id, program_id, COALESCE(SUM(hours), 0) as total_hours
        FROM volunteer_hours
        GROUP BY volunteer_id, program_id
      ) h ON h.volunteer_id = va.volunteer_id AND h.program_id = va.program_id
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT ? OFFSET ?
    `;

    const data = await executeQuery(query, [...params, limit, offset]);

    return {
      data: data.map((row) => ({
        ...row,
        total_hours: parseFloat(row.total_hours),
      })),
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
        va.*,
        v.first_name as volunteer_first_name,
        v.last_name as volunteer_last_name,
        v.email as volunteer_email,
        v.phone as volunteer_phone,
        p.name as program_name,
        p.vertical_id as program_vertical_id,
        vt.name as vertical_name,
        COALESCE(h.total_hours, 0) as total_hours
      FROM volunteer_assignments va
      LEFT JOIN volunteers v ON va.volunteer_id = v.id
      LEFT JOIN programs p ON va.program_id = p.id
      LEFT JOIN verticals vt ON p.vertical_id = vt.id
      LEFT JOIN (
        SELECT volunteer_id, program_id, COALESCE(SUM(hours), 0) as total_hours
        FROM volunteer_hours
        GROUP BY volunteer_id, program_id
      ) h ON h.volunteer_id = va.volunteer_id AND h.program_id = va.program_id
      WHERE va.id = ?
    `;

    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async findByVolunteer(volunteerId) {
    const query = `
      SELECT
        va.*,
        p.name as program_name,
        p.vertical_id as program_vertical_id,
        vt.name as vertical_name,
        COALESCE(h.total_hours, 0) as total_hours
      FROM volunteer_assignments va
      LEFT JOIN programs p ON va.program_id = p.id
      LEFT JOIN verticals vt ON p.vertical_id = vt.id
      LEFT JOIN (
        SELECT volunteer_id, program_id, COALESCE(SUM(hours), 0) as total_hours
        FROM volunteer_hours
        GROUP BY volunteer_id, program_id
      ) h ON h.volunteer_id = va.volunteer_id AND h.program_id = va.program_id
      WHERE va.volunteer_id = ?
      ORDER BY va.start_date DESC, va.created_at DESC
    `;

    const results = await executeQuery(query, [volunteerId]);
    return results.map((row) => ({ ...row, total_hours: parseFloat(row.total_hours) }));
  },

  async create(assignmentData) {
    const query = `
      INSERT INTO volunteer_assignments (
        volunteer_id, program_id, start_date, end_date, status, assigned_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      assignmentData.volunteer_id,
      assignmentData.program_id,
      assignmentData.start_date,
      assignmentData.end_date || null,
      assignmentData.status || 'active',
      assignmentData.assigned_by || null,
    ];

    const result = await executeQuery(query, params);
    return this.findById(result.insertId);
  },

  async update(id, updateData) {
    const allowedFields = ['start_date', 'end_date', 'status', 'notes'];

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

    const query = `UPDATE volunteer_assignments SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    return this.findById(id);
  },

  async deactivate(id) {
    const query = 'UPDATE volunteer_assignments SET status = "inactive", updated_at = NOW() WHERE id = ?';
    await executeQuery(query, [id]);
    return true;
  },
};

export default VolunteerAssignment;
