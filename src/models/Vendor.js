import { executeQuery } from '../config/database.js';

export const Vendor = {
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      category,
      vertical_id,
      search,
      sort = 'v.created_at',
      order = 'desc'
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['1=1'];
    let queryParams = [];

    // Apply vertical filtering
    if (vertical_id) {
      whereConditions.push('(v.vertical_id = ? OR v.vertical_id IS NULL)');
      queryParams.push(vertical_id);
    }

    if (status) {
      whereConditions.push('v.status = ?');
      queryParams.push(status);
    }

    if (type) {
      whereConditions.push('v.type = ?');
      queryParams.push(type);
    }

    if (category) {
      whereConditions.push('v.category = ?');
      queryParams.push(category);
    }

    if (search) {
      whereConditions.push('(v.name LIKE ? OR v.vendor_code LIKE ? OR v.email LIKE ? OR v.contact_person LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM vendors v
      WHERE ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    // Main query
    const query = `
      SELECT
        v.*,
        vert.name as vertical_name,
        vert.code as vertical_code,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name,
        creator.email as created_by_email
      FROM vendors v
      LEFT JOIN verticals vert ON v.vertical_id = vert.id
      LEFT JOIN users creator ON v.created_by = creator.id
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
        v.*,
        vert.name as vertical_name,
        vert.code as vertical_code,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name,
        creator.email as created_by_email
      FROM vendors v
      LEFT JOIN verticals vert ON v.vertical_id = vert.id
      LEFT JOIN users creator ON v.created_by = creator.id
      WHERE v.id = ?
    `;

    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async findByVendorCode(vendorCode) {
    const query = 'SELECT * FROM vendors WHERE vendor_code = ?';
    const results = await executeQuery(query, [vendorCode]);
    return results[0] || null;
  },

  async search(searchTerm) {
    const query = `
      SELECT
        v.id, v.vendor_code, v.name, v.type, v.category, v.status, v.rating,
        v.contact_person, v.email, v.phone,
        vert.name as vertical_name
      FROM vendors v
      LEFT JOIN verticals vert ON v.vertical_id = vert.id
      WHERE (
        v.name LIKE ? OR
        v.vendor_code LIKE ? OR
        v.email LIKE ? OR
        v.contact_person LIKE ? OR
        v.category LIKE ?
      )
      ORDER BY v.name
      LIMIT 50
    `;

    const searchPattern = `%${searchTerm}%`;
    const results = await executeQuery(query, [
      searchPattern, searchPattern, searchPattern, searchPattern, searchPattern
    ]);

    return results;
  },

  async create(vendorData) {
    const {
      name,
      type = 'goods',
      category,
      contact_person,
      email,
      phone,
      alternate_phone,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country = 'India',
      gstin,
      pan_number,
      payment_terms = '30 days',
      credit_limit = 0,
      bank_name,
      bank_account_number,
      bank_ifsc,
      status = 'active',
      vertical_id,
      notes,
      created_by
    } = vendorData;

    // Generate vendor code
    const year = new Date().getFullYear();
    const countQuery = `SELECT COUNT(*) as count FROM vendors WHERE vendor_code LIKE ?`;
    const countResult = await executeQuery(countQuery, [`VEN-${year}%`]);
    const count = countResult[0].count + 1;
    const vendorCode = `VEN-${year}-${String(count).padStart(3, '0')}`;

    const query = `
      INSERT INTO vendors (
        vendor_code, name, type, category, contact_person, email, phone, alternate_phone,
        address_line1, address_line2, city, state, postal_code, country, gstin, pan_number,
        payment_terms, credit_limit, bank_name, bank_account_number, bank_ifsc, status,
        vertical_id, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      vendorCode, name, type, category, contact_person, email, phone, alternate_phone,
      address_line1, address_line2, city, state, postal_code, country, gstin, pan_number,
      payment_terms, credit_limit, bank_name, bank_account_number, bank_ifsc, status,
      vertical_id, notes, created_by
    ];

    const result = await executeQuery(query, params);
    return this.findById(result.insertId);
  },

  async update(id, updateData) {
    const allowedFields = [
      'name', 'type', 'category', 'contact_person', 'email', 'phone', 'alternate_phone',
      'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country',
      'gstin', 'pan_number', 'payment_terms', 'credit_limit', 'bank_name',
      'bank_account_number', 'bank_ifsc', 'status', 'rating', 'vertical_id', 'notes'
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
      UPDATE vendors
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, params);
    return this.findById(id);
  },

  async updateStatus(id, status) {
    const query = `
      UPDATE vendors
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [status, id]);
    return this.findById(id);
  },

  async updateRating(id, rating) {
    const query = `
      UPDATE vendors
      SET rating = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [rating, id]);
    return this.findById(id);
  },

  async delete(id) {
    // Soft delete by setting status to inactive
    const vendor = await this.findById(id);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const query = `
      UPDATE vendors
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [id]);
    return vendor;
  },

  async getStats(options = {}) {
    const { vertical_id } = options;

    let whereClause = '';
    let queryParams = [];

    if (vertical_id) {
      whereClause = 'WHERE v.vertical_id = ? OR v.vertical_id IS NULL';
      queryParams.push(vertical_id);
    }

    // Basic stats by status
    const statusStatsQuery = `
      SELECT
        status,
        COUNT(*) as count
      FROM vendors v
      ${whereClause}
      GROUP BY status
    `;

    const statusStats = await executeQuery(statusStatsQuery, queryParams);

    // Stats by type
    const typeStatsQuery = `
      SELECT
        type,
        COUNT(*) as count
      FROM vendors v
      ${whereClause}
      GROUP BY type
    `;

    const typeStats = await executeQuery(typeStatsQuery, queryParams);

    // Stats by category
    const categoryStatsQuery = `
      SELECT
        category,
        COUNT(*) as count,
        SUM(total_amount) as total_spent
      FROM vendors v
      ${whereClause}
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `;

    const categoryStats = await executeQuery(categoryStatsQuery, queryParams);

    // Total vendors
    const totalQuery = `SELECT COUNT(*) as total FROM vendors v ${whereClause}`;
    const totalResult = await executeQuery(totalQuery, queryParams);
    const total = totalResult[0].total;

    // Active vendors
    const activeQuery = `SELECT COUNT(*) as total FROM vendors v WHERE v.status = 'active' ${vertical_id ? 'AND (v.vertical_id = ? OR v.vertical_id IS NULL)' : ''}`;
    const activeResult = await executeQuery(activeQuery, vertical_id ? [vertical_id] : []);
    const active = activeResult[0].total;

    // Total orders value
    const totalValueQuery = `
      SELECT SUM(total_amount) as total_value
      FROM vendors v
      ${whereClause}
    `;
    const totalValueResult = await executeQuery(totalValueQuery, queryParams);
    const totalValue = totalValueResult[0].total_value || 0;

    // Top vendors by orders
    const topVendorsQuery = `
      SELECT
        v.id, v.vendor_code, v.name, v.type, v.rating,
        v.total_orders, v.total_amount
      FROM vendors v
      ${whereClause}
      ORDER BY v.total_amount DESC
      LIMIT 10
    `;
    const topVendors = await executeQuery(topVendorsQuery, queryParams);

    return {
      total_vendors: total,
      active_vendors: active,
      inactive_vendors: total - active,
      total_order_value: totalValue,
      by_status: statusStats,
      by_type: typeStats,
      by_category: categoryStats,
      top_vendors: topVendors
    };
  },

  async getByCategory(category, options = {}) {
    const { page = 1, limit = 10, vertical_id } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'v.category = ?';
    let queryParams = [category];

    if (vertical_id) {
      whereClause += ' AND (v.vertical_id = ? OR v.vertical_id IS NULL)';
      queryParams.push(vertical_id);
    }

    const query = `
      SELECT
        v.*,
        vert.name as vertical_name
      FROM vendors v
      LEFT JOIN verticals vert ON v.vertical_id = vert.id
      WHERE ${whereClause}
      ORDER BY v.name
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);
    const results = await executeQuery(query, queryParams);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM vendors v WHERE ${whereClause}`;
    const countParams = vertical_id ? [category, vertical_id] : [category];
    const countResult = await executeQuery(countQuery, countParams);
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
  }
};

export default Vendor;
