import { executeQuery } from '../config/database.js';

export const Staff = {
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      employment_type,
      department,
      vertical_id,
      search,
      sort = 's.created_at',
      order = 'desc',
      burnout_level
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['1=1'];
    let queryParams = [];

    // Apply vertical filtering
    if (vertical_id) {
      whereConditions.push('(u.vertical_id = ? OR s.id IN (SELECT id FROM staff WHERE user_id IN (SELECT id FROM users WHERE vertical_id = ?)))');
      queryParams.push(vertical_id, vertical_id);
    }

    // Build WHERE conditions
    if (status) {
      whereConditions.push('s.status = ?');
      queryParams.push(status);
    }

    if (employment_type) {
      whereConditions.push('s.employment_type = ?');
      queryParams.push(employment_type);
    }

    if (department) {
      whereConditions.push('s.department = ?');
      queryParams.push(department);
    }

    if (burnout_level) {
      whereConditions.push('s.burnout_level = ?');
      queryParams.push(burnout_level);
    }

    if (search) {
      whereConditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR s.designation LIKE ? OR s.department LIKE ? OR s.employee_id LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM staff s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN verticals v ON u.vertical_id = v.id
      WHERE ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    // Main query with JOINs
    const query = `
      SELECT 
        s.*,
        u.first_name, u.last_name, u.email, u.phone, u.role_id, u.vertical_id as user_vertical_id,
        r.name as role_name,
        v.name as vertical_name,
        reporting.first_name as reporting_to_first_name,
        reporting.last_name as reporting_to_last_name,
        CASE 
          WHEN s.burnout_level IS NULL THEN 'low'
          ELSE s.burnout_level
        END as calculated_burnout_level,
        DATEDIFF(
          COALESCE(
            (SELECT MAX(end_date) FROM contracts WHERE staff_id = s.id AND end_date > CURDATE() ORDER BY end_date ASC LIMIT 1),
            DATE_ADD(s.join_date, INTERVAL 365 DAY)
          ),
          CURDATE()
        ) as days_until_contract_expiry
      FROM staff s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN verticals v ON u.vertical_id = v.id
      LEFT JOIN staff reporting_manager ON s.reporting_to = reporting_manager.id
      LEFT JOIN users reporting ON reporting_manager.user_id = reporting.id
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
        s.*,
        u.first_name, u.last_name, u.email, u.phone, u.role_id, u.vertical_id as user_vertical_id, u.is_active as user_active,
        r.name as role_name,
        v.name as vertical_name,
        v.code as vertical_code,
        reporting.first_name as reporting_to_first_name,
        reporting.last_name as reporting_to_last_name,
        reporting.employee_id as reporting_to_employee_id,
        CASE 
          WHEN s.burnout_level IS NULL THEN 'low'
          ELSE s.burnout_level
        END as calculated_burnout_level,
        (SELECT COUNT(*) FROM leave_records lr WHERE lr.staff_id = s.id AND lr.status = 'pending' AND lr.start_date >= CURDATE()) as pending_leaves,
        (SELECT COUNT(*) FROM leave_records lr WHERE lr.staff_id = s.id AND lr.status = 'approved' AND lr.start_date >= CURDATE() AND lr.end_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)) as approved_leaves_next_30_days,
        (SELECT AVG(work_hours) FROM attendance a WHERE a.staff_id = s.id AND a.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND a.status = 'present') as avg_work_hours_last_30_days
      FROM staff s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN verticals v ON u.vertical_id = v.id
      LEFT JOIN staff reporting_manager ON s.reporting_to = reporting_manager.id
      LEFT JOIN users reporting ON reporting_manager.user_id = reporting.id
      WHERE s.id = ?
    `;

    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async findByUserId(userId) {
    const query = `
      SELECT s.*, 
             u.first_name, u.last_name, u.email, u.role_id, u.vertical_id
      FROM staff s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = ?
    `;
    
    const results = await executeQuery(query, [userId]);
    return results[0] || null;
  },

  async findByEmployeeId(employeeId) {
    const query = `
      SELECT s.*, 
             u.first_name, u.last_name, u.email, u.role_id, u.vertical_id
      FROM staff s
      JOIN users u ON s.user_id = u.id
      WHERE s.employee_id = ?
    `;
    
    const results = await executeQuery(query, [employeeId]);
    return results[0] || null;
  },

  async create(staffData) {
    const {
      user_id,
      employee_id,
      join_date,
      employment_type = 'full_time',
      designation,
      department,
      reporting_to,
      salary,
      bank_name,
      bank_account_number,
      bank_ifsc,
      pan_number,
      aadhar_number,
      uan_number,
      esic_number,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,
      blood_group,
      date_of_birth,
      permanent_address,
      current_address,
      burnout_level = 'low',
      notes,
      created_by
    } = staffData;

    const query = `
      INSERT INTO staff (
        user_id, employee_id, join_date, employment_type, designation, department, reporting_to,
        salary, bank_name, bank_account_number, bank_ifsc, pan_number, aadhar_number, 
        uan_number, esic_number, emergency_contact_name, emergency_contact_phone, 
        emergency_contact_relation, blood_group, date_of_birth, permanent_address, 
        current_address, status, burnout_level, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `;

    const params = [
      user_id, employee_id, join_date, employment_type, designation, department, reporting_to,
      salary, bank_name, bank_account_number, bank_ifsc, pan_number, aadhar_number,
      uan_number, esic_number, emergency_contact_name, emergency_contact_phone,
      emergency_contact_relation, blood_group, date_of_birth, permanent_address,
      current_address, burnout_level, created_by
    ];

    const result = await executeQuery(query, params);
    return this.findById(result.insertId);
  },

  async update(id, updateData) {
    const allowedFields = [
      'employment_type', 'designation', 'department', 'reporting_to', 'salary',
      'bank_name', 'bank_account_number', 'bank_ifsc', 'pan_number', 'aadhar_number',
      'uan_number', 'esic_number', 'emergency_contact_name', 'emergency_contact_phone',
      'emergency_contact_relation', 'blood_group', 'date_of_birth', 'permanent_address',
      'current_address', 'burnout_level', 'notes'
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
      UPDATE staff 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, params);
    return this.findById(id);
  },

  async updateStatus(id, status, resignationDate = null, relievingDate = null) {
    let query = `
      UPDATE staff 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    let params = [status, id];

    if (resignationDate) {
      query = `UPDATE staff SET status = ?, resignation_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      params = [status, resignationDate, id];
    }

    if (relievingDate) {
      query = `UPDATE staff SET status = ?, relieving_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      params = [status, relievingDate, id];
    }

    if (resignationDate && relievingDate) {
      query = `UPDATE staff SET status = ?, resignation_date = ?, relieving_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      params = [status, resignationDate, relievingDate, id];
    }

    await executeQuery(query, params);
    return this.findById(id);
  },

  async updateBurnoutLevel(id, burnoutLevel) {
    const query = `
      UPDATE staff 
      SET burnout_level = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [burnoutLevel, id]);
    return this.findById(id);
  },

  async delete(id) {
    // First get the staff record
    const staff = await this.findById(id);
    if (!staff) {
      throw new Error('Staff not found');
    }

    // Soft delete by setting status to resigned
    const query = `
      UPDATE staff 
      SET status = 'resigned', relieving_date = CURDATE(), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [id]);
    return staff;
  },

  async search(searchTerm) {
    const query = `
      SELECT 
        s.id, s.employee_id, s.designation, s.department, s.status, s.burnout_level,
        u.first_name, u.last_name, u.email, u.phone,
        v.name as vertical_name,
        r.name as role_name
      FROM staff s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN verticals v ON u.vertical_id = v.id
      WHERE (
        u.first_name LIKE ? OR 
        u.last_name LIKE ? OR 
        u.email LIKE ? OR 
        s.employee_id LIKE ? OR 
        s.designation LIKE ? OR 
        s.department LIKE ?
      )
      ORDER BY u.first_name, u.last_name
      LIMIT 50
    `;

    const searchPattern = `%${searchTerm}%`;
    const results = await executeQuery(query, [
      searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern
    ]);

    return results;
  },

  async getByDepartment(department, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        s.*,
        u.first_name, u.last_name, u.email, u.role_id,
        v.name as vertical_name
      FROM staff s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN verticals v ON u.vertical_id = v.id
      WHERE s.department = ?
      ORDER BY u.first_name, u.last_name
      LIMIT ? OFFSET ?
    `;

    const results = await executeQuery(query, [department, limit, offset]);

    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM staff s JOIN users u ON s.user_id = u.id WHERE s.department = ?';
    const countResult = await executeQuery(countQuery, [department]);
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

  async getStats(options = {}) {
    const { vertical_id } = options;

    let whereClause = '';
    let queryParams = [];

    if (vertical_id) {
      whereClause = 'WHERE u.vertical_id = ?';
      queryParams.push(vertical_id);
    }

    // Basic stats by status
    const statusStatsQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM staff s
      JOIN users u ON s.user_id = u.id
      ${whereClause}
      GROUP BY status
    `;

    const statusStats = await executeQuery(statusStatsQuery, queryParams);

    // Stats by employment type
    const employmentStatsQuery = `
      SELECT 
        employment_type,
        COUNT(*) as count
      FROM staff s
      JOIN users u ON s.user_id = u.id
      ${whereClause}
      GROUP BY employment_type
    `;

    const employmentStats = await executeQuery(employmentStatsQuery, queryParams);

    // Stats by department
    const departmentStatsQuery = `
      SELECT 
        department,
        COUNT(*) as count,
        AVG(salary) as avg_salary
      FROM staff s
      JOIN users u ON s.user_id = u.id
      ${whereClause}
      GROUP BY department
      ORDER BY count DESC
    `;

    const departmentStats = await executeQuery(departmentStatsQuery, queryParams);

    // Burnout level stats
    const burnoutStatsQuery = `
      SELECT 
        COALESCE(burnout_level, 'low') as burnout_level,
        COUNT(*) as count
      FROM staff s
      JOIN users u ON s.user_id = u.id
      ${whereClause}
      GROUP BY COALESCE(burnout_level, 'low')
    `;

    const burnoutStats = await executeQuery(burnoutStatsQuery, queryParams);

    // Total staff count
    const totalQuery = `SELECT COUNT(*) as total FROM staff s JOIN users u ON s.user_id = u.id ${whereClause}`;
    const totalResult = await executeQuery(totalQuery, queryParams);
    const total = totalResult[0].total;

    // Active staff count
    const activeQuery = `SELECT COUNT(*) as total FROM staff s JOIN users u ON s.user_id = u.id WHERE s.status = 'active' ${vertical_id ? 'AND u.vertical_id = ?' : ''}`;
    const activeResult = await executeQuery(activeQuery, vertical_id ? [vertical_id] : []);
    const active = activeResult[0].total;

    // High burnout count
    const highBurnoutQuery = `
      SELECT COUNT(*) as total 
      FROM staff s 
      JOIN users u ON s.user_id = u.id 
      WHERE (s.burnout_level = 'high' OR s.burnout_level IS NULL) 
      ${vertical_id ? 'AND u.vertical_id = ?' : ''}
    `;
    const highBurnoutResult = await executeQuery(highBurnoutQuery, vertical_id ? [vertical_id] : []);
    const highBurnout = highBurnoutResult[0].total;

    return {
      total_staff: total,
      active_staff: active,
      inactive_staff: total - active,
      high_burnout_risk: highBurnout,
      by_status: statusStats,
      by_employment_type: employmentStats,
      by_department: departmentStats,
      by_burnout_level: burnoutStats
    };
  },

  async getDirectory(options = {}) {
    const { department, vertical_id, status = 'active' } = options;

    let whereConditions = ['s.status = ?'];
    let queryParams = [status];

    if (department) {
      whereConditions.push('s.department = ?');
      queryParams.push(department);
    }

    if (vertical_id) {
      whereConditions.push('u.vertical_id = ?');
      queryParams.push(vertical_id);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        s.id, s.employee_id, s.designation, s.department, s.employment_type, s.status,
        u.first_name, u.last_name, u.email, u.phone, u.profile_picture,
        v.name as vertical_name,
        r.name as role_name,
        reporting.employee_id as reporting_to_employee_id,
        reporting.first_name as reporting_to_first_name,
        reporting.last_name as reporting_to_last_name
      FROM staff s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN verticals v ON u.vertical_id = v.id
      LEFT JOIN staff reporting_manager ON s.reporting_to = reporting_manager.id
      LEFT JOIN users reporting ON reporting_manager.user_id = reporting.id
      WHERE ${whereClause}
      ORDER BY u.first_name, u.last_name
    `;

    const results = await executeQuery(query, queryParams);
    return results;
  },

  async getExpiringContracts(daysThreshold = 30) {
    const query = `
      SELECT 
        s.id, s.employee_id, s.designation, s.department, s.join_date, s.employment_type,
        u.first_name, u.last_name, u.email, u.phone,
        v.name as vertical_name,
        COALESCE(
          (SELECT MAX(end_date)
           FROM staff_contracts
           WHERE staff_id = s.id
           AND end_date > CURDATE()
           ORDER BY end_date ASC
           LIMIT 1),
          DATE_ADD(s.join_date, INTERVAL 365 DAY)
        ) as contract_expiry_date,
        DATEDIFF(
          COALESCE(
            (SELECT MAX(end_date)
             FROM staff_contracts
             WHERE staff_id = s.id
             AND end_date > CURDATE()
             ORDER BY end_date ASC
             LIMIT 1),
            DATE_ADD(s.join_date, INTERVAL 365 DAY)
          ),
          CURDATE()
        ) as days_until_expiry
      FROM staff s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN verticals v ON u.vertical_id = v.id
      WHERE s.status = 'active'
      HAVING days_until_expiry <= ? AND days_until_expiry >= 0
      ORDER BY days_until_expiry ASC
    `;

    const results = await executeQuery(query, [daysThreshold]);
    return results;
  },

  async getBurnoutReport(options = {}) {
    const { vertical_id, burnout_level } = options;

    let whereConditions = ['s.status = "active"'];
    let queryParams = [];

    if (vertical_id) {
      whereConditions.push('u.vertical_id = ?');
      queryParams.push(vertical_id);
    }

    if (burnout_level) {
      whereConditions.push('(s.burnout_level = ? OR (s.burnout_level IS NULL AND ? = "low"))');
      queryParams.push(burnout_level, burnout_level);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        s.id, s.employee_id, s.designation, s.department, s.join_date,
        COALESCE(s.burnout_level, 'low') as burnout_level,
        u.first_name, u.last_name, u.email, u.phone,
        v.name as vertical_name,
        (SELECT COUNT(*) FROM leave_records lr WHERE lr.staff_id = s.id AND lr.status = 'approved' AND lr.start_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)) as leaves_taken_90_days,
        (SELECT COUNT(*) FROM leave_records lr WHERE lr.staff_id = s.id AND lr.status = 'pending') as pending_leaves,
        (SELECT AVG(work_hours) FROM attendance a WHERE a.staff_id = s.id AND a.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND a.status = 'present') as avg_daily_hours
      FROM staff s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN verticals v ON u.vertical_id = v.id
      WHERE ${whereClause}
      ORDER BY 
        CASE COALESCE(s.burnout_level, 'low')
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END,
        u.first_name, u.last_name
    `;

    const results = await executeQuery(query, queryParams);
    return results;
  },

  async generateEmployeeId() {
    const year = new Date().getFullYear();
    const query = `
      SELECT employee_id 
      FROM staff 
      WHERE employee_id LIKE ? 
      ORDER BY employee_id DESC 
      LIMIT 1
    `;

    const pattern = `EMP${year}%`;
    const results = await executeQuery(query, [pattern]);

    if (results.length === 0) {
      return `EMP${year}001`;
    }

    const lastId = results[0].employee_id;
    const lastNumber = parseInt(lastId.replace(`EMP${year}`, ''), 10);
    const newNumber = lastNumber + 1;

    return `EMP${year}${newNumber.toString().padStart(3, '0')}`;
  },

  async calculateBurnoutRisk(staffId) {
    // Get staff's leave records and attendance
    const query = `
      SELECT 
        s.id,
        (SELECT COUNT(*) FROM leave_records lr WHERE lr.staff_id = s.id AND lr.status = 'approved' AND lr.start_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)) as leaves_90_days,
        (SELECT AVG(work_hours) FROM attendance a WHERE a.staff_id = s.id AND a.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND a.status = 'present') as avg_hours,
        (SELECT COUNT(*) FROM attendance a WHERE a.staff_id = s.id AND a.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND a.work_hours > 10) as overtime_days
      FROM staff s
      WHERE s.id = ?
    `;

    const results = await executeQuery(query, [staffId]);
    
    if (results.length === 0) {
      return null;
    }

    const data = results[0];
    let score = 0;

    // High leave usage (more than 5 leaves in 90 days)
    if (data.leaves_90_days > 5) {
      score += 2;
    }

    // High average hours (more than 9 hours per day)
    if (data.avg_hours > 9) {
      score += 2;
    }

    // Frequent overtime (more than 5 days with 10+ hours in 30 days)
    if (data.overtime_days > 5) {
      score += 2;
    }

    // Determine burnout level
    let burnoutLevel = 'low';
    if (score >= 4) {
      burnoutLevel = 'high';
    } else if (score >= 2) {
      burnoutLevel = 'medium';
    }

    return {
      staff_id: staffId,
      burnout_level: burnoutLevel,
      risk_score: score,
      factors: {
        leaves_90_days: data.leaves_90_days,
        avg_daily_hours: data.avg_hours || 0,
        overtime_days: data.overtime_days
      }
    };
  }
};

export default Staff;
