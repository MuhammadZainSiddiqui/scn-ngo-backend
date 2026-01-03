import Kpi from '../models/Kpi.js';
import Program from '../models/Program.js';
import AuditLog from '../models/AuditLog.js';

const assertProgramAccess = async ({ programId, user }) => {
  const program = await Program.findById(programId);
  if (!program) {
    return { ok: false, status: 404, error: 'Program not found', code: 'NOT_FOUND' };
  }

  if (user.roleId === 1) return { ok: true, program };

  if (program.vertical_id && program.vertical_id !== user.verticalId) {
    return {
      ok: false,
      status: 403,
      error: 'You do not have permission to access programs from another vertical',
      code: 'FORBIDDEN',
    };
  }

  return { ok: true, program };
};

const assertKpiAccess = async ({ kpiId, user }) => {
  const kpi = await Kpi.findById(kpiId);
  if (!kpi) {
    return { ok: false, status: 404, error: 'KPI not found', code: 'NOT_FOUND' };
  }

  if (user.roleId === 1) return { ok: true, kpi };

  if (kpi.vertical_id && kpi.vertical_id !== user.verticalId) {
    return {
      ok: false,
      status: 403,
      error: 'You do not have permission to access KPIs from another vertical',
      code: 'FORBIDDEN',
    };
  }

  return { ok: true, kpi };
};

export const kpiController = {
  async getAllKpis(req, res) {
    try {
      const {
        page = 1,
        limit = 25,
        program_id,
        vertical_id,
        status,
        search,
        sort,
        order,
      } = req.query;

      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id, 10) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access KPIs from another vertical',
            code: 'FORBIDDEN',
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      if (program_id) {
        const access = await assertProgramAccess({ programId: program_id, user: req.user });
        if (!access.ok) {
          return res.status(access.status).json({
            success: false,
            error: access.error,
            code: access.code,
          });
        }
      }

      const result = await Kpi.findAll({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        program_id,
        vertical_id: finalVerticalId,
        status,
        search,
        sort: sort || 'k.updated_at',
        order: order || 'desc',
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'KPIs retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getAllKpis:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async getKpiById(req, res) {
    try {
      const access = await assertKpiAccess({ kpiId: req.params.id, user: req.user });
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          error: access.error,
          code: access.code,
        });
      }

      res.json({
        success: true,
        data: access.kpi,
        message: 'KPI retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getKpiById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async getKpisByProgram(req, res) {
    try {
      const programId = req.params.programId || req.params.id;
      const { page = 1, limit = 25, status, search } = req.query;

      const access = await assertProgramAccess({ programId, user: req.user });
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          error: access.error,
          code: access.code,
        });
      }

      const result = await Kpi.findByProgram(programId, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        status,
        search,
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Program KPIs retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getKpisByProgram:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async createKpi(req, res) {
    try {
      const access = await assertProgramAccess({ programId: req.body.program_id, user: req.user });
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          error: access.error,
          code: access.code,
        });
      }

      const created = await Kpi.create({
        ...req.body,
      });

      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'program_kpis',
        entity_id: created.id,
        new_values: created,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.status(201).json({
        success: true,
        data: created,
        message: 'KPI created successfully',
      });
    } catch (error) {
      console.error('Error in createKpi:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async updateKpi(req, res) {
    try {
      const access = await assertKpiAccess({ kpiId: req.params.id, user: req.user });
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          error: access.error,
          code: access.code,
        });
      }

      const updated = await Kpi.update(req.params.id, req.body);

      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'program_kpis',
        entity_id: req.params.id,
        old_values: access.kpi,
        new_values: updated,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.json({
        success: true,
        data: updated,
        message: 'KPI updated successfully',
      });
    } catch (error) {
      console.error('Error in updateKpi:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async updateKpiProgress(req, res) {
    try {
      const access = await assertKpiAccess({ kpiId: req.params.id, user: req.user });
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          error: access.error,
          code: access.code,
        });
      }

      const updated = await Kpi.updateProgress(req.params.id, {
        current_value: req.body.current_value,
        status: req.body.status,
      });

      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE_PROGRESS',
        entity_type: 'program_kpis',
        entity_id: req.params.id,
        old_values: access.kpi,
        new_values: updated,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.json({
        success: true,
        data: updated,
        message: 'KPI progress updated successfully',
      });
    } catch (error) {
      console.error('Error in updateKpiProgress:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async deleteKpi(req, res) {
    try {
      const access = await assertKpiAccess({ kpiId: req.params.id, user: req.user });
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          error: access.error,
          code: access.code,
        });
      }

      const deleted = await Kpi.delete(req.params.id);

      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'program_kpis',
        entity_id: req.params.id,
        old_values: access.kpi,
        new_values: deleted,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.json({
        success: true,
        data: deleted,
        message: 'KPI deleted successfully',
      });
    } catch (error) {
      console.error('Error in deleteKpi:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async getKpiStats(req, res) {
    try {
      const { program_id, vertical_id } = req.query;

      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id, 10) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access KPI statistics from another vertical',
            code: 'FORBIDDEN',
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      if (program_id) {
        const access = await assertProgramAccess({ programId: program_id, user: req.user });
        if (!access.ok) {
          return res.status(access.status).json({
            success: false,
            error: access.error,
            code: access.code,
          });
        }
      }

      const stats = await Kpi.getStatistics({ program_id, vertical_id: finalVerticalId });

      res.json({
        success: true,
        data: stats,
        message: 'KPI statistics retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getKpiStats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },
};

export default kpiController;
