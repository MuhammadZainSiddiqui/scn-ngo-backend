import { executeQuery } from '../config/database.js';

export const Inventory = {
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      subcategory,
      vertical_id,
      vendor_id,
      search,
      sort = 'i.created_at',
      order = 'desc'
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['1=1'];
    let queryParams = [];

    if (vertical_id) {
      whereConditions.push('i.vertical_id = ?');
      queryParams.push(vertical_id);
    }

    if (status) {
      whereConditions.push('i.status = ?');
      queryParams.push(status);
    }

    if (category) {
      whereConditions.push('i.category = ?');
      queryParams.push(category);
    }

    if (subcategory) {
      whereConditions.push('i.subcategory = ?');
      queryParams.push(subcategory);
    }

    if (vendor_id) {
      whereConditions.push('i.vendor_id = ?');
      queryParams.push(vendor_id);
    }

    if (search) {
      whereConditions.push('(i.name LIKE ? OR i.item_code LIKE ? OR i.description LIKE ? OR i.category LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM inventory i
      WHERE ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    // Main query
    const query = `
      SELECT
        i.*,
        vert.name as vertical_name,
        vert.code as vertical_code,
        vendor.name as vendor_name,
        vendor.vendor_code,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name
      FROM inventory i
      LEFT JOIN verticals vert ON i.vertical_id = vert.id
      LEFT JOIN vendors vendor ON i.vendor_id = vendor.id
      LEFT JOIN users creator ON i.created_by = creator.id
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
        i.*,
        vert.name as vertical_name,
        vert.code as vertical_code,
        vendor.name as vendor_name,
        vendor.vendor_code,
        vendor.email as vendor_email,
        vendor.phone as vendor_phone,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name
      FROM inventory i
      LEFT JOIN verticals vert ON i.vertical_id = vert.id
      LEFT JOIN vendors vendor ON i.vendor_id = vendor.id
      LEFT JOIN users creator ON i.created_by = creator.id
      WHERE i.id = ?
    `;

    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async findByItemCode(itemCode) {
    const query = 'SELECT * FROM inventory WHERE item_code = ?';
    const results = await executeQuery(query, [itemCode]);
    return results[0] || null;
  },

  async search(searchTerm) {
    const query = `
      SELECT
        i.id, i.item_code, i.name, i.category, i.subcategory, i.unit,
        i.current_quantity, i.status, i.unit_cost, i.total_value,
        vert.name as vertical_name
      FROM inventory i
      LEFT JOIN verticals vert ON i.vertical_id = vert.id
      WHERE (
        i.name LIKE ? OR
        i.item_code LIKE ? OR
        i.category LIKE ? OR
        i.description LIKE ?
      )
      ORDER BY i.name
      LIMIT 50
    `;

    const searchPattern = `%${searchTerm}%`;
    const results = await executeQuery(query, [
      searchPattern, searchPattern, searchPattern, searchPattern
    ]);

    return results;
  },

  async getLowStock(verticalId = null) {
    let whereClause = 'i.current_quantity <= i.minimum_quantity';
    let queryParams = [];

    if (verticalId) {
      whereClause += ' AND i.vertical_id = ?';
      queryParams.push(verticalId);
    }

    const query = `
      SELECT
        i.*,
        vert.name as vertical_name,
        vendor.name as vendor_name,
        (i.minimum_quantity - i.current_quantity) as quantity_needed
      FROM inventory i
      LEFT JOIN verticals vert ON i.vertical_id = vert.id
      LEFT JOIN vendors vendor ON i.vendor_id = vendor.id
      WHERE ${whereClause}
      ORDER BY (i.minimum_quantity - i.current_quantity) DESC
    `;

    return await executeQuery(query, queryParams);
  },

  async getOutOfStock(verticalId = null) {
    let whereClause = 'i.current_quantity = 0';
    let queryParams = [];

    if (verticalId) {
      whereClause += ' AND i.vertical_id = ?';
      queryParams.push(verticalId);
    }

    const query = `
      SELECT
        i.*,
        vert.name as vertical_name,
        vendor.name as vendor_name
      FROM inventory i
      LEFT JOIN verticals vert ON i.vertical_id = vert.id
      LEFT JOIN vendors vendor ON i.vendor_id = vendor.id
      WHERE ${whereClause}
      ORDER BY i.name
    `;

    return await executeQuery(query, queryParams);
  },

  async getByVertical(verticalId, options = {}) {
    const { page = 1, limit = 10, category, status } = options;
    const offset = (page - 1) * limit;

    let whereConditions = ['i.vertical_id = ?'];
    let queryParams = [verticalId];

    if (category) {
      whereConditions.push('i.category = ?');
      queryParams.push(category);
    }

    if (status) {
      whereConditions.push('i.status = ?');
      queryParams.push(status);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT
        i.*,
        vendor.name as vendor_name,
        vendor.vendor_code
      FROM inventory i
      LEFT JOIN vendors vendor ON i.vendor_id = vendor.id
      WHERE ${whereClause}
      ORDER BY i.category, i.name
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);
    const results = await executeQuery(query, queryParams);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM inventory i WHERE ${whereClause}`;
    const countResult = await executeQuery(countQuery, whereConditions.length > 1 ? queryParams.slice(0, -2) : queryParams);
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

  async create(inventoryData) {
    const {
      name,
      description,
      category,
      subcategory,
      unit,
      current_quantity = 0,
      minimum_quantity = 10,
      maximum_quantity,
      reorder_quantity = 50,
      unit_cost = 0,
      location,
      vendor_id,
      vertical_id,
      created_by
    } = inventoryData;

    // Generate item code
    const categoryPrefix = category ? category.substring(0, 3).toUpperCase() : 'GEN';
    const countQuery = `SELECT COUNT(*) as count FROM inventory WHERE item_code LIKE ?`;
    const countResult = await executeQuery(countQuery, [`${categoryPrefix}%`]);
    const count = countResult[0].count + 1;
    const itemCode = `${categoryPrefix}-${String(count).padStart(4, '0')}`;

    const query = `
      INSERT INTO inventory (
        item_code, name, description, category, subcategory, unit,
        current_quantity, minimum_quantity, maximum_quantity, reorder_quantity,
        unit_cost, location, vendor_id, vertical_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      itemCode, name, description, category, subcategory, unit,
      current_quantity, minimum_quantity, maximum_quantity, reorder_quantity,
      unit_cost, location, vendor_id, vertical_id, created_by
    ];

    const result = await executeQuery(query, params);
    return this.findById(result.insertId);
  },

  async update(id, updateData) {
    const allowedFields = [
      'name', 'description', 'category', 'subcategory', 'unit',
      'minimum_quantity', 'maximum_quantity', 'reorder_quantity',
      'unit_cost', 'location', 'vendor_id'
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
      UPDATE inventory
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, params);
    return this.findById(id);
  },

  async updateQuantity(id, newQuantity, unitCost = null) {
    // Get current item
    const item = await this.findById(id);
    if (!item) {
      throw new Error('Inventory item not found');
    }

    const previousQuantity = item.current_quantity;
    const difference = newQuantity - previousQuantity;

    // Update inventory
    let query = 'UPDATE inventory SET current_quantity = ?';
    let params = [newQuantity];

    if (unitCost !== null) {
      query += ', unit_cost = ?';
      params.push(unitCost);
    }

    if (difference > 0) {
      query += ', last_restocked_date = CURRENT_TIMESTAMP';
    } else if (difference < 0) {
      query += ', last_used_date = CURRENT_TIMESTAMP';
    }

    query += ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    params.push(id);

    await executeQuery(query, params);

    return this.findById(id);
  },

  async delete(id) {
    const item = await this.findById(id);
    if (!item) {
      throw new Error('Inventory item not found');
    }

    // Soft delete by setting status to discontinued
    const query = `
      UPDATE inventory
      SET status = 'discontinued', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [id]);
    return item;
  },

  async getStockTransactions(inventoryId, options = {}) {
    const { page = 1, limit = 50, transaction_type } = options;
    const offset = (page - 1) * limit;

    let whereConditions = ['st.inventory_id = ?'];
    let queryParams = [inventoryId];

    if (transaction_type) {
      whereConditions.push('st.transaction_type = ?');
      queryParams.push(transaction_type);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT
        st.*,
        i.item_code,
        i.name as item_name,
        vert.name as vertical_name,
        user.first_name as performed_by_first_name,
        user.last_name as performed_by_last_name
      FROM stock_transactions st
      JOIN inventory i ON st.inventory_id = i.id
      LEFT JOIN verticals vert ON st.vertical_id = vert.id
      LEFT JOIN users user ON st.performed_by = user.id
      WHERE ${whereClause}
      ORDER BY st.created_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);
    return await executeQuery(query, queryParams);
  },

  async createStockTransaction(transactionData) {
    const {
      inventory_id,
      transaction_type,
      quantity,
      unit_cost = 0,
      reference_type,
      reference_id,
      reason,
      performed_by,
      vertical_id
    } = transactionData;

    // Get current item
    const item = await this.findById(inventory_id);
    if (!item) {
      throw new Error('Inventory item not found');
    }

    const previousQuantity = item.current_quantity;
    const newQuantity = previousQuantity + quantity;

    // Generate transaction number
    const year = new Date().getFullYear();
    const countQuery = `SELECT COUNT(*) as count FROM stock_transactions WHERE transaction_number LIKE ?`;
    const countResult = await executeQuery(countQuery, [`STX-${year}%`]);
    const count = countResult[0].count + 1;
    const transactionNumber = `STX-${year}-${String(count).padStart(4, '0')}`;

    // Create transaction
    const query = `
      INSERT INTO stock_transactions (
        transaction_number, inventory_id, transaction_type, quantity,
        previous_quantity, new_quantity, unit_cost, reference_type,
        reference_id, reason, performed_by, vertical_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      transactionNumber, inventory_id, transaction_type, quantity,
      previousQuantity, newQuantity, unit_cost, reference_type,
      reference_id, reason, performed_by, vertical_id
    ];

    const result = await executeQuery(query, params);

    // Update inventory quantity
    await this.updateQuantity(inventory_id, newQuantity, unit_cost);

    return result.insertId;
  },

  async getStats(options = {}) {
    const { vertical_id } = options;

    let whereClause = '';
    let queryParams = [];

    if (vertical_id) {
      whereClause = 'WHERE i.vertical_id = ?';
      queryParams.push(vertical_id);
    }

    // Basic stats by status
    const statusStatsQuery = `
      SELECT
        status,
        COUNT(*) as count,
        SUM(total_value) as total_value
      FROM inventory i
      ${whereClause}
      GROUP BY status
    `;

    const statusStats = await executeQuery(statusStatsQuery, queryParams);

    // Stats by category
    const categoryStatsQuery = `
      SELECT
        category,
        COUNT(*) as count,
        SUM(current_quantity) as total_quantity,
        SUM(total_value) as total_value
      FROM inventory i
      ${whereClause}
      GROUP BY category
      ORDER BY total_value DESC
      LIMIT 10
    `;

    const categoryStats = await executeQuery(categoryStatsQuery, queryParams);

    // Total items
    const totalQuery = `SELECT COUNT(*) as total, SUM(total_value) as total_value FROM inventory i ${whereClause}`;
    const totalResult = await executeQuery(totalQuery, queryParams);
    const total = totalResult[0].total;
    const totalValue = totalResult[0].total_value || 0;

    // Low stock count
    const lowStockQuery = `SELECT COUNT(*) as total FROM inventory i WHERE i.current_quantity <= i.minimum_quantity ${vertical_id ? 'AND i.vertical_id = ?' : ''}`;
    const lowStockResult = await executeQuery(lowStockQuery, vertical_id ? [vertical_id] : []);
    const lowStock = lowStockResult[0].total;

    // Out of stock count
    const outOfStockQuery = `SELECT COUNT(*) as total FROM inventory i WHERE i.current_quantity = 0 ${vertical_id ? 'AND i.vertical_id = ?' : ''}`;
    const outOfStockResult = await executeQuery(outOfStockQuery, vertical_id ? [vertical_id] : []);
    const outOfStock = outOfStockResult[0].total;

    return {
      total_items: total,
      total_value: totalValue,
      low_stock_items: lowStock,
      out_of_stock_items: outOfStock,
      healthy_items: total - lowStock,
      by_status: statusStats,
      by_category: categoryStats
    };
  },

  async getByCategory(category, options = {}) {
    const { page = 1, limit = 10, vertical_id } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'i.category = ?';
    let queryParams = [category];

    if (vertical_id) {
      whereClause += ' AND i.vertical_id = ?';
      queryParams.push(vertical_id);
    }

    const query = `
      SELECT
        i.*,
        vert.name as vertical_name,
        vendor.name as vendor_name
      FROM inventory i
      LEFT JOIN verticals vert ON i.vertical_id = vert.id
      LEFT JOIN vendors vendor ON i.vendor_id = vendor.id
      WHERE ${whereClause}
      ORDER BY i.name
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);
    const results = await executeQuery(query, queryParams);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM inventory i WHERE ${whereClause}`;
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
  },

  async getAgingReport(verticalId = null) {
    let whereClause = '1=1';
    let queryParams = [];

    if (verticalId) {
      whereClause += ' AND i.vertical_id = ?';
      queryParams.push(verticalId);
    }

    const query = `
      SELECT
        i.id,
        i.item_code,
        i.name,
        i.category,
        i.current_quantity,
        i.total_value,
        i.last_restocked_date,
        i.last_used_date,
        DATEDIFF(CURRENT_TIMESTAMP, i.last_restocked_date) as days_since_restock,
        DATEDIFF(CURRENT_TIMESTAMP, i.last_used_date) as days_since_used,
        CASE
          WHEN i.last_used_date IS NULL THEN 'Never Used'
          WHEN DATEDIFF(CURRENT_TIMESTAMP, i.last_used_date) > 180 THEN 'Old (6+ months)'
          WHEN DATEDIFF(CURRENT_TIMESTAMP, i.last_used_date) > 90 THEN 'Aging (3-6 months)'
          ELSE 'Recent (0-3 months)'
        END as age_category,
        vert.name as vertical_name
      FROM inventory i
      LEFT JOIN verticals vert ON i.vertical_id = vert.id
      WHERE ${whereClause}
      ORDER BY days_since_used DESC
    `;

    return await executeQuery(query, queryParams);
  }
};

export default Inventory;
