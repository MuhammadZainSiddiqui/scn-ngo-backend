import { executeQuery } from '../config/database.js';

export const Contact = {
  async findAll(options = {}) {
    const { page = 1, limit = 10, contact_type_id, vertical_id, status } = options;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (contact_type_id) {
      whereConditions.push('c.contact_type_id = ?');
      params.push(contact_type_id);
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
        ct.name as contact_type_name,
        v.name as vertical_name
      FROM contacts c
      LEFT JOIN contact_types ct ON c.contact_type_id = ct.id
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
        ct.name as contact_type_name,
        v.name as vertical_name
      FROM contacts c
      LEFT JOIN contact_types ct ON c.contact_type_id = ct.id
      LEFT JOIN verticals v ON c.vertical_id = v.id
      WHERE c.id = ?
    `;
    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async create(contactData) {
    const query = `
      INSERT INTO contacts (
        first_name, last_name, email, phone, contact_type_id, 
        vertical_id, address_line1, city, state, country, 
        notes, status, created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, NOW(), NOW())
    `;
    const params = [
      contactData.firstName,
      contactData.lastName,
      contactData.email || null,
      contactData.phone || null,
      contactData.contact_type_id,
      contactData.vertical_id || null,
      contactData.address || null,
      contactData.city || null,
      contactData.state || null,
      contactData.country || 'India',
      contactData.notes || null,
      contactData.created_by
    ];

    const result = await executeQuery(query, params);
    return { id: result.insertId, ...contactData };
  },

  async update(id, updateData) {
    const fieldMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      phone: 'phone',
      contact_type_id: 'contact_type_id',
      vertical_id: 'vertical_id',
      address: 'address_line1',
      city: 'city',
      state: 'state',
      country: 'country',
      notes: 'notes',
      status: 'status'
    };

    const updates = [];
    const values = [];

    Object.entries(updateData).forEach(([key, value]) => {
      if (fieldMap[key] && value !== undefined) {
        updates.push(`${fieldMap[key]} = ?`);
        values.push(value);
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
        ct.name as contact_type_name
      FROM contacts c
      LEFT JOIN contact_types ct ON c.contact_type_id = ct.id
      WHERE 
        c.first_name LIKE ? OR 
        c.last_name LIKE ? OR 
        c.email LIKE ? OR 
        c.phone LIKE ?
      ORDER BY c.first_name ASC
    `;
    const param = `%${searchTerm}%`;
    return executeQuery(query, [param, param, param, param]);
  },

  async getByType(typeId) {
    const query = `
      SELECT 
        c.*,
        ct.name as contact_type_name
      FROM contacts c
      LEFT JOIN contact_types ct ON c.contact_type_id = ct.id
      WHERE c.contact_type_id = ?
      ORDER BY c.first_name ASC
    `;
    return executeQuery(query, [typeId]);
  },

  async getByVertical(verticalId) {
    const query = `
      SELECT 
        c.*,
        ct.name as contact_type_name
      FROM contacts c
      LEFT JOIN contact_types ct ON c.contact_type_id = ct.id
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
