import Program from '../models/Program.js';
import Kpi from '../models/Kpi.js';
import AuditLog from '../models/AuditLog.js';

const assertProgramAccess = (program, user) => {
  if (!program) {
    return { ok: false, status: 404, error: 'Program not found', code: 'NOT_FOUND' };
  }

  if (user.roleId === 1) return { ok: true };

  if (program.vertical_id && program.vertical_id !== user.verticalId) {
    return {
      ok: false,
      status: 403,
      error: 'You do not have permission to access programs from another vertical',
      code: 'FORBIDDEN',
    };
  }

  return { ok: true };
};

export const programController = {
  async getAllPrograms(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        vertical_id,
        status,
        date_from,
        date_to,
        search,
        sort,
        order,
      } = req.query;

      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id, 10) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access programs from another vertical',
            code: 'FORBIDDEN',
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const result = await Program.findAll({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        vertical_id: finalVerticalId,
        status,
        date_from,
        date_to,
        search,
        sort: sort || 'p.created_at',
        order: order || 'desc',
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Programs retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getAllPrograms:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async getProgramsStats(req, res) {
    try {
      const { vertical_id } = req.query;

      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id, 10) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access program statistics from another vertical',
            code: 'FORBIDDEN',
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const stats = await Program.getSummaryStats({ vertical_id: finalVerticalId });

      res.json({
        success: true,
        data: stats,
        message: 'Program statistics retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getProgramsStats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async getProgramById(req, res) {
    try {
      const program = await Program.findById(req.params.id);

      const access = assertProgramAccess(program, req.user);
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          error: access.error,
          code: access.code,
        });
      }

      const [budgetInfo, kpis] = await Promise.all([
        Program.getBudgetInfo(program.id),
        Kpi.findByProgram(program.id, { page: 1, limit: 100 }),
      ]);

      res.json({
        success: true,
        data: {
          ...program,
          budget_info: budgetInfo,
          kpis: kpis.data,
        },
        message: 'Program retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getProgramById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async createProgram(req, res) {
    try {
      const isSuperAdmin = req.user.roleId === 1;

      const programData = {
        ...req.body,
        status: Program.normalizeStatus(req.body.status),
        created_by: req.user.id,
      };

      if (!isSuperAdmin) {
        programData.vertical_id = req.user.verticalId;
      }

      if (!programData.vertical_id) {
        return res.status(400).json({
          success: false,
          error: 'vertical_id is required',
          code: 'BAD_REQUEST',
        });
      }

      const newProgram = await Program.create(programData);

      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'programs',
        entity_id: newProgram.id,
        new_values: newProgram,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.status(201).json({
        success: true,
        data: newProgram,
        message: 'Program created successfully',
      });
    } catch (error) {
      console.error('Error in createProgram:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async updateProgram(req, res) {
    try {
      const existing = await Program.findById(req.params.id);

      const access = assertProgramAccess(existing, req.user);
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          error: access.error,
          code: access.code,
        });
      }

      const updateData = {
        ...req.body,
      };

      if (req.user.roleId !== 1) {
        delete updateData.vertical_id;
      }

      if (updateData.status) {
        updateData.status = Program.normalizeStatus(updateData.status);
      }

      const updated = await Program.update(existing.id, updateData);

      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'programs',
        entity_id: existing.id,
        old_values: existing,
        new_values: updated,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.json({
        success: true,
        data: updated,
        message: 'Program updated successfully',
      });
    } catch (error) {
      console.error('Error in updateProgram:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async updateProgramStatus(req, res) {
    try {
      const existing = await Program.findById(req.params.id);

      const access = assertProgramAccess(existing, req.user);
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          error: access.error,
          code: access.code,
        });
      }

      const nextStatus = Program.normalizeStatus(req.body.status);
      const updated = await Program.updateStatus(existing.id, nextStatus);

      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE_STATUS',
        entity_type: 'programs',
        entity_id: existing.id,
        old_values: existing,
        new_values: updated,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.json({
        success: true,
        data: updated,
        message: 'Program status updated successfully',
      });
    } catch (error) {
      console.error('Error in updateProgramStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async archiveProgram(req, res) {
    try {
      const existing = await Program.findById(req.params.id);

      const access = assertProgramAccess(existing, req.user);
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          error: access.error,
          code: access.code,
        });
      }

      const hardDelete = req.query.hard === 'true' || req.query.hard === true;

      let result;
      let action;

      if (hardDelete && req.user.roleId === 1) {
        result = await Program.delete(existing.id);
        action = 'DELETE';
      } else {
        result = await Program.archive(existing.id);
        action = 'ARCHIVE';
      }

      await AuditLog.create({
        user_id: req.user.id,
        action,
        entity_type: 'programs',
        entity_id: existing.id,
        old_values: existing,
        new_values: result,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.json({
        success: true,
        data: result,
        message: hardDelete ? 'Program deleted successfully' : 'Program archived successfully',
      });
    } catch (error) {
      console.error('Error in archiveProgram:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async getProgramBudget(req, res) {
    try {
      const program = await Program.findById(req.params.id);

      const access = assertProgramAccess(program, req.user);
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          error: access.error,
          code: access.code,
        });
      }

      const budgetInfo = await Program.getBudgetInfo(program.id);

      res.json({
        success: true,
        data: budgetInfo,
        message: 'Program budget retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getProgramBudget:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async getProgramVolunteers(req, res) {
    try {
      const program = await Program.findById(req.params.id);

      const access = assertProgramAccess(program, req.user);
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          error: access.error,
          code: access.code,
        });
      }

      const { page = 1, limit = 25 } = req.query;
      const result = await Program.getVolunteers(program.id, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Program volunteers retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getProgramVolunteers:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async getProgramDonations(req, res) {
    try {
      const program = await Program.findById(req.params.id);

      const access = assertProgramAccess(program, req.user);
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          error: access.error,
          code: access.code,
        });
      }

      const { page = 1, limit = 25 } = req.query;
      const result = await Program.getDonations(program.id, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });

      res.json({
        success: true,
        data: result,
        message: 'Program donations retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getProgramDonations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async getProgramKpis(req, res) {
    try {
      const program = await Program.findById(req.params.id);

      const access = assertProgramAccess(program, req.user);
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          error: access.error,
          code: access.code,
        });
      }

      const { page = 1, limit = 25, status, search } = req.query;
      const result = await Kpi.findByProgram(program.id, {
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
      console.error('Error in getProgramKpis:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async getProgramReport(req, res) {
    try {
      const program = await Program.findById(req.params.id);

      const access = assertProgramAccess(program, req.user);
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          error: access.error,
          code: access.code,
        });
      }

      const [budgetInfo, volunteers, donations, kpis, kpiStats] = await Promise.all([
        Program.getBudgetInfo(program.id),
        Program.getVolunteers(program.id, { page: 1, limit: 10 }),
        Program.getDonations(program.id, { page: 1, limit: 10 }),
        Kpi.findByProgram(program.id, { page: 1, limit: 100 }),
        Kpi.getStatistics({ program_id: program.id }),
      ]);

      const beneficiaryTarget = Number(program.beneficiary_target ?? 0);
      const beneficiaryReached = Number(program.beneficiary_reached ?? 0);
      const beneficiaryProgress =
        beneficiaryTarget > 0 ? Math.min(100, (beneficiaryReached / beneficiaryTarget) * 100) : null;

      res.json({
        success: true,
        data: {
          program,
          budget: budgetInfo,
          impact: {
            beneficiary_target: beneficiaryTarget,
            beneficiary_reached: beneficiaryReached,
            beneficiary_progress_percentage: beneficiaryProgress,
          },
          summary: {
            volunteers_sample: volunteers.data,
            donations_sample: donations,
            kpis: kpis.data,
            kpi_statistics: kpiStats,
          },
        },
        message: 'Program report generated successfully',
      });
    } catch (error) {
      console.error('Error in getProgramReport:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },
};

export default programController;
