const DashboardStats = require('../models/DashboardStats');
const RiskAssessment = require('../models/RiskAssessment');
const { verifyToken, requireSuperAdmin, requireVerticalLead } = require('../middleware/authMiddleware');
const cache = require('../utils/cache');

const CACHE_TTL = {
  summary: 300, // 5 minutes
  metrics: 300, // 5 minutes
  trends: 3600, // 1 hour
  health: 3600  // 1 hour
};

class DashboardController {
  static async getSummary(req, res, next) {
    try {
      const userId = req.user.user_id;
      const verticalId = req.query.vertical_id;
      const dateFrom = req.query.date_from;
      const dateTo = req.query.date_to;

      // Build cache key
      const cacheKey = `dashboard:summary:${userId}:${verticalId || 'all'}:${dateFrom || 'none'}:${dateTo || 'none'}`;
      
      // Check cache
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult) {
        return res.json(cachedResult);
      }

      // Fetch comprehensive summary
      const summary = await DashboardStats.getComprehensiveSummary({
        verticalId,
        dateFrom,
        dateTo
      });

      const result = {
        success: true,
        data: summary,
        summary: {
          period: DashboardStats.getPeriodLabel(dateFrom, dateTo),
          vertical_id: verticalId,
          generated_at: new Date().toISOString()
        }
      };

      // Cache result
      await cache.set(cacheKey, result, CACHE_TTL.summary);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getMetrics(req, res, next) {
    try {
      const userId = req.user.user_id;
      const verticalId = req.query.vertical_id;
      const period = req.query.period || 'month';

      // Build cache key
      const cacheKey = `dashboard:metrics:${userId}:${verticalId || 'all'}:${period}`;
      
      // Check cache
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult) {
        return res.json(cachedResult);
      }

      const metrics = await DashboardStats.getAllMetrics({
        verticalId,
        period
      });

      const result = {
        success: true,
        data: metrics,
        summary: {
          period,
          vertical_id: verticalId,
          generated_at: new Date().toISOString()
        }
      };

      // Cache result
      await cache.set(cacheKey, result, CACHE_TTL.metrics);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DashboardController;