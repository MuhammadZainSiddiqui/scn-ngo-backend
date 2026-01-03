import { executeQuery, executeTransaction } from '../config/database.js';

export const userModel = {
  async findById(id) {
    const query = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.status, u.created_at, u.updated_at, u.last_login,
        r.id as role_id, r.name as role_name, r.permissions as role_permissions,
        v.id as vertical_id, v.name as vertical_name,
        s.employee_id, s.designation, s.department
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN verticals v ON u.vertical_id = v.id
      LEFT JOIN staff s ON s.user_id = u.id
      WHERE u.id = ?
    `;
    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },
  
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ?';
    const results = await executeQuery(query, [email]);
    return results[0] || null;
  },
  
  async checkEmailExists(email, excludeId = null) {
    let query = 'SELECT id FROM users WHERE email = ?';
    const params = [email];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const results = await executeQuery(query, params);
    return results.length > 0;
  },
  
  async findAll(options = {}) {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      roleId, 
      verticalId, 
      search, 
      sort = 'created_at', 
      order = 'desc' 
    } = options;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let params = [];
    
    if (status) {
      whereConditions.push('u.status = ?');
      params.push(status);
    }
    
    if (roleId) {
      whereConditions.push('u.role_id = ?');
      params.push(roleId);
    }
    
    if (verticalId) {
      whereConditions.push('u.vertical_id = ?');
      params.push(verticalId);
    }
    
    if (search) {
      whereConditions.push('(u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    const orderBy = `ORDER BY u.${sort} ${order.toUpperCase()}`;
    
    const query = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.status, 
        u.created_at, u.updated_at, u.last_login,
        r.name as role_name, r.id as role_id,
        v.name as vertical_name, v.id as vertical_id
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN verticals v ON u.vertical_id = v.id
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `;
    
    const [data, countResult] = await Promise.all([
      executeQuery(query, [...params, limit, offset]),
      executeQuery(countQuery, params),
    ]);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    };
  },
  
  async searchUsers(searchTerm, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.status, 
        u.created_at, u.updated_at,
        r.name as role_name, v.name as vertical_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN verticals v ON u.vertical_id = v.id
      WHERE u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?
    `;
    
    const searchParam = `%${searchTerm}%`;
    const [data, countResult] = await Promise.all([
      executeQuery(query, [searchParam, searchParam, searchParam, limit, offset]),
      executeQuery(countQuery, [searchParam, searchParam, searchParam]),
    ]);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    };
  },
  
  async getByRole(roleId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.status, 
        u.created_at, u.updated_at,
        r.name as role_name, v.name as vertical_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN verticals v ON u.vertical_id = v.id
      WHERE u.role_id = ?
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE role_id = ?
    `;
    
    const [data, countResult] = await Promise.all([
      executeQuery(query, [roleId, limit, offset]),
      executeQuery(countQuery, [roleId]),
    ]);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    };
  },
  
  async getByVertical(verticalId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.status, 
        u.created_at, u.updated_at,
        r.name as role_name, v.name as vertical_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN verticals v ON u.vertical_id = v.id
      WHERE u.vertical_id = ?
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE vertical_id = ?
    `;
    
    const [data, countResult] = await Promise.all([
      executeQuery(query, [verticalId, limit, offset]),
      executeQuery(countQuery, [verticalId]),
    ]);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    };
  },
  
  async create(userData) {
    return await executeTransaction(async (connection) => {
      const userQuery = `
        INSERT INTO users (email, password, first_name, last_name, role_id, vertical_id, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      const userParams = [
        userData.email,
        userData.password,
        userData.first_name,
        userData.last_name,
        userData.role_id,
        userData.vertical_id || null,
        userData.status || 'active',
      ];
      
      const [userResult] = await connection.execute(userQuery, userParams);
      const userId = userResult.insertId;
      
      if (userData.role_id === 3) {
        const staffQuery = `
          INSERT INTO staff (user_id, employee_id, designation, department, joining_date, created_at, updated_at)
          VALUES (?, ?, ?, ?, NOW(), NOW(), NOW())
        `;
        const staffParams = [
          userId,
          userData.employee_id || `EMP${userId}`,
          userData.designation || 'Staff Member',
          userData.department || 'General',
        ];
        await connection.execute(staffQuery, staffParams);
      }
      
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, old_values, new_values, created_at)
         VALUES (?, 'create', 'users', ?, NULL, ?, NOW())`,
        [userData.created_by || userId, userId, JSON.stringify({ email: userData.email, first_name: userData.first_name, last_name: userData.last_name, role_id: userData.role_id, vertical_id: userData.vertical_id })]
      );
      
      return { id: userId };
    });
  },
  
  async update(id, updateData, updatedBy = null) {
    return await executeTransaction(async (connection) => {
      const oldUser = await this.findById(id);
      if (!oldUser) {
        throw new Error('User not found');
      }
      
      const allowedFields = ['first_name', 'last_name', 'email', 'role_id', 'vertical_id', 'status', 'updated_at'];
      const updates = [];
      const values = [];
      
      Object.entries(updateData).forEach(([key, value]) => {
        if (allowedFields.includes(key) && value !== undefined && value !== null) {
          updates.push(`${key} = ?`);
          values.push(key === 'updated_at' ? new Date() : value);
        }
      });
      
      if (updates.length === 0) {
        return oldUser;
      }
      
      values.push(id);
      
      const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(updateQuery, values);
      
      const newUser = await this.findById(id);
      
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, old_values, new_values, created_at)
         VALUES (?, 'update', 'users', ?, ?, NOW())`,
        [updatedBy || id, id, JSON.stringify({ old: { first_name: oldUser.first_name, last_name: oldUser.last_name, email: oldUser.email, role_id: oldUser.role_id, vertical_id: oldUser.vertical_id }, new: updateData })]
      );
      
      return newUser;
    });
  },
  
  async updateRole(id, roleId, updatedBy) {
    return await executeTransaction(async (connection) => {
      const oldUser = await this.findById(id);
      if (!oldUser) {
        throw new Error('User not found');
      }
      
      await connection.execute(
        'UPDATE users SET role_id = ?, updated_at = NOW() WHERE id = ?',
        [roleId, id]
      );
      
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, old_values, new_values, created_at)
         VALUES (?, 'update_role', 'users', ?, ?, NOW())`,
        [updatedBy, id, JSON.stringify({ old: { role_id: oldUser.role_id }, new: { role_id: roleId } })]
      );
      
      return this.findById(id);
    });
  },
  
  async updateStatus(id, status, updatedBy) {
    return await executeTransaction(async (connection) => {
      const oldUser = await this.findById(id);
      if (!oldUser) {
        throw new Error('User not found');
      }
      
      await connection.execute(
        'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, id]
      );
      
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, old_values, new_values, created_at)
         VALUES (?, 'update_status', 'users', ?, ?, NOW())`,
        [updatedBy, id, JSON.stringify({ old: { status: oldUser.status }, new: { status } })]
      );
      
      return this.findById(id);
    });
  },
  
  async updatePassword(id, hashedPassword, updatedBy = null) {
    return await executeTransaction(async (connection) => {
      await connection.execute(
        'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, id]
      );
      
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, old_values, new_values, created_at)
         VALUES (?, 'change_password', 'users', ?, NULL, ?, NOW())`,
        [updatedBy || id, id, JSON.stringify({ password_changed: true })]
      );
      
      return true;
    });
  },
  
  async softDelete(id, updatedBy) {
    return await this.updateStatus(id, 'inactive', updatedBy);
  },
  
  async getUserStats() {
    const statsQueries = await Promise.all([
      executeQuery('SELECT COUNT(*) as total FROM users WHERE status = "active"'),
      executeQuery('SELECT role_id, COUNT(*) as count FROM users WHERE status = "active" GROUP BY role_id'),
      executeQuery('SELECT vertical_id, COUNT(*) as count FROM users WHERE status = "active" AND vertical_id IS NOT NULL GROUP BY vertical_id'),
      executeQuery('SELECT COUNT(*) as recent FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'),
      executeQuery(`
        SELECT status, COUNT(*) as count 
        FROM users 
        GROUP BY status
      `),
    ]);
    
    const [totalResult, roleBreakdown, verticalBreakdown, recentUsers, statusBreakdown] = statsQueries;
    
    const roleMap = {};
    roleBreakdown.forEach(row => {
      roleMap[row.role_id] = parseInt(row.count, 10);
    });
    
    const verticalMap = {};
    verticalBreakdown.forEach(row => {
      verticalMap[row.vertical_id] = parseInt(row.count, 10);
    });
    
    const statusMap = {};
    statusBreakdown.forEach(row => {
      statusMap[row.status] = parseInt(row.count, 10);
    });
    
    return {
      totalUsers: totalResult[0]?.total || 0,
      usersByRole: roleMap,
      usersByVertical: verticalMap,
      recentlyAdded: recentUsers[0]?.recent || 0,
      statusBreakdown: statusMap,
    };
  },
};

export const roleModel = {
  async findById(id) {
    const query = 'SELECT * FROM roles WHERE id = ?';
    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },
  
  async findAll() {
    const query = 'SELECT * FROM roles ORDER BY id ASC';
    return executeQuery(query);
  },
  
  async findByName(name) {
    const query = 'SELECT * FROM roles WHERE name = ?';
    const results = await executeQuery(query, [name]);
    return results[0] || null;
  },
  
  async create(roleData, createdBy) {
    return await executeTransaction(async (connection) => {
      const query = `
        INSERT INTO roles (name, description, permissions, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
      `;
      const params = [
        roleData.name,
        roleData.description,
        JSON.stringify(roleData.permissions),
      ];
      
      const [result] = await connection.execute(query, params);
      const roleId = result.insertId;
      
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, old_values, new_values, created_at)
         VALUES (?, 'create', 'roles', ?, NULL, ?, NOW())`,
        [createdBy, roleId, JSON.stringify(roleData)]
      );
      
      return { id: roleId };
    });
  },
  
  async update(id, roleData, updatedBy) {
    return await executeTransaction(async (connection) => {
      const oldRole = await this.findById(id);
      if (!oldRole) {
        throw new Error('Role not found');
      }
      
      const updates = [];
      const values = [];
      
      if (roleData.name !== undefined) {
        updates.push('name = ?');
        values.push(roleData.name);
      }
      
      if (roleData.description !== undefined) {
        updates.push('description = ?');
        values.push(roleData.description);
      }
      
      if (roleData.permissions !== undefined) {
        updates.push('permissions = ?');
        values.push(JSON.stringify(roleData.permissions));
      }
      
      if (updates.length === 0) {
        return oldRole;
      }
      
      values.push(id);
      
      const updateQuery = `UPDATE roles SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
      await connection.execute(updateQuery, values);
      
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, old_values, new_values, created_at)
         VALUES (?, 'update', 'roles', ?, ?, NOW())`,
        [updatedBy, id, JSON.stringify({ old: oldRole, new: roleData })]
      );
      
      return this.findById(id);
    });
  },
  
  async seedDefaultRoles() {
    const defaultRoles = [
      {
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        permissions: {
          users: { read: true, write: true, delete: true },
          donations: { read: true, write: true, delete: true },
          programs: { read: true, write: true, delete: true },
          volunteers: { read: true, write: true, delete: true },
          staff: { read: true, write: true, delete: true },
          reports: { read: true, export: true },
          settings: { read: true, write: true },
          safeguarding: { read: true, write: true },
        },
      },
      {
        name: 'Vertical Lead',
        description: 'Department head with vertical-scoped access',
        permissions: {
          users: { read: true, write: false, delete: false },
          donations: { read: true, write: true, delete: false },
          programs: { read: true, write: true, delete: false },
          volunteers: { read: true, write: true, delete: false },
          staff: { read: true, write: false, delete: false },
          reports: { read: true, export: true },
          settings: { read: false, write: false },
          safeguarding: { read: true, write: false },
        },
      },
      {
        name: 'Finance Officer',
        description: 'Financial management and reporting access',
        permissions: {
          users: { read: false, write: false, delete: false },
          donations: { read: true, write: true, delete: false },
          programs: { read: true, write: false, delete: false },
          volunteers: { read: false, write: false, delete: false },
          staff: { read: false, write: false, delete: false },
          reports: { read: true, export: true },
          settings: { read: false, write: false },
          safeguarding: { read: false, write: false },
        },
      },
      {
        name: 'HR Lead',
        description: 'Human resources and staff management',
        permissions: {
          users: { read: true, write: false, delete: false },
          donations: { read: false, write: false, delete: false },
          programs: { read: false, write: false, delete: false },
          volunteers: { read: false, write: false, delete: false },
          staff: { read: true, write: true, delete: false },
          reports: { read: true, export: false },
          settings: { read: false, write: false },
          safeguarding: { read: true, write: false },
        },
      },
      {
        name: 'Staff',
        description: 'General staff with read access to most modules',
        permissions: {
          users: { read: true, write: false, delete: false },
          donations: { read: true, write: false, delete: false },
          programs: { read: true, write: false, delete: false },
          volunteers: { read: true, write: false, delete: false },
          staff: { read: false, write: false, delete: false },
          reports: { read: true, export: false },
          settings: { read: false, write: false },
          safeguarding: { read: false, write: false },
        },
      },
      {
        name: 'Viewer',
        description: 'Read-only access to basic information',
        permissions: {
          users: { read: false, write: false, delete: false },
          donations: { read: true, write: false, delete: false },
          programs: { read: true, write: false, delete: false },
          volunteers: { read: true, write: false, delete: false },
          staff: { read: false, write: false, delete: false },
          reports: { read: true, export: false },
          settings: { read: false, write: false },
          safeguarding: { read: false, write: false },
        },
      },
    ];
    
    const existingRoles = await this.findAll();
    const existingRoleNames = existingRoles.map(role => role.name);
    
    const rolesToInsert = defaultRoles.filter(role => !existingRoleNames.includes(role.name));
    
    for (const role of rolesToInsert) {
      const query = `
        INSERT INTO roles (name, description, permissions, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
      `;
      await executeQuery(query, [role.name, role.description, JSON.stringify(role.permissions)]);
    }
    
    return rolesToInsert.length;
  },
};

export const verticalModel = {
  async findById(id) {
    const query = 'SELECT * FROM verticals WHERE id = ? AND status = "active"';
    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },
  
  async findAll() {
    const query = 'SELECT * FROM verticals WHERE status = "active" ORDER BY name ASC';
    return executeQuery(query);
  },
};

export default {
  userModel,
  roleModel,
  verticalModel,
};
