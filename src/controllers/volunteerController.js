import Volunteer from '../models/Volunteer.js';
import VolunteerHours from '../models/VolunteerHours.js';
import VolunteerAssignment from '../models/VolunteerAssignment.js';
import AuditLog from '../models/AuditLog.js';
import { executeQuery } from '../config/database.js';

const BURNOUT_THRESHOLDS = {
  medium: 40,
  high: 80,
};

const calculateBurnoutRisk = (hoursLast28Days) => {
  const hours = parseFloat(hoursLast28Days ?? 0);
  if (hours >= BURNOUT_THRESHOLDS.high) return 'high';
  if (hours >= BURNOUT_THRESHOLDS.medium) return 'medium';
  return 'low';
};

const assertProgramAccess = async ({ programId, user }) => {
  const programs = await executeQuery('SELECT id, vertical_id FROM programs WHERE id = ?', [programId]);
  if (!programs.length) {
    return { ok: false, status: 400, error: 'Program not found', code: 'BAD_REQUEST' };
  }

  const program = programs[0];

  const isGlobal = [1, 4].includes(user.roleId);
  if (!isGlobal && program.vertical_id && program.vertical_id !== user.verticalId) {
    return {
      ok: false,
      status: 403,
      error: 'You do not have permission to access programs from another vertical',
      code: 'FORBIDDEN',
    };
  }

  return { ok: true, program };
};

export const volunteerController = {
  async getAllVolunteers(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        vertical_id,
        status,
        tier,
        insurance_status,
        burnout_risk,
        search,
        sort,
        order,
      } = req.query;

      const isGlobal = [1, 4].includes(req.user.roleId);

      let finalVerticalId = vertical_id;
      if (!isGlobal) {
        if (vertical_id && parseInt(vertical_id, 10) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access volunteers from another vertical',
            code: 'FORBIDDEN',
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const result = await Volunteer.findAll({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        vertical_id: finalVerticalId,
        status,
        tier,
        insurance_status,
        burnout_risk,
        search,
        sort: sort || 'v.created_at',
        order: order || 'desc',
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Volunteers retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getAllVolunteers:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async searchVolunteers(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        vertical_id,
        status,
        tier,
        insurance_status,
        burnout_risk,
        search,
      } = req.query;

      const isGlobal = [1, 4].includes(req.user.roleId);

      let finalVerticalId = vertical_id;
      if (!isGlobal) {
        if (vertical_id && parseInt(vertical_id, 10) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to search volunteers from another vertical',
            code: 'FORBIDDEN',
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const result = await Volunteer.findAll({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        vertical_id: finalVerticalId,
        status,
        tier,
        insurance_status,
        burnout_risk,
        search,
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Volunteer search completed successfully',
      });
    } catch (error) {
      console.error('Error in searchVolunteers:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async getVolunteerById(req, res) {
    try {
      const volunteer = await Volunteer.findById(req.params.id);

      if (!volunteer) {
        return res.status(404).json({
          success: false,
          error: 'Volunteer not found',
          code: 'NOT_FOUND',
        });
      }

      const isGlobal = [1, 4].includes(req.user.roleId);
      if (!isGlobal && volunteer.vertical_id !== req.user.verticalId && volunteer.vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this volunteer',
          code: 'FORBIDDEN',
        });
      }

      const [assignments, hoursSummary, burnoutStats] = await Promise.all([
        VolunteerAssignment.findByVolunteer(volunteer.id),
        VolunteerHours.getSummaryByVolunteer(volunteer.id),
        VolunteerHours.getBurnoutStats(volunteer.id),
      ]);

      res.json({
        success: true,
        data: {
          ...volunteer,
          burnout_risk: calculateBurnoutRisk(burnoutStats.hours_last_28_days),
          burnout_stats: burnoutStats,
          assignments,
          hours_summary: hoursSummary,
        },
        message: 'Volunteer retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getVolunteerById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async createVolunteer(req, res) {
    try {
      const isGlobal = [1, 4].includes(req.user.roleId);

      const volunteerData = {
        ...req.body,
      };

      if (!isGlobal) {
        volunteerData.vertical_id = req.user.verticalId;
      }

      if (volunteerData.email) {
        const exists = await Volunteer.checkEmailExists(volunteerData.email);
        if (exists) {
          return res.status(409).json({
            success: false,
            error: 'Email already exists',
            code: 'CONFLICT',
          });
        }
      }

      if (volunteerData.phone) {
        const exists = await Volunteer.checkPhoneExists(volunteerData.phone);
        if (exists) {
          return res.status(409).json({
            success: false,
            error: 'Phone already exists',
            code: 'CONFLICT',
          });
        }
      }

      const newVolunteer = await Volunteer.create(volunteerData);

      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'volunteers',
        entity_id: newVolunteer.id,
        new_values: newVolunteer,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.status(201).json({
        success: true,
        data: newVolunteer,
        message: 'Volunteer created successfully',
      });
    } catch (error) {
      console.error('Error in createVolunteer:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async updateVolunteer(req, res) {
    try {
      const id = req.params.id;
      const volunteer = await Volunteer.findById(id);

      if (!volunteer) {
        return res.status(404).json({
          success: false,
          error: 'Volunteer not found',
          code: 'NOT_FOUND',
        });
      }

      const isGlobal = [1, 4].includes(req.user.roleId);
      if (!isGlobal && volunteer.vertical_id !== req.user.verticalId && volunteer.vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied',
          code: 'FORBIDDEN',
        });
      }

      const updateData = { ...req.body };
      if (!isGlobal) {
        delete updateData.vertical_id;
      }

      if (updateData.email && updateData.email !== volunteer.email) {
        const exists = await Volunteer.checkEmailExists(updateData.email, id);
        if (exists) {
          return res.status(409).json({
            success: false,
            error: 'Email already exists',
            code: 'CONFLICT',
          });
        }
      }

      if (updateData.phone && updateData.phone !== volunteer.phone) {
        const exists = await Volunteer.checkPhoneExists(updateData.phone, id);
        if (exists) {
          return res.status(409).json({
            success: false,
            error: 'Phone already exists',
            code: 'CONFLICT',
          });
        }
      }

      const updatedVolunteer = await Volunteer.update(id, updateData);

      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'volunteers',
        entity_id: id,
        old_values: volunteer,
        new_values: updatedVolunteer,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.json({
        success: true,
        data: updatedVolunteer,
        message: 'Volunteer updated successfully',
      });
    } catch (error) {
      console.error('Error in updateVolunteer:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async updateInsurance(req, res) {
    try {
      const id = req.params.id;
      const volunteer = await Volunteer.findById(id);

      if (!volunteer) {
        return res.status(404).json({
          success: false,
          error: 'Volunteer not found',
          code: 'NOT_FOUND',
        });
      }

      const isGlobal = [1, 4].includes(req.user.roleId);
      if (!isGlobal && volunteer.vertical_id !== req.user.verticalId && volunteer.vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied',
          code: 'FORBIDDEN',
        });
      }

      const insuranceUpdate = {
        insurance_provider: req.body.insurance_provider,
        insurance_policy_number: req.body.insurance_policy_number,
        insurance_expiry_date: req.body.insurance_expiry_date,
      };

      const updatedVolunteer = await Volunteer.update(id, insuranceUpdate);

      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'volunteers_insurance',
        entity_id: id,
        old_values: {
          insurance_provider: volunteer.insurance_provider,
          insurance_policy_number: volunteer.insurance_policy_number,
          insurance_expiry_date: volunteer.insurance_expiry_date,
        },
        new_values: insuranceUpdate,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.json({
        success: true,
        data: updatedVolunteer,
        message: 'Insurance updated successfully',
      });
    } catch (error) {
      console.error('Error in updateInsurance:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async logHours(req, res) {
    try {
      const volunteerId = req.params.id;
      const volunteer = await Volunteer.findById(volunteerId);

      if (!volunteer) {
        return res.status(404).json({
          success: false,
          error: 'Volunteer not found',
          code: 'NOT_FOUND',
        });
      }

      const isGlobal = [1, 4].includes(req.user.roleId);
      if (!isGlobal && volunteer.vertical_id !== req.user.verticalId && volunteer.vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied',
          code: 'FORBIDDEN',
        });
      }

      const programAccess = await assertProgramAccess({ programId: req.body.program_id, user: req.user });
      if (!programAccess.ok) {
        return res.status(programAccess.status).json({
          success: false,
          error: programAccess.error,
          code: programAccess.code,
        });
      }

      const logged = await VolunteerHours.logHours({
        volunteer_id: volunteer.id,
        program_id: req.body.program_id,
        work_date: req.body.work_date,
        hours: req.body.hours,
        notes: req.body.notes,
        logged_by: req.user.id,
      });

      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'volunteer_hours',
        entity_id: logged.id,
        new_values: logged,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.status(201).json({
        success: true,
        data: logged,
        message: 'Hours logged successfully',
      });
    } catch (error) {
      console.error('Error in logHours:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async getHoursSummary(req, res) {
    try {
      const volunteer = await Volunteer.findById(req.params.id);

      if (!volunteer) {
        return res.status(404).json({
          success: false,
          error: 'Volunteer not found',
          code: 'NOT_FOUND',
        });
      }

      const isGlobal = [1, 4].includes(req.user.roleId);
      if (!isGlobal && volunteer.vertical_id !== req.user.verticalId && volunteer.vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied',
          code: 'FORBIDDEN',
        });
      }

      const summary = await VolunteerHours.getSummaryByVolunteer(volunteer.id);

      res.json({
        success: true,
        data: summary,
        message: 'Volunteer hours summary retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getHoursSummary:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async createAssignment(req, res) {
    try {
      const volunteerId = req.params.id;
      const volunteer = await Volunteer.findById(volunteerId);

      if (!volunteer) {
        return res.status(404).json({
          success: false,
          error: 'Volunteer not found',
          code: 'NOT_FOUND',
        });
      }

      const isGlobal = [1, 4].includes(req.user.roleId);
      if (!isGlobal && volunteer.vertical_id !== req.user.verticalId && volunteer.vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied',
          code: 'FORBIDDEN',
        });
      }

      const programAccess = await assertProgramAccess({ programId: req.body.program_id, user: req.user });
      if (!programAccess.ok) {
        return res.status(programAccess.status).json({
          success: false,
          error: programAccess.error,
          code: programAccess.code,
        });
      }

      const assignment = await VolunteerAssignment.create({
        volunteer_id: volunteer.id,
        program_id: req.body.program_id,
        start_date: req.body.start_date,
        end_date: req.body.end_date,
        status: req.body.status || 'active',
        assigned_by: req.user.id,
      });

      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'volunteer_assignments',
        entity_id: assignment.id,
        new_values: assignment,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.status(201).json({
        success: true,
        data: assignment,
        message: 'Volunteer assigned successfully',
      });
    } catch (error) {
      console.error('Error in createAssignment:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async deactivateVolunteer(req, res) {
    try {
      const id = req.params.id;
      const volunteer = await Volunteer.findById(id);

      if (!volunteer) {
        return res.status(404).json({
          success: false,
          error: 'Volunteer not found',
          code: 'NOT_FOUND',
        });
      }

      const isGlobal = [1, 4].includes(req.user.roleId);
      if (!isGlobal && volunteer.vertical_id !== req.user.verticalId && volunteer.vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied',
          code: 'FORBIDDEN',
        });
      }

      await Volunteer.deactivate(id);

      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'volunteers',
        entity_id: id,
        old_values: volunteer,
        new_values: { status: 'inactive' },
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.json({
        success: true,
        message: 'Volunteer deactivated successfully',
      });
    } catch (error) {
      console.error('Error in deactivateVolunteer:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async getVolunteerStats(req, res) {
    try {
      const isGlobal = [1, 4].includes(req.user.roleId);
      const { vertical_id } = req.query;

      let finalVerticalId = vertical_id;
      if (!isGlobal) {
        if (vertical_id && parseInt(vertical_id, 10) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access volunteer stats from another vertical',
            code: 'FORBIDDEN',
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const stats = await Volunteer.getStats({ vertical_id: finalVerticalId });

      res.json({
        success: true,
        data: stats,
        message: 'Volunteer statistics retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getVolunteerStats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async getVolunteerReport(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        vertical_id,
        status,
        tier,
        insurance_status,
        burnout_risk,
        search,
      } = req.query;

      const isGlobal = [1, 4].includes(req.user.roleId);

      let finalVerticalId = vertical_id;
      if (!isGlobal) {
        if (vertical_id && parseInt(vertical_id, 10) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access volunteer reports from another vertical',
            code: 'FORBIDDEN',
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      // Use base listing then enrich with all-time hours & assignment counts
      const base = await Volunteer.findAll({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        vertical_id: finalVerticalId,
        status,
        tier,
        insurance_status,
        burnout_risk,
        search,
        sort: 'v.created_at',
        order: 'desc',
      });

      const ids = base.data.map((v) => v.id);
      if (!ids.length) {
        return res.json({
          success: true,
          data: [],
          pagination: base.pagination,
          message: 'Volunteer report generated successfully',
        });
      }

      const hoursRows = await executeQuery(
        `
          SELECT volunteer_id, COALESCE(SUM(hours), 0) as total_hours
          FROM volunteer_hours
          WHERE volunteer_id IN (${ids.map(() => '?').join(',')})
          GROUP BY volunteer_id
        `,
        ids
      );

      const assignmentRows = await executeQuery(
        `
          SELECT volunteer_id, COUNT(*) as assignments_count,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_assignments
          FROM volunteer_assignments
          WHERE volunteer_id IN (${ids.map(() => '?').join(',')})
          GROUP BY volunteer_id
        `,
        ids
      );

      const hoursMap = new Map(hoursRows.map((r) => [r.volunteer_id, parseFloat(r.total_hours)]));
      const assignmentMap = new Map(
        assignmentRows.map((r) => [
          r.volunteer_id,
          {
            assignments_count: parseInt(r.assignments_count, 10),
            active_assignments: parseInt(r.active_assignments, 10),
          },
        ])
      );

      const data = base.data.map((v) => ({
        ...v,
        total_hours: hoursMap.get(v.id) ?? 0,
        ...(assignmentMap.get(v.id) || {}),
      }));

      res.json({
        success: true,
        data,
        pagination: base.pagination,
        message: 'Volunteer report generated successfully',
      });
    } catch (error) {
      console.error('Error in getVolunteerReport:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },
};

export default volunteerController;
