import { executeQuery, executeTransaction } from '../config/database.js';

export const Donation = {
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      donor_id,
      vertical_id,
      program_id,
      payment_status,
      date_from,
      date_to,
      search,
      sort = 'd.created_at',
      order = 'desc'
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['1=1'];
    let queryParams = [];

    // Build WHERE conditions
    if (donor_id) {
      whereConditions.push('d.donor_id = ?');
      queryParams.push(donor_id);
    }

    if (vertical_id) {
      whereConditions.push('d.vertical_id = ?');
      queryParams.push(vertical_id);
    }

    if (program_id) {
      whereConditions.push('d.program_id = ?');
      queryParams.push(program_id);
    }

    if (payment_status) {
      whereConditions.push('d.payment_status = ?');
      queryParams.push(payment_status);
    }

    if (date_from) {
      whereConditions.push('d.donation_date >= ?');
      queryParams.push(date_from);
    }

    if (date_to) {
      whereConditions.push('d.donation_date <= ?');
      queryParams.push(date_to);
    }

    if (search) {
      whereConditions.push('(c.first_name LIKE ? OR c.last_name LIKE OR c.organization_name LIKE ? OR d.donation_number LIKE ? OR d.receipt_number LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM donations d
      LEFT JOIN contacts c ON d.donor_id = c.id
      WHERE ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    // Main query with JOINs
    const query = `
      SELECT 
        d.*,
        c.first_name, c.last_name, c.organization_name, c.email as donor_email, c.phone as donor_phone,
        v.name as vertical_name,
        p.name as program_name,
        u.first_name as received_by_first_name, u.last_name as received_by_last_name
      FROM donations d
      LEFT JOIN contacts c ON d.donor_id = c.id
      LEFT JOIN verticals v ON d.vertical_id = v.id
      LEFT JOIN programs p ON d.program_id = p.id
      LEFT JOIN users u ON d.received_by = u.id
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
        d.*,
        c.first_name, c.last_name, c.organization_name, c.email as donor_email, c.phone as donor_phone,
        v.name as vertical_name,
        p.name as program_name,
        u.first_name as received_by_first_name, u.last_name as received_by_last_name
      FROM donations d
      LEFT JOIN contacts c ON d.donor_id = c.id
      LEFT JOIN verticals v ON d.vertical_id = v.id
      LEFT JOIN programs p ON d.program_id = p.id
      LEFT JOIN users u ON d.received_by = u.id
      WHERE d.id = ?
    `;

    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async create(donationData) {
    const {
      donor_id,
      amount,
      currency = 'INR',
      payment_method,
      payment_reference,
      donation_type = 'one_time',
      frequency,
      campaign,
      purpose,
      anonymous = false,
      vertical_id,
      program_id,
      received_by,
      notes,
      donation_date
    } = donationData;

    // Generate unique donation number
    const donationNumber = await this.generateDonationNumber();

    const query = `
      INSERT INTO donations (
        donation_number, donor_id, amount, currency, payment_method, payment_reference,
        donation_type, frequency, campaign, purpose, anonymous, vertical_id, program_id,
        received_by, notes, donation_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      donationNumber, donor_id, amount, currency, payment_method, payment_reference,
      donation_type, frequency, campaign, purpose, anonymous, vertical_id, program_id,
      received_by, notes, donation_date
    ];

    const result = await executeQuery(query, params);
    return this.findById(result.insertId);
  },

  async update(id, updateData) {
    const allowedFields = [
      'amount', 'currency', 'payment_method', 'payment_reference', 'donation_type',
      'frequency', 'campaign', 'purpose', 'anonymous', 'vertical_id', 'program_id', 'notes'
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
      UPDATE donations 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, params);
    return this.findById(id);
  },

  async updateStatus(id, payment_status) {
    const query = `
      UPDATE donations 
      SET payment_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [payment_status, id]);
    return this.findById(id);
  },

  async delete(id) {
    // First get the donation to check if it can be deleted
    const donation = await this.findById(id);
    if (!donation) {
      throw new Error('Donation not found');
    }

    if (donation.payment_status === 'received') {
      throw new Error('Cannot delete confirmed donation. Change status to failed instead.');
    }

    const query = 'DELETE FROM donations WHERE id = ?';
    await executeQuery(query, [id]);

    return donation;
  },

  async search(searchTerm) {
    const query = `
      SELECT 
        d.*,
        c.first_name, c.last_name, c.organization_name, c.email as donor_email,
        v.name as vertical_name,
        p.name as program_name
      FROM donations d
      LEFT JOIN contacts c ON d.donor_id = c.id
      LEFT JOIN verticals v ON d.vertical_id = v.id
      LEFT JOIN programs p ON d.program_id = p.id
      WHERE (
        c.first_name LIKE ? OR 
        c.last_name LIKE ? OR 
        c.organization_name LIKE ? OR 
        d.donation_number LIKE ? OR 
        d.receipt_number LIKE ? OR
        d.payment_reference LIKE ?
      )
      ORDER BY d.created_at DESC
    `;

    const searchPattern = `%${searchTerm}%`;
    const results = await executeQuery(query, [
      searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern
    ]);

    return results;
  },

  async getByDonor(donorId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        d.*,
        v.name as vertical_name,
        p.name as program_name
      FROM donations d
      LEFT JOIN verticals v ON d.vertical_id = v.id
      LEFT JOIN programs p ON d.program_id = p.id
      WHERE d.donor_id = ?
      ORDER BY d.donation_date DESC
      LIMIT ? OFFSET ?
    `;

    const results = await executeQuery(query, [donorId, limit, offset]);

    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM donations WHERE donor_id = ?';
    const countResult = await executeQuery(countQuery, [donorId]);
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

  async getByVertical(verticalId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        d.*,
        c.first_name, c.last_name, c.organization_name,
        p.name as program_name,
        COALESCE(SUM(da.amount), 0) as allocated_amount
      FROM donations d
      LEFT JOIN contacts c ON d.donor_id = c.id
      LEFT JOIN programs p ON d.program_id = p.id
      LEFT JOIN donation_allocations da ON d.id = da.donation_id AND da.vertical_id = ?
      WHERE d.vertical_id = ?
      GROUP BY d.id
      ORDER BY d.donation_date DESC
      LIMIT ? OFFSET ?
    `;

    const results = await executeQuery(query, [verticalId, verticalId, limit, offset]);

    const countQuery = 'SELECT COUNT(*) as total FROM donations WHERE vertical_id = ?';
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

  async getByProgram(programId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        d.*,
        c.first_name, c.last_name, c.organization_name,
        v.name as vertical_name,
        COALESCE(SUM(da.amount), 0) as allocated_amount
      FROM donations d
      LEFT JOIN contacts c ON d.donor_id = c.id
      LEFT JOIN verticals v ON d.vertical_id = v.id
      LEFT JOIN donation_allocations da ON d.id = da.donation_id AND da.program_id = ?
      WHERE d.program_id = ?
      GROUP BY d.id
      ORDER BY d.donation_date DESC
      LIMIT ? OFFSET ?
    `;

    const results = await executeQuery(query, [programId, programId, limit, offset]);

    const countQuery = 'SELECT COUNT(*) as total FROM donations WHERE program_id = ?';
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

  async getStats(options = {}) {
    const { date_from, date_to, vertical_id } = options;

    let whereConditions = ['1=1'];
    let queryParams = [];

    if (date_from) {
      whereConditions.push('donation_date >= ?');
      queryParams.push(date_from);
    }

    if (date_to) {
      whereConditions.push('donation_date <= ?');
      queryParams.push(date_to);
    }

    if (vertical_id) {
      whereConditions.push('vertical_id = ?');
      queryParams.push(vertical_id);
    }

    const whereClause = whereConditions.join(' AND ');

    // Basic stats
    const basicStatsQuery = `
      SELECT 
        COUNT(*) as total_donations,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as average_amount,
        payment_status
      FROM donations
      WHERE ${whereClause}
      GROUP BY payment_status
    `;

    const basicStats = await executeQuery(basicStatsQuery, queryParams);

    // Monthly trends
    const trendsQuery = `
      SELECT 
        DATE_FORMAT(donation_date, '%Y-%m') as month,
        COUNT(*) as donation_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM donations
      WHERE ${whereClause}
      GROUP BY DATE_FORMAT(donation_date, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `;

    const trends = await executeQuery(trendsQuery, queryParams);

    // Top donors
    const topDonorsQuery = `
      SELECT 
        c.first_name, c.last_name, c.organization_name,
        COUNT(d.id) as donation_count,
        COALESCE(SUM(d.amount), 0) as total_amount
      FROM donations d
      LEFT JOIN contacts c ON d.donor_id = c.id
      WHERE ${whereClause}
      GROUP BY d.donor_id
      ORDER BY total_amount DESC
      LIMIT 10
    `;

    const topDonors = await executeQuery(topDonorsQuery, queryParams);

    // Donations by vertical
    const verticalStatsQuery = `
      SELECT 
        v.name as vertical_name,
        COUNT(d.id) as donation_count,
        COALESCE(SUM(d.amount), 0) as total_amount
      FROM donations d
      LEFT JOIN verticals v ON d.vertical_id = v.id
      WHERE ${whereClause}
      GROUP BY d.vertical_id
      ORDER BY total_amount DESC
    `;

    const verticalStats = await executeQuery(verticalStatsQuery, queryParams);

    // Process basic stats
    const stats = {
      total_donations: 0,
      total_amount: 0,
      average_amount: 0,
      by_status: {}
    };

    let totalAmount = 0;
    let totalCount = 0;

    basicStats.forEach(stat => {
      totalAmount += parseFloat(stat.total_amount);
      totalCount += parseInt(stat.total_donations);
      stats.by_status[stat.payment_status] = {
        count: parseInt(stat.total_donations),
        amount: parseFloat(stat.total_amount)
      };
    });

    stats.total_donations = totalCount;
    stats.total_amount = totalAmount;
    stats.average_amount = totalCount > 0 ? totalAmount / totalCount : 0;

    return {
      ...stats,
      monthly_trends: trends,
      top_donors: topDonors,
      by_vertical: verticalStats
    };
  },

  async getDonationsByDateRange(startDate, endDate, options = {}) {
    const { page = 1, limit = 10, vertical_id } = options;
    const offset = (page - 1) * limit;

    let whereConditions = ['d.donation_date >= ? AND d.donation_date <= ?'];
    let queryParams = [startDate, endDate];

    if (vertical_id) {
      whereConditions.push('d.vertical_id = ?');
      queryParams.push(vertical_id);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        d.*,
        c.first_name, c.last_name, c.organization_name,
        v.name as vertical_name,
        p.name as program_name
      FROM donations d
      LEFT JOIN contacts c ON d.donor_id = c.id
      LEFT JOIN verticals v ON d.vertical_id = v.id
      LEFT JOIN programs p ON d.program_id = p.id
      WHERE ${whereClause}
      ORDER BY d.donation_date DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);
    const results = await executeQuery(query, queryParams);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM donations d
      WHERE ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
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

  async checkTransactionIdExists(transactionId, excludeId = null) {
    let query = 'SELECT id FROM donations WHERE payment_reference = ?';
    const params = [transactionId];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const results = await executeQuery(query, params);
    return results.length > 0;
  },

  async generateDonationNumber() {
    const prefix = 'DON';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  },

  async issueReceipt(id) {
    // Generate unique receipt number
    const receiptNumber = await this.generateReceiptNumber();

    const query = `
      UPDATE donations 
      SET receipt_number = ?, receipt_issued_date = CURDATE(), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [receiptNumber, id]);
    return this.findById(id);
  },

  async generateReceiptNumber() {
    const prefix = 'RCPT';
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${prefix}${year}${timestamp}${random}`;
  }
};

export default Donation;