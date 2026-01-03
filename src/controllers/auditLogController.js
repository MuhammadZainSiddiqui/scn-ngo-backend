import AuditLog from '../models/AuditLog.js';

export const auditLogController = {
  async getAllLogs(req, res) {
    try {
      // Super Admin only
      if (req.user.role_id !== 1) {
        return res.status(403).json({ success: false, error: 'Only Super Admin can access all audit logs' });
      }

      const result = await AuditLog.findAll(req.query);
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getEntityHistory(req, res) {
    try {
      // Super Admin only for now, or potentially higher roles
      if (req.user.role_id !== 1) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const { entityType, entityId } = req.params;
      const history = await AuditLog.getEntityHistory(entityType, entityId);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error fetching entity history:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getUserActivityReport(req, res) {
    try {
      if (req.user.role_id !== 1) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const { userId } = req.params;
      const days = req.query.days || 30;
      const report = await AuditLog.getUserActivityReport(userId, days);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error generating user activity report:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getSystemAuditReport(req, res) {
    try {
      if (req.user.role_id !== 1) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const days = req.query.days || 30;
      const report = await AuditLog.getSystemAuditReport(days);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error generating system audit report:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
};
