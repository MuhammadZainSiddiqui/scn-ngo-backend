import { executeQuery } from '../config/database.js';

export const Allocation = {
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      donation_id,
      vertical_id,
      program_id,
      sort = 'da.created_at',
      order = 'desc'
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['1=1'];
    let queryParams = [];

    if (donation_id) {
      whereConditions.push('da.donation_id = ?');
      queryParams.push(donation_id);
    }

    if (vertical_id) {
      whereConditions.push('da.vertical_id = ?');
      queryParams.push(vertical_id);
    }

    if (program_id) {
      whereConditions.push('da.program_id = ?');
      queryParams.push(program_id);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        da.*,
        d.donation_number, d.amount as donation_amount, d.donation_date,
        c.first_name, c.last_name, c.organization_name as donor_name,
        v.name as vertical_name,
        p.name as program_name
      FROM donation_allocations da
      LEFT JOIN donations d ON da.donation_id = d.id
      LEFT JOIN contacts c ON d.donor_id = c.id
      LEFT JOIN verticals v ON da.vertical_id = v.id
      LEFT JOIN programs p ON da.program_id = p.id
      WHERE ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);
    const results = await executeQuery(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM donation_allocations da
      WHERE ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, queryParams.slice(0, -2));
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

  async findById(id) {
    const query = `
      SELECT 
        da.*,
        d.donation_number, d.amount as donation_amount, d.donation_date,
        c.first_name, c.last_name, c.organization_name as donor_name,
        v.name as vertical_name,
        p.name as program_name
      FROM donation_allocations da
      LEFT JOIN donations d ON da.donation_id = d.id
      LEFT JOIN contacts c ON d.donor_id = c.id
      LEFT JOIN verticals v ON da.vertical_id = v.id
      LEFT JOIN programs p ON da.program_id = p.id
      WHERE da.id = ?
    `;

    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async findByDonation(donationId) {
    const query = `
      SELECT 
        da.*,
        v.name as vertical_name,
        p.name as program_name
      FROM donation_allocations da
      LEFT JOIN verticals v ON da.vertical_id = v.id
      LEFT JOIN programs p ON da.program_id = p.id
      WHERE da.donation_id = ?
      ORDER BY da.created_at
    `;

    const results = await executeQuery(query, [donationId]);
    return results;
  },

  async findByVertical(verticalId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        da.*,
        d.donation_number, d.amount as donation_amount, d.donation_date,
        c.first_name, c.last_name, c.organization_name as donor_name,
        p.name as program_name
      FROM donation_allocations da
      LEFT JOIN donations d ON da.donation_id = d.id
      LEFT JOIN contacts c ON d.donor_id = c.id
      LEFT JOIN programs p ON da.program_id = p.id
      WHERE da.vertical_id = ?
      ORDER BY d.donation_date DESC
      LIMIT ? OFFSET ?
    `;

    const results = await executeQuery(query, [verticalId, limit, offset]);

    const countQuery = 'SELECT COUNT(*) as total FROM donation_allocations WHERE vertical_id = ?';
    const countResult = await executeQuery(countQuery, [verticalId]);
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

  async findByProgram(programId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        da.*,
        d.donation_number, d.amount as donation_amount, d.donation_date,
        c.first_name, c.last_name, c.organization_name as donor_name,
        v.name as vertical_name
      FROM donation_allocations da
      LEFT JOIN donations d ON da.donation_id = d.id
      LEFT JOIN contacts c ON d.donor_id = c.id
      LEFT JOIN verticals v ON da.vertical_id = v.id
      WHERE da.program_id = ?
      ORDER BY d.donation_date DESC
      LIMIT ? OFFSET ?
    `;

    const results = await executeQuery(query, [programId, limit, offset]);

    const countQuery = 'SELECT COUNT(*) as total FROM donation_allocations WHERE program_id = ?';
    const countResult = await executeQuery(countQuery, [programId]);
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

  async create(allocationData) {
    const { donation_id, vertical_id, program_id, amount, allocation_percentage, notes } = allocationData;

    // Verify donation exists and is confirmed
    const donationQuery = 'SELECT amount, payment_status FROM donations WHERE id = ?';
    const donationResult = await executeQuery(donationQuery, [donation_id]);
    
    if (donationResult.length === 0) {
      throw new Error('Donation not found');
    }

    const donation = donationResult[0];
    if (donation.payment_status !== 'received') {
      throw new Error('Can only allocate from confirmed donations');
    }

    // Check if total allocations would exceed donation amount
    const totalAllocated = await this.getTotalAllocated(donation_id);
    if (totalAllocated + amount > donation.amount) {
      throw new Error('Total allocations would exceed donation amount');
    }

    const query = `
      INSERT INTO donation_allocations (donation_id, vertical_id, program_id, amount, allocation_percentage, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [donation_id, vertical_id, program_id, amount, allocation_percentage, notes];
    const result = await executeQuery(query, params);
    
    return this.findById(result.insertId);
  },

  async update(id, updateData) {
    const allowedFields = ['vertical_id', 'program_id', 'amount', 'allocation_percentage', 'notes'];
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

    // If amount is being updated, check allocation limits
    if (updateData.amount !== undefined) {
      const allocation = await this.findById(id);
      if (!allocation) {
        throw new Error('Allocation not found');
      }

      const donationQuery = 'SELECT amount FROM donations WHERE id = ?';
      const donationResult = await executeQuery(donationQuery, [allocation.donation_id]);
      const donation = donationResult[0];

      const totalAllocated = await this.getTotalAllocated(allocation.donation_id, id);
      if (totalAllocated + updateData.amount > donation.amount) {
        throw new Error('Updated allocation would exceed donation amount');
      }
    }

    params.push(id);

    const query = `
      UPDATE donation_allocations 
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    await executeQuery(query, params);
    return this.findById(id);
  },

  async delete(id) {
    const allocation = await this.findById(id);
    if (!allocation) {
      throw new Error('Allocation not found');
    }

    const query = 'DELETE FROM donation_allocations WHERE id = ?';
    await executeQuery(query, [id]);

    return allocation;
  },

  async getTotalAllocated(donationId, excludeId = null) {
    let query = 'SELECT COALESCE(SUM(amount), 0) as total FROM donation_allocations WHERE donation_id = ?';
    const params = [donationId];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await executeQuery(query, params);
    return parseFloat(result[0].total);
  },

  async reallocate(allocationId, newVerticalId, newProgramId = null) {
    // Get the existing allocation
    const existingAllocation = await this.findById(allocationId);
    if (!existingAllocation) {
      throw new Error('Allocation not found');
    }

    // Delete the existing allocation
    await this.delete(allocationId);

    // Create a new allocation with the same amount
    const newAllocation = await this.create({
      donation_id: existingAllocation.donation_id,
      vertical_id: newVerticalId,
      program_id: newProgramId,
      amount: existingAllocation.amount,
      allocation_percentage: existingAllocation.allocation_percentage,
      notes: `Reallocated from allocation ${allocationId}`
    });

    return newAllocation;
  }
};

export default Allocation;