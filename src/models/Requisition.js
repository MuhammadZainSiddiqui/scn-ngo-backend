import { executeQuery } from '../config/database.js';

export const Requisition = {
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      vertical_id,
      program_id,
      priority,
      requested_by,
      vendor_id,
      search,
      sort = 'r.created_at',
      order = 'desc'
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['1=1'];
    let queryParams = [];

    // Apply vertical filtering
    if (vertical_id) {
      whereConditions.push('r.vertical_id = ?');
      queryParams.push(vertical_id);
    }

    if (status) {
      whereConditions.push('r.status = ?');
      queryParams.push(status);
    }

    if (program_id) {
      whereConditions.push('r.program_id = ?');
      queryParams.push(program_id);
    }

    if (priority) {
      whereConditions.push('r.priority = ?');
      queryParams.push(priority);
    }

    if (requested_by) {
      whereConditions.push('r.requested_by = ?');
      queryParams.push(requested_by);
    }

    if (vendor_id) {
      whereConditions.push('r.vendor_id = ?');
      queryParams.push(vendor_id);
    }

    if (search) {
      whereConditions.push('(r.requisition_number LIKE ? OR r.title LIKE ? OR r.description LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM requisitions r
      WHERE ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    // Main query
    const query = `
      SELECT
        r.*,
        vert.name as vertical_name,
        vert.code as vertical_code,
        prog.name as program_name,
        prog.code as program_code,
        requester.first_name as requested_by_first_name,
        requester.last_name as requested_by_last_name,
        requester.email as requested_by_email,
        approver.first_name as approved_by_first_name,
        approver.last_name as approved_by_last_name,
        rejector.first_name as rejected_by_first_name,
        rejector.last_name as rejected_by_last_name,
        orderer.first_name as ordered_by_first_name,
        orderer.last_name as ordered_by_last_name,
        receiver.first_name as received_by_first_name,
        receiver.last_name as received_by_last_name,
        vendor.name as vendor_name,
        vendor.vendor_code,
        (SELECT COUNT(*) FROM requisition_items WHERE requisition_id = r.id) as item_count
      FROM requisitions r
      LEFT JOIN verticals vert ON r.vertical_id = vert.id
      LEFT JOIN programs prog ON r.program_id = prog.id
      LEFT JOIN users requester ON r.requested_by = requester.id
      LEFT JOIN users approver ON r.approved_by = approver.id
      LEFT JOIN users rejector ON r.rejected_by = rejector.id
      LEFT JOIN users orderer ON r.ordered_by = orderer.id
      LEFT JOIN users receiver ON r.received_by = receiver.id
      LEFT JOIN vendors vendor ON r.vendor_id = vendor.id
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
        r.*,
        vert.name as vertical_name,
        vert.code as vertical_code,
        prog.name as program_name,
        prog.code as program_code,
        requester.first_name as requested_by_first_name,
        requester.last_name as requested_by_last_name,
        requester.email as requested_by_email,
        requester.role_id as requested_by_role_id,
        approver.first_name as approved_by_first_name,
        approver.last_name as approved_by_last_name,
        rejector.first_name as rejected_by_first_name,
        rejector.last_name as rejected_by_last_name,
        orderer.first_name as ordered_by_first_name,
        orderer.last_name as ordered_by_last_name,
        receiver.first_name as received_by_first_name,
        receiver.last_name as received_by_last_name,
        vendor.name as vendor_name,
        vendor.vendor_code,
        vendor.email as vendor_email,
        vendor.phone as vendor_phone
      FROM requisitions r
      LEFT JOIN verticals vert ON r.vertical_id = vert.id
      LEFT JOIN programs prog ON r.program_id = prog.id
      LEFT JOIN users requester ON r.requested_by = requester.id
      LEFT JOIN users approver ON r.approved_by = approver.id
      LEFT JOIN users rejector ON r.rejected_by = rejector.id
      LEFT JOIN users orderer ON r.ordered_by = orderer.id
      LEFT JOIN users receiver ON r.received_by = receiver.id
      LEFT JOIN vendors vendor ON r.vendor_id = vendor.id
      WHERE r.id = ?
    `;

    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async findByRequisitionNumber(requisitionNumber) {
    const query = 'SELECT * FROM requisitions WHERE requisition_number = ?';
    const results = await executeQuery(query, [requisitionNumber]);
    return results[0] || null;
  },

  async getItems(requisitionId) {
    const query = `
      SELECT
        ri.*,
        inv.item_code as inventory_item_code,
        inv.name as inventory_item_name
      FROM requisition_items ri
      LEFT JOIN inventory inv ON ri.inventory_id = inv.id
      WHERE ri.requisition_id = ?
      ORDER BY ri.id
    `;

    return await executeQuery(query, [requisitionId]);
  },

  async search(searchTerm) {
    const query = `
      SELECT
        r.id, r.requisition_number, r.title, r.status, r.priority,
        r.estimated_total, r.created_at,
        vert.name as vertical_name
      FROM requisitions r
      LEFT JOIN verticals vert ON r.vertical_id = vert.id
      WHERE (
        r.requisition_number LIKE ? OR
        r.title LIKE ? OR
        r.description LIKE ?
      )
      ORDER BY r.created_at DESC
      LIMIT 50
    `;

    const searchPattern = `%${searchTerm}%`;
    const results = await executeQuery(query, [searchPattern, searchPattern, searchPattern]);

    return results;
  },

  async create(requisitionData) {
    const {
      title,
      description,
      purpose,
      vertical_id,
      program_id,
      requested_by,
      department,
      priority = 'medium',
      notes
    } = requisitionData;

    // Generate requisition number
    const year = new Date().getFullYear();
    const countQuery = `SELECT COUNT(*) as count FROM requisitions WHERE requisition_number LIKE ?`;
    const countResult = await executeQuery(countQuery, [`REQ-${year}%`]);
    const count = countResult[0].count + 1;
    const requisitionNumber = `REQ-${year}-${String(count).padStart(3, '0')}`;

    const query = `
      INSERT INTO requisitions (
        requisition_number, title, description, purpose, vertical_id, program_id,
        requested_by, department, priority, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `;

    const params = [
      requisitionNumber, title, description, purpose, vertical_id, program_id,
      requested_by, department, priority, notes
    ];

    const result = await executeQuery(query, params);
    return this.findById(result.insertId);
  },

  async update(id, updateData) {
    const allowedFields = [
      'title', 'description', 'purpose', 'program_id', 'department', 'priority', 'notes'
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
      UPDATE requisitions
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, params);
    return this.findById(id);
  },

  async approve(id, approvedBy) {
    const query = `
      UPDATE requisitions
      SET status = 'approved',
          approved_by = ?,
          approved_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [approvedBy, id]);
    return this.findById(id);
  },

  async reject(id, rejectedBy, rejectionReason) {
    const query = `
      UPDATE requisitions
      SET status = 'rejected',
          rejected_by = ?,
          rejected_date = CURRENT_TIMESTAMP,
          rejection_reason = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [rejectedBy, rejectionReason, id]);
    return this.findById(id);
  },

  async order(id, orderedBy, vendorId, poNumber) {
    const query = `
      UPDATE requisitions
      SET status = 'ordered',
          ordered_by = ?,
          ordered_date = CURRENT_TIMESTAMP,
          vendor_id = ?,
          po_number = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [orderedBy, vendorId, poNumber, id]);
    return this.findById(id);
  },

  async receive(id, receivedBy) {
    const query = `
      UPDATE requisitions
      SET status = 'received',
          received_by = ?,
          received_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [receivedBy, id]);
    return this.findById(id);
  },

  async cancel(id) {
    const query = `
      UPDATE requisitions
      SET status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [id]);
    return this.findById(id);
  },

  async delete(id) {
    // Check if requisition can be deleted (only pending or rejected)
    const requisition = await this.findById(id);
    if (!requisition) {
      throw new Error('Requisition not found');
    }

    if (['approved', 'ordered', 'received'].includes(requisition.status)) {
      throw new Error('Cannot delete requisition that has been approved, ordered, or received');
    }

    // Delete items first (will cascade due to foreign key)
    await executeQuery('DELETE FROM requisition_items WHERE requisition_id = ?', [id]);

    // Delete requisition
    await executeQuery('DELETE FROM requisitions WHERE id = ?', [id]);
    return requisition;
  },

  async addItem(requisitionId, itemData) {
    const {
      item_name,
      description,
      quantity,
      unit,
      estimated_unit_cost = 0,
      item_code,
      inventory_id,
      category,
      specifications,
      notes
    } = itemData;

    const query = `
      INSERT INTO requisition_items (
        requisition_id, item_name, description, quantity, unit, estimated_unit_cost,
        item_code, inventory_id, category, specifications, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      requisitionId, item_name, description, quantity, unit, estimated_unit_cost,
      item_code, inventory_id, category, specifications, notes
    ];

    const result = await executeQuery(query, params);

    // Update requisition total
    await this.updateTotal(requisitionId);

    // Get the item with inventory info
    const itemQuery = `
      SELECT
        ri.*,
        inv.item_code as inventory_item_code,
        inv.name as inventory_item_name
      FROM requisition_items ri
      LEFT JOIN inventory inv ON ri.inventory_id = inv.id
      WHERE ri.id = ?
    `;
    const itemResult = await executeQuery(itemQuery, [result.insertId]);
    return itemResult[0];
  },

  async updateItem(itemId, updateData) {
    const allowedFields = [
      'item_name', 'description', 'quantity', 'unit', 'estimated_unit_cost',
      'actual_unit_cost', 'received_quantity', 'item_code', 'inventory_id',
      'category', 'specifications', 'notes'
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

    params.push(itemId);

    const query = `
      UPDATE requisition_items
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, params);

    // Get requisition_id to update total
    const itemResult = await executeQuery('SELECT requisition_id FROM requisition_items WHERE id = ?', [itemId]);
    if (itemResult.length > 0) {
      await this.updateTotal(itemResult[0].requisition_id);
    }

    // Return updated item
    const itemQuery = `
      SELECT
        ri.*,
        inv.item_code as inventory_item_code,
        inv.name as inventory_item_name
      FROM requisition_items ri
      LEFT JOIN inventory inv ON ri.inventory_id = inv.id
      WHERE ri.id = ?
    `;
    const finalItemResult = await executeQuery(itemQuery, [itemId]);
    return finalItemResult[0];
  },

  async deleteItem(itemId) {
    // Get requisition_id before deleting
    const itemResult = await executeQuery('SELECT requisition_id FROM requisition_items WHERE id = ?', [itemId]);
    if (itemResult.length === 0) {
      throw new Error('Item not found');
    }

    await executeQuery('DELETE FROM requisition_items WHERE id = ?', [itemId]);

    // Update requisition total
    await this.updateTotal(itemResult[0].requisition_id);

    return { id: itemId, deleted: true };
  },

  async updateTotal(requisitionId) {
    const query = `
      UPDATE requisitions
      SET estimated_total = (
        SELECT COALESCE(SUM(total_cost), 0)
        FROM requisition_items
        WHERE requisition_id = ?
      )
      WHERE id = ?
    `;

    await executeQuery(query, [requisitionId, requisitionId]);
  },

  async getStats(options = {}) {
    const { vertical_id, program_id, start_date, end_date } = options;

    let whereConditions = ['1=1'];
    let queryParams = [];

    if (vertical_id) {
      whereConditions.push('r.vertical_id = ?');
      queryParams.push(vertical_id);
    }

    if (program_id) {
      whereConditions.push('r.program_id = ?');
      queryParams.push(program_id);
    }

    if (start_date) {
      whereConditions.push('r.created_at >= ?');
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push('r.created_at <= ?');
      queryParams.push(end_date);
    }

    const whereClause = whereConditions.join(' AND ');

    // Stats by status
    const statusStatsQuery = `
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(estimated_total), 0) as total_value
      FROM requisitions r
      WHERE ${whereClause}
      GROUP BY status
    `;

    const statusStats = await executeQuery(statusStatsQuery, queryParams);

    // Stats by priority
    const priorityStatsQuery = `
      SELECT
        priority,
        COUNT(*) as count
      FROM requisitions r
      WHERE ${whereClause}
      GROUP BY priority
    `;

    const priorityStats = await executeQuery(priorityStatsQuery, queryParams);

    // Total requisitions
    const totalQuery = `SELECT COUNT(*) as total, COALESCE(SUM(estimated_total), 0) as total_value FROM requisitions r WHERE ${whereClause}`;
    const totalResult = await executeQuery(totalQuery, queryParams);
    const total = totalResult[0].total;
    const totalValue = totalResult[0].total_value || 0;

    // Pending requisitions
    const pendingQuery = `SELECT COUNT(*) as total FROM requisitions r WHERE r.status = 'pending' ${vertical_id ? 'AND r.vertical_id = ?' : ''}`;
    const pendingResult = await executeQuery(pendingQuery, vertical_id ? [vertical_id] : []);
    const pending = pendingResult[0].total;

    // Average processing time (from pending to approved)
    const avgProcessingQuery = `
      SELECT AVG(DATEDIFF(approved_date, created_at)) as avg_days
      FROM requisitions
      WHERE status IN ('approved', 'ordered', 'received')
      ${vertical_id ? 'AND vertical_id = ?' : ''}
    `;
    const avgProcessingResult = await executeQuery(avgProcessingQuery, vertical_id ? [vertical_id] : []);
    const avgProcessingTime = avgProcessingResult[0].avg_days || 0;

    return {
      total_requisitions: total,
      pending_requisitions: pending,
      total_value: totalValue,
      avg_processing_days: parseFloat(avgProcessingTime).toFixed(2),
      by_status: statusStats,
      by_priority: priorityStats
    };
  }
};

export default Requisition;
