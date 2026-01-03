import { executeQuery } from '../config/database.js';

export const Contact = {
  async findAll(options = {}) {
    const { page = 1, limit = 10, type, vertical_id, status } = options;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (type) {
      whereConditions.push('c.type = ?');
      params.push(type);
    }

    if (vertical_id) {
      whereConditions.push('c.vertical_id = ?');
      params.push(vertical_id);
    }

    if (status) {
      whereConditions.push('c.status = ?');
      params.push(status);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const query = `
      SELECT 
        c.*,
        v.name as vertical_name
      FROM contacts c
      LEFT JOIN verticals v ON c.vertical_id = v.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM contacts c
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

  async findById(id) {
    const query = `
      SELECT 
        c.*,
        v.name as vertical_name
      FROM contacts c
      LEFT JOIN verticals v ON c.vertical_id = v.id
      WHERE c.id = ?
    `;
    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async create(contactData) {
    const query = `
      INSERT INTO contacts (
        type, category, title, first_name, last_name, organization_name, email, phone,
        address_line1, address_line2, city, state, postal_code, country, pan_number,
        aadhar_number, gstin, tax_exempt, tags, notes, preferred_contact_method,
        vertical_id, assigned_to_user_id, status, created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, NOW(), NOW())
    `;
    const params = [
      contactData.type || 'other',
      contactData.category || 'individual',
      contactData.title || null,
      contactData.first_name || null,
      contactData.last_name || null,
      contactData.organization_name || null,
      contactData.email || null,
      contactData.phone || null,
      contactData.address_line1 || null,
      contactData.address_line2 || null,
      contactData.city || null,
      contactData.state || null,
      contactData.postal_code || null,
      contactData.country || 'India',
      contactData.pan_number || null,
      contactData.aadhar_number || null,
      contactData.gstin || null,
      contactData.tax_exempt || false,
      contactData.tags ? JSON.stringify(contactData.tags) : null,
      contactData.notes || null,
      contactData.preferred_contact_method || 'email',
      contactData.vertical_id || null,
      contactData.assigned_to_user_id || null,
      contactData.created_by
    ];

    const result = await executeQuery(query, params);
    return { id: result.insertId, ...contactData };
  },

  async update(id, updateData) {
    const allowedFields = [
      'type', 'category', 'title', 'first_name', 'last_name', 'organization_name',
      'email', 'phone', 'alternate_phone', 'address_line1', 'address_line2',
      'city', 'state', 'postal_code', 'country', 'pan_number', 'aadhar_number',
      'gstin', 'tax_exempt', 'tags', 'notes', 'preferred_contact_method',
      'vertical_id', 'assigned_to_user_id', 'status'
    ];

    const updates = [];
    const values = [];

    Object.entries(updateData).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'tags' && Array.isArray(value)) {
          updates.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          updates.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    if (updates.length === 0) return this.findById(id);

    updates.push('updated_at = NOW()');
    values.push(id);

    const query = `UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, values);
    return this.findById(id);
  },

  async delete(id) {
    const query = 'UPDATE contacts SET status = "inactive", updated_at = NOW() WHERE id = ?';
    return executeQuery(query, [id]);
  },

  async search(searchTerm) {
    const query = `
      SELECT 
        c.*,
        v.name as vertical_name
      FROM contacts c
      LEFT JOIN verticals v ON c.vertical_id = v.id
      WHERE 
        c.first_name LIKE ? OR 
        c.last_name LIKE ? OR 
        c.organization_name LIKE ? OR 
        c.email LIKE ? OR
        c.phone LIKE ?
      ORDER BY c.first_name ASC
    `;
    const param = `%${searchTerm}%`;
    return executeQuery(query, [param, param, param, param, param]);
  },

  async getByType(type) {
    const query = `
      SELECT 
        c.*,
        v.name as vertical_name
      FROM contacts c
      LEFT JOIN verticals v ON c.vertical_id = v.id
      WHERE c.type = ?
      ORDER BY c.first_name ASC
    `;
    return executeQuery(query, [type]);
  },

  async getByVertical(verticalId) {
    const query = `
      SELECT 
        c.*,
        v.name as vertical_name
      FROM contacts c
      LEFT JOIN verticals v ON c.vertical_id = v.id
      WHERE c.vertical_id = ?
      ORDER BY c.first_name ASC
    `;
    return executeQuery(query, [verticalId]);
  },

  async checkEmailExists(email, excludeId = null) {
    if (!email) return false;
    let query = 'SELECT id FROM contacts WHERE email = ?';
    let params = [email];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    const results = await executeQuery(query, params);
    return results.length > 0;
  }
};

export default Contact;
