const pool = require('../config/database');

class RiskAssessment {
  static async getTier1Risks({ verticalId, dateFrom, dateTo } = {}) {
    const risks = {
      tier1: [],
      tier2: [],
      tier3: [],
      summary: {
        tier1_count: 0,
        tier2_count: 0,
        tier3_count: 0,
        total_risk_score: 0
      }
    };

    // Gather all risk types
    const [
      criticalExceptions,
      overdueExceptions,
      expiredCertifications,
      budgetOverruns,
      highBurnout,
      lowStock,
      expiringContracts
    ] = await Promise.all([
      // Critical exceptions (>= 2 escalations)
      this.getCriticalExceptions(verticalId),
      
      // Overdue exceptions
      this.getOverdueExceptions(verticalId),
      
      // Expired certifications
      this.getExpiredCertifications(verticalId),
      
      // Budget overruns (> 90% utilization)
      this.getBudgetOverruns(verticalId),
      
      // High burnout risk staff
      this.getHighBurnoutStaff(verticalId),
      
      // Critical low stock
      this.getCriticalLowStock(verticalId),
      
      // Expiring contracts (30 days)
      this.getExpiringContracts(verticalId)
    ]);

    // Categorize risks
    risks.tier1.push(...criticalExceptions, ...overdueExceptions, ...budgetOverruns);
    risks.tier2.push(...expiredCertifications, ...highBurnout, ...expiringContracts);
    risks.tier3.push(...lowStock);

    // Update summary
    risks.summary.tier1_count = risks.tier1.length;
    risks.summary.tier2_count = risks.tier2.length;
    risks.summary.tier3_count = risks.tier3.length;
    risks.summary.total_risk_score = this.calculateTotalRiskScore(risks);

    return risks;
  }

  static async getCriticalExceptions(verticalId) {
    const whereClause = verticalId ? ' AND vertical_id = ?' : '';
    const [exceptions] = await pool.query(`
      SELECT 
        e.exception_id,
        e.exception_number,
        e.title,
        e.severity,
        e.escalation_level,
        e.due_date,
        e.created_at,
        e.assigned_to,
        DATEDIFF(NOW(), e.created_at) as age_days,
        'Exception' as risk_type,
        'tier1' as tier,
        'Critical exception with high escalation' as description
      FROM exceptions e
      WHERE escalation_level >= 2 ${whereClause}
      ORDER BY escalation_level DESC, age_days DESC
    `, verticalId ? [verticalId] : []);

    return exceptions.map(ex => ({
      ...ex,
      risk_score: this.calculateRiskScore(ex, 'exception')
    }));
  }

  static async getOverdueExceptions(verticalId) {
    const whereClause = verticalId ? ' AND vertical_id = ?' : '';
    const [exceptions] = await pool.query(`
      SELECT 
        e.exception_id,
        e.exception_number,
        e.title,
        e.severity,
        e.due_date,
        DATEDIFF(NOW(), e.due_date) as days_overdue,
        'Exception' as risk_type,
        'tier1' as tier,
        'Exception is overdue' as description
      FROM exceptions e
      WHERE e.due_date < CURDATE() 
        AND e.status IN ('open', 'in_progress')
        ${whereClause}
      ORDER BY days_overdue DESC
    `, verticalId ? [verticalId] : []);

    return exceptions.map(ex => ({
      ...ex,
      risk_score: this.calculateRiskScore(ex, 'overdue_exception')
    }));
  }

  static async getExpiredCertifications(verticalId) {
    const whereClause = verticalId ? ' AND v.vertical_id = ?' : '';
    const [volunteers] = await pool.query(`
      SELECT 
        v.volunteer_id,
        v.name as volunteer_name,
        v.certification_expiry,
        DATEDIFF(CURDATE(), v.certification_expiry) as days_expired,
        v.vertical_id,
        'Volunteer' as risk_type,
        'tier2' as tier,
        'Volunteer certification expired' as description
      FROM volunteers v
      WHERE v.certification_expiry < CURDATE()
        AND v.status = 'active'
        ${whereClause}
    `, verticalId ? [verticalId] : []);

    return volunteers.map(vol => ({
      ...vol,
      risk_score: this.calculateRiskScore(vol, 'expired_certification')
    }));
  }

  static async getBudgetOverruns(verticalId) {
    const whereClause = verticalId ? ' AND p.vertical_id = ?' : '';
    const [programs] = await pool.query(`
      SELECT 
        p.program_id,
        p.name as program_name,
        p.budget_allocated,
        p.budget_spent,
        (p.budget_spent / p.budget_allocated) * 100 as utilization_percent,
        p.vertical_id,
        'Project' as risk_type,
        'tier1' as tier,
        'Budget overrun detected' as description
      FROM programs p
      WHERE (p.budget_spent / p.budget_allocated) > 0.9
        AND p.status = 'active'
        ${whereClause}
    `, verticalId ? [verticalId] : []);

    return programs.map(prog => ({
      ...prog,
      risk_score: this.calculateRiskScore(prog, 'budget_overrun')
    }));
  }

  static async getHighBurnoutStaff(verticalId) {
    const whereClause = verticalId ? ' AND s.vertical_id = ?' : '';
    const [staff] = await pool.query(`
      SELECT 
        s.staff_id,
        s.name as staff_name,
        s.burnout_risk,
        s.burnout_score,
        DATEDIFF(CURDATE(), s.join_date) as tenure_days,
        s.vertical_id,
        'HR' as risk_type,
        'tier2' as tier,
        'High burnout risk staff member' as description
      FROM staff s
      WHERE s.burnout_risk = 'high'
        AND s.status = 'active'
        ${whereClause}
    `, verticalId ? [verticalId] : []);

    return staff.map(st => ({
      ...st,
      risk_score: this.calculateRiskScore(st, 'high_burnout')
    }));
  }

  static async getCriticalLowStock(verticalId) {
    const whereClause = verticalId ? ' AND i.vertical_id = ?' : '';
    const [inventory] = await pool.query(`
      SELECT 
        i.inventory_id,
        i.item_name,
        i.quantity,
        i.min_stock_level,
        i.unit_cost,
        (i.quantity * i.unit_cost) as stock_value,
        i.vertical_id,
        'Inventory' as risk_type,
        'tier3' as tier,
        'Critical low stock alert' as description
      FROM inventory i
      WHERE i.quantity <= i.min_stock_level
        AND i.status = 'active'
        ${whereClause}
      ORDER BY (i.quantity / i.min_stock_level) ASC
    `, verticalId ? [verticalId] : []);

    return inventory.map(inv => ({
      ...inv,
      risk_score: this.calculateRiskScore(inv, 'low_stock')
    }));
  }

  static async getExpiringContracts(verticalId) {
    const whereClause = verticalId ? ' AND s.vertical_id = ?' : '';
    const [contracts] = await pool.query(`
      SELECT 
        s.staff_id,
        s.name as staff_name,
        s.contract_end_date,
        DATEDIFF(s.contract_end_date, CURDATE()) as days_until_expiry,
        s.position,
        s.vertical_id,
        'HR' as risk_type,
        'tier2' as tier,
        'Expiring staff contract' as description
      FROM staff s
      WHERE s.contract_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)
        AND s.status = 'active'
        ${whereClause}
      ORDER BY days_until_expiry ASC
    `, verticalId ? [verticalId] : []);

    return contracts.map(con => ({
      ...con,
      risk_score: this.calculateRiskScore(con, 'expiring_contract')
    }));
  }

  static calculateRiskScore(riskItem, riskType) {
    const baseScores = {
      exception: 10,
      overdue_exception: 15,
      expired_certification: 5,
      budget_overrun: 12,
      high_burnout: 8,
      low_stock: 3,
      expiring_contract: 6
    };

    let score = baseScores[riskType] || 5;

    // Adjust based on severity/age
    if (riskItem.days_overdue) {
      score += Math.min(riskItem.days_overdue * 0.5, 10);
    }

    if (riskItem.age_days) {
      score += Math.min(riskItem.age_days * 0.2, 8);
    }

    if (riskItem.escalation_level) {
      score += riskItem.escalation_level * 3;
    }

    if (riskItem.utilization_percent) {
      score += Math.min((riskItem.utilization_percent - 90) * 0.1, 8);
    }

    return Math.round(score * 10) / 10;
  }

  static calculateTotalRiskScore(risks) {
    const allRisks = [...risks.tier1, ...risks.tier2, ...risks.tier3];
    return allRisks.reduce((total, risk) => total + (risk.risk_score || 0), 0);
  }

  static async getComplianceMetrics({ verticalId }) {
    const whereClause = verticalId ? ' WHERE vertical_id = ?' : '';
    const params = verticalId ? [verticalId] : [];

    const [metrics] = await Promise.all([
      // Certification compliance
      pool.query(`
        SELECT 
          'certification' as type,
          COUNT(*) as total,
          SUM(CASE WHEN certification_expiry >= CURDATE() THEN 1 ELSE 0 END) as compliant,
          SUM(CASE WHEN certification_expiry < CURDATE() THEN 1 ELSE 0 END) as non_compliant
        FROM volunteers v
        WHERE status = 'active'
        ${verticalId ? ' AND v.vertical_id = ?' : ''}
      `, params)
    ]);

    return {
      certification: {
        total: metrics[0][0]?.total || 0,
        compliant: metrics[0][0]?.compliant || 0,
        non_compliant: metrics[0][0]?.non_compliant || 0,
        compliance_rate: metrics[0][0]?.total > 0 ? 
          ((metrics[0][0].compliant / metrics[0][0].total) * 100).toFixed(2) : 0
      }
    };
  }

  static async getAlerts({ verticalId, severity }) {
    const risks = await this.getTier1Risks({ verticalId });
    
    // Filter alerts by severity based on risk score
    const filteredAlerts = {
      critical: risks.tier1.filter(r => r.risk_score >= 15),
      warning: [...risks.tier1.filter(r => r.risk_score < 15), ...risks.tier2],
      info: risks.tier3
    };

    const result = {};
    if (!severity) {
      Object.assign(result, filteredAlerts);
    } else if (filteredAlerts[severity]) {
      result[severity] = filteredAlerts[severity];
    }

    return {
      alerts: result,
      total_count: Object.values(filteredAlerts).reduce((sum, arr) => sum + arr.length, 0),
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = RiskAssessment;