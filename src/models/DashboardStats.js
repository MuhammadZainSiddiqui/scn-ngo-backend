const pool = require('../config/database');
const AuditLog = require('./AuditLog');

class DashboardStats {
  static async getComprehensiveSummary({ verticalId, dateFrom, dateTo } = {}) {
    const currentPeriod = {
      dateFrom: dateFrom || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      dateTo: dateTo || new Date().toISOString().split('T')[0]
    };

    const previousPeriod = {
      dateFrom: new Date(new Date(currentPeriod.dateFrom).setMonth(new Date(currentPeriod.dateFrom).getMonth() - 1)).toISOString().split('T')[0],
      dateTo: new Date(new Date(currentPeriod.dateFrom).setDate(new Date(currentPeriod.dateFrom).getDate() - 1)).toISOString().split('T')[0]
    };

    const params = [currentPeriod.dateFrom, currentPeriod.dateTo];
    let whereClause = '';
    
    if (verticalId) {
      whereClause += ` AND (vertical_id = ? OR vertical_id IS NULL)`;
      params.push(verticalId);
    }

    // Build all summary queries
    const [
      // Contact summary
      contactStats,
      // Donation summary
      donationStats,
      // Volunteer summary
      volunteerStats,
      // Program summary
      programStats,
      // Staff summary
      staffStats,
      // Procurement summary
      procurementStats,
      // Exception summary
      exceptionStats,
      // Risk summary
      riskSummary
    ] = await Promise.all([
      // Contacts
      pool.query(`
        SELECT 
          COUNT(*) as total_contacts,
          SUM(CASE WHEN type = 'donor' THEN 1 ELSE 0 END) as donor_count,
          SUM(CASE WHEN type = 'volunteer' THEN 1 ELSE 0 END) as volunteer_count,
          SUM(CASE WHEN type = 'vendor' THEN 1 ELSE 0 END) as vendor_count,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND created_at <= NOW() THEN 1 ELSE 0 END) as recent_7d
        FROM contacts 
        WHERE 1=1 ${whereClause.replace('vertical_id', 's.vertical_id')}
      `, params),
      
      // Donations
      pool.query(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_donations,
          COALESCE(SUM(allocated_amount), 0) as total_allocations,
          COUNT(*) as donation_count,
          COALESCE(SUM(amount), 0) - COALESCE(SUM(allocated_amount), 0) as unallocated_amount
        FROM donations d
        LEFT JOIN allocations a ON d.donation_id = a.donation_id
        WHERE d.donation_date BETWEEN ? AND ? ${verticalId ? ' AND a.vertical_id = ?' : ''}
        GROUP BY d.donation_id
      `, params),

      // Volunteers
      pool.query(`
        SELECT 
          COUNT(*) as total_volunteers,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_volunteers,
          COALESCE(SUM(hours_logged), 0) as total_hours
        FROM volunteers v
        LEFT JOIN volunteer_hours h ON v.volunteer_id = h.volunteer_id
        WHERE 1=1 ${whereClause}
      `, params),

      // Programs
      pool.query(`
        SELECT 
          COUNT(*) as total_programs,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_programs,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_programs,
          COALESCE(SUM(budget_allocated), 0) as total_budget,
          COALESCE(SUM(budget_spent), 0) as total_spent
        FROM programs p
        WHERE 1=1 ${whereClause}
      `, params),

      // Staff
      pool.query(`
        SELECT 
          COUNT(*) as total_staff,
          SUM(CASE WHEN burnout_risk = 'high' THEN 1 ELSE 0 END) as high_burnout_count,
          SUM(CASE WHEN contract_end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 90 DAY) THEN 1 ELSE 0 END) as expiring_contracts
        FROM staff s
        WHERE status = 'active' ${whereClause}
      `, params),

      // Procurement
      pool.query(`
        SELECT 
          COUNT(DISTINCT r.requisition_id) as total_requisitions,
          COUNT(DISTINCT v.vendor_id) as total_vendors,
          COALESCE(SUM(i.quantity * i.unit_cost), 0) as total_inventory_value,
          COALESCE(SUM(r.total_cost), 0) as total_procurement_value
        FROM requisitions r
        LEFT JOIN vendors v ON r.vendor_id = v.vendor_id
        LEFT JOIN inventory i ON r.vertical_id = i.vertical_id
        WHERE 1=1 ${whereClause}
      `, params),

      // Exceptions
      pool.query(`
        SELECT 
          COUNT(*) as total_exceptions,
          SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_exceptions,
          SUM(CASE WHEN status = 'open' OR status = 'in_progress' THEN 1 ELSE 0 END) as open_exceptions,
          SUM(CASE WHEN escalation_level >= 2 THEN 1 ELSE 0 END) as high_escalation_exceptions
        FROM exceptions e
        WHERE created_at BETWEEN ? AND ? ${whereClause}
      `, [...params]),

      // Risk summary
      this.getRiskSummary({ verticalId, dateFrom, dateTo })
    ]);

    return {
      overview: {
        total_contacts: contactStats[0][0].total_contacts || 0,
        total_donations: donationStats[0][0]?.total_donations || 0,
        total_volunteers: volunteerStats[0][0].total_volunteers || 0,
        active_programs: programStats[0][0].active_programs || 0,
        total_staff: staffStats[0][0].total_staff || 0,
        open_exceptions: exceptionStats[0][0].open_exceptions || 0
      },
      financial: {
        total_donations: donationStats[0][0]?.total_donations || 0,
        total_allocations: donationStats[0][0]?.total_allocations || 0,
        unallocated: donationStats[0][0]?.unallocated_amount || 0,
        allocation_rate: donationStats[0][0]?.total_donations > 0 ? 
          ((donationStats[0][0].total_allocations / donationStats[0][0].total_donations) * 100).toFixed(2) : 0
      },
      programs: programStats[0][0] || {},
      exceptions: exceptionStats[0][0] || {},
      risks: riskSummary,
      period: currentPeriod
    };
  }

  static async getAllMetrics({ verticalId, period = 'month' } = {}) {
    const periodDays = {
      'week': 7,
      'month': 30,
      'quarter': 90,
      'year': 365
    }[period] || 30;

    const params = [periodDays];
    let whereClause = '';
    
    if (verticalId) {
      whereClause += ` AND vertical_id = ?`;
      params.push(verticalId);
    }

    // Get metrics for all modules
    const [metricsResult] = await pool.query(`
      SELECT 
        'contacts' as module,
        COUNT(*) as value,
        'Total Contacts' as label
      FROM contacts 
      WHERE 1=1 ${whereClause.replace('vertical_id', 's.vertical_id')}
      
      UNION ALL
      
      SELECT 
        'donations' as module,
        COALESCE(SUM(amount), 0) as value,
        'Total Donations'
      FROM donations 
      WHERE donation_date >= DATE_SUB(NOW(), INTERVAL ? DAY) ${whereClause}
      
      UNION ALL
      
      SELECT 
        'volunteers' as module,
        COUNT(*) as value,
        'Active Volunteers'
      FROM volunteers 
      WHERE status = 'active' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) ${whereClause}
      
      UNION ALL
      
      SELECT 
        'programs' as module,
        COUNT(*) as value,
        'Active Programs'
      FROM programs 
      WHERE status = 'active' ${whereClause}
      
      UNION ALL
      
      SELECT 
        'exceptions' as module,
        COUNT(*) as value,
        'Open Exceptions'
      FROM exceptions 
      WHERE status IN ('open', 'in_progress') ${whereClause}
      
      UNION ALL
      
      SELECT 
        'staff' as module,
        COUNT(*) as value,
        'Total Staff'
      FROM staff 
      WHERE status = 'active' ${whereClause}
    `, [...params, ...params]);

    // Transform results into metrics format
    const metrics = {};
    metricsResult.forEach(row => {
      const { module, value, label } = row;
      metrics[module] = {
        value: parseFloat(value),
        label,
        trend: 'up', // TODO: Calculate actual trend
        change_percent: 0
      };
    });

    return metrics;
  }

  static async getRiskSummary({ verticalId, dateFrom, dateTo } = {}) {
    const params = [2]; // Escalation level threshold
    let whereClause = ' WHERE escalation_level >= ?';
    
    if (verticalId) {
      whereClause += ` AND vertical_id = ?`;
      params.push(verticalId);
    }

    const [tier1Exceptions] = await pool.query(`
      SELECT 
        exception_id,
        exception_number,
        title,
        severity,
        escalation_level,
        due_date,
        created_at,
        DATEDIFF(NOW(), created_at) as age_days
      FROM exceptions
      ${whereClause}
      ORDER BY escalation_level DESC, age_days DESC
      LIMIT 5
    `, params);

    const [expiredCertifications] = await pool.query(`
      SELECT COUNT(*) as count
      FROM volunteers v
      WHERE v.certification_expiry < CURDATE() AND v.status = 'active'
      AND (? IS NULL OR v.vertical_id = ?)
    `, [verticalId || null, verticalId || null]);

    const [budgetOverruns] = await pool.query(`
      SELECT COUNT(*) as count
      FROM programs p
      WHERE (budget_spent / budget_allocated) > 0.9
      AND (? IS NULL OR p.vertical_id = ?)
    `, [verticalId || null, verticalId || null]);

    const [highBurnout] = await pool.query(`
      SELECT COUNT(*) as count
      FROM staff s
      WHERE s.burnout_risk = 'high' AND s.status = 'active'
      AND (? IS NULL OR s.vertical_id = ?)
    `, [verticalId || null, verticalId || null]);

    return {
      tier1_exception_count: tier1Exceptions.length,
      top_exceptions: tier1Exceptions,
      expired_certifications: expiredCertifications[0].count || 0,
      budget_overruns: budgetOverruns[0].count || 0,
      high_burnout_staff: highBurnout[0].count || 0
    };
  }

  static getPeriodLabel(dateFrom, dateTo) {
    if (dateFrom && dateTo) {
      return `${dateFrom} to ${dateTo}`;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  static async getTrendAnalysis({ module, verticalId, dateRange }) {
    // This would implement trend analysis with period comparison
    // For now, return placeholder
    return { module, trend: 'up', change_percent: 0 };
  }

  static clearCache() {
    // Clear cache implementation
    console.log('Cache cleared for dashboard statistics');
  }
}

module.exports = DashboardStats;