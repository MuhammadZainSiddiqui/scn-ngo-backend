import { executeQuery, executeTransaction } from '../config/database.js';

export const userModel = {
  async findById(id) {
    const query = `
      SELECT 
        u.id, u.email, u.status, u.created_at, u.updated_at,
        r.id as role_id, r.name as role_name, r.permissions as role_permissions,
        v.id as vertical_id, v.name as vertical_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN verticals v ON u.vertical_id = v.id
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
  
  async findAll(options = {}) {
    const { page = 1, limit = 10, status, roleId, verticalId, search } = options;
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
    
    const query = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.status, 
        u.created_at, u.updated_at,
        r.name as role_name,
        v.name as vertical_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN verticals v ON u.vertical_id = v.id
      ${whereClause}
      ORDER BY u.created_at DESC
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
  
  async create(userData) {
    const query = `
      INSERT INTO users (email, password, first_name, last_name, role_id, vertical_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
    `;
    const params = [
      userData.email,
      userData.password,
      userData.first_name,
      userData.last_name,
      userData.role_id || 3,
      userData.vertical_id || null,
    ];
    
    const result = await executeQuery(query, params);
    return { id: result.insertId, ...userData };
  },
  
  async update(id, updateData) {
    const allowedFields = ['first_name', 'last_name', 'role_id', 'vertical_id', 'status', 'updated_at'];
    const updates = [];
    const values = [];
    
    Object.entries(updateData).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(key === 'updated_at' ? new Date() : value);
      }
    });
    
    if (updates.length === 0) {
      return null;
    }
    
    values.push(id);
    
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, values);
    
    return this.findById(id);
  },
  
  async updatePassword(id, hashedPassword) {
    const query = 'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?';
    await executeQuery(query, [hashedPassword, id]);
  },
  
  async softDelete(id) {
    const query = 'UPDATE users SET status = "inactive", updated_at = NOW() WHERE id = ?';
    await executeQuery(query, [id]);
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
