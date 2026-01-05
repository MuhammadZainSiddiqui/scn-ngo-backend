const pool = require('../config/database');

class VerticalHealth {
  static async calculateHealth(verticalId) {
    const healthComponents = await this.getHealthComponents(verticalId);
    
    const weights = {
      financialHealth: 0.25,
      operationalEfficiency: 0.25,
      staffSatisfaction: 0.25,
      programQuality: 0.25
    };

    const financialHealthScore = this.calculateFinancialHealth(healthComponents.financial) * 100;
    const operationalEfficiencyScore = this.calculateOperationalEfficiency(healthComponents.operational) * 100;
    const staffSatisfactionScore = this.calculateStaffSatisfaction(healthComponents.staff) * 100;
    const programQualityScore = this.calculateProgramQuality(healthComponents.programs) * 100;

    const overallScore = (
      financialHealthScore * weights.financialHealth +
      operationalEfficiencyScore * weights.operationalEfficiency +
      staffSatisfactionScore * weights.staffSatisfaction +
      programQualityScore * weights.programQuality
    );

    const status = this.getHealthStatus(overallScore);

    return {
      vertical_id: verticalId,
      overall_score: Math.round(overallScore * 100) / 100,
      status,
      components: {
        financial: {
          score: Math.round(financialHealthScore * 100) / 100,
          metrics: healthComponents.financial
        },
        operational: {
          score: Math.round(operationalEfficiencyScore * 100) / 100,
          metrics: healthComponents.operational
        },
        staff: {
          score: Math.round(staffSatisfactionScore * 100) / 100,
          metrics: healthComponents.staff
        },
        programs: {
          score: Math.round(programQualityScore * 100) / 100,
          metrics: healthComponents.programs
        }
      },
      calculated_at: new Date().toISOString()
    };
  }

  static async getHealthComponents(verticalId) {
    const whereClause = verticalId ? ` WHERE vertical_id = ?` : '';
    const params = verticalId ? [verticalId] : [];

    const [
      financialMetrics,
      operationalMetrics,
      staffMetrics,
      programMetrics
    ] = await Promise.all([
      // Financial health components
      pool.query(`
        SELECT 
          COALESCE(SUM(d.amount), 0) as total_income,
          COALESCE(SUM(a.allocated_amount), 0) as total_expenses,
          COUNT(DISTINCT d.donation_id) as donor_count,
          COUNT(DISTINCT d.donor_id) as unique_donors
        FROM donations d
        LEFT JOIN allocations a ON d.donation_id = a.donation_id
        ${whereClause}
      `, params),

      // Operational efficiency components
      pool.query(`
        SELECT 
          COUNT(DISTINCT CASE WHEN e.status IN ('open', 'in_progress') THEN e.exception_id END) as open_exceptions,
          AVG(CASE WHEN e.resolved_at IS NOT NULL THEN DATEDIFF(e.resolved_at, e.created_at) END) as avg_resolution_time,
          COUNT(DISTINCT CASE WHEN r.status = 'ordered' THEN r.requisition_id END) as pending_orders,
          COUNT(DISTINCT CASE WHEN i.quantity <= i.min_stock_level THEN i.inventory_id END) as low_stock_items
        FROM verticals v
        LEFT JOIN exceptions e ON v.vertical_id = e.vertical_id
        LEFT JOIN requisitions r ON v.vertical_id = r.vertical_id
        LEFT JOIN inventory i ON v.vertical_id = i.vertical_id
        ${whereClause || ' WHERE 1=1'}
      `, params),

      // Staff satisfaction components
      pool.query(`
        SELECT 
          COUNT(DISTINCT s.staff_id) as total_staff,
          SUM(CASE WHEN s.burnout_risk = 'high' THEN 1 ELSE 0 END) as high_burnout,
          SUM(CASE WHEN s.burnout_risk = 'medium' THEN 1 ELSE 0 END) as medium_burnout,
          AVG(DATEDIFF(CURRENT_DATE, s.join_date)) as avg_tenure_days
        FROM staff s
        WHERE s.status = 'active'
        ${whereClause ? ` AND s${whereClause.replace(' WHERE', '.vertical_id = ?')}` : ''}
      `, params),

      // Program quality components
      pool.query(`
        SELECT 
          COUNT(DISTINCT p.program_id) as total_programs,
          SUM(CASE WHEN p.status = 'active' THEN 1 ELSE 0 END) as active_programs,
          SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed_programs,
          AVG(CASE WHEN p.budget_allocated > 0 THEN p.budget_spent / p.budget_allocated ELSE 0 END) as budget_utilization,
          COUNT(DISTINCT k.kpi_id) as total_kpis,
          SUM(CASE WHEN k.achieved >= k.target THEN 1 ELSE 0 END) as achieved_kpis
        FROM programs p
        LEFT JOIN kpi k ON p.program_id = k.program_id
        ${whereClause}
      `, params)
    ]);

    return {
      financial: financialMetrics[0][0],
      operational: operationalMetrics[0][0],
      staff: staffMetrics[0][0],
      programs: programMetrics[0][0]
    };
  }

  static calculateFinancialHealth(metrics) {
    let score = 0;
    
    // Income to expense ratio (40% weight)
    if (metrics.total_income > 0) {
      const ratio = metrics.total_income / Math.max(metrics.total_expenses, 1);
      score += Math.min(ratio, 2) * 0.4;
    }

    // Donor diversity (30% weight)
    if (metrics.donor_count > 0 && metrics.unique_donors > 0) {
      const diversityRatio = metrics.unique_donors / metrics.donor_count;
      score += diversityRatio * 0.3;
    }

    // Financial stability (30% weight)
    score += (metrics.total_income > metrics.total_expenses ? 0.3 : 0);

    return Math.min(score, 1);
  }

  static calculateOperationalEfficiency(metrics) {
    let score = 1.0;

    // Reduce score based on open exceptions
    if (metrics.open_exceptions > 0) {
      score -= Math.min(metrics.open_exceptions * 0.05, 0.3);
    }

    // Reduce score based on long resolution times
    if (metrics.avg_resolution_time > 7) {
      score -= Math.min((metrics.avg_resolution_time - 7) * 0.01, 0.2);
    }

    // Reduce score based on pending orders
    if (metrics.pending_orders > 5) {
      score -= Math.min((metrics.pending_orders - 5) * 0.02, 0.2);
    }

    // ICAO: Fixed typo - low_stock_items
    if (metrics.low_stock_items > 3) {
      score -= Math.min((metrics.low_stock_items - 3) * 0.03, 0.15);
    }

    return Math.max(score, 0);
  }

  static calculateStaffSatisfaction(metrics) {
    if (!metrics.total_staff || metrics.total_staff === 0) return 1;

    let score = 1.0;

    // Reduce score based on burnout
    const highBurnoutRatio = (metrics.high_burnout || 0) / metrics.total_staff;
    const mediumBurnoutRatio = (metrics.medium_burnout || 0) / metrics.total_staff;
    
    score -= (highBurnoutRatio * 0.4);
    score -= (mediumBurnoutRatio * 0.2);

    // Increase score based on tenure
    if (metrics.avg_tenure_days > 365) {
      score += 0.1;
    }

    return Math.max(Math.min(score, 1), 0);
  }

  static calculateProgramQuality(metrics) {
    if (!metrics.total_programs || metrics.total_programs === 0) return 0.5;

    let score = 0.5; // Base score

    // Budget utilization (40% weight)
    if (metrics.budget_utilization > 0) {
      const utilization = Math.min(metrics.budget_utilization, 2);
      score += (utilization * 0.4);
    }

    // Completion rate (30% weight)
    if (metrics.total_programs > 0) {
      const completionRate = (metrics.completed_programs || 0) / metrics.total_programs;
      score += (completionRate * 0.3);
    }

    // KPI achievement (30% weight)
    if (metrics.total_kpis > 0) {
      const achievementRate = (metrics.achieved_kpis || 0) / metrics.total_kpis;
      score += (achievementRate * 0.3);
    }

    return Math.min(score, 1);
  }

  static getHealthStatus(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  static async getAllVerticalHealth() {
    const [verticals] = await pool.query('SELECT vertical_id, name FROM verticals');
    
    const healthScores = await Promise.all(
      verticals.map(async (vertical) => {
        const score = await this.calculateHealth(vertical.vertical_id);
        return {
          vertical_id: vertical.vertical_id,
          name: vertical.name,
          ...score
        };
      })
    );

    return healthScores;
  }

  static async compareVerticals(verticalIds = []) {
    if (verticalIds.length === 0) {
      const [allVerticals] = await pool.query('SELECT vertical_id FROM verticals');
      verticalIds = allVerticals.map(v => v.vertical_id);
    }

    const comparison = await Promise.all(
      verticalIds.map(async (id) => {
        return await this.calculateHealth(id);
      })
    );

    // Sort by overall score
    comparison.sort((a, b) => b.overall_score - a.overall_score);

    return {
      comparison,
      rankings: comparison.map((v, index) => ({
        vertical_id: v.vertical_id,
        rank: index + 1,
        score: v.overall_score
      }))
    };
  }
}

module.exports = VerticalHealth;