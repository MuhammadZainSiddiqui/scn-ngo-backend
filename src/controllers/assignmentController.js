import Volunteer from '../models/Volunteer.js';
import VolunteerAssignment from '../models/VolunteerAssignment.js';
import AuditLog from '../models/AuditLog.js';
import { executeQuery } from '../config/database.js';

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

export const assignmentController = {
  async getAllAssignments(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        volunteer_id,
        program_id,
        vertical_id,
        status,
        active,
        sort,
        order,
      } = req.query;

      const isGlobal = [1, 4].includes(req.user.roleId);

      let finalVerticalId = vertical_id;
      if (!isGlobal) {
        if (vertical_id && parseInt(vertical_id, 10) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access assignments from another vertical',
            code: 'FORBIDDEN',
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const result = await VolunteerAssignment.findAll({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        volunteer_id,
        program_id,
        vertical_id: finalVerticalId,
        status,
        active: active !== undefined ? active === 'true' || active === true : undefined,
        sort: sort || 'va.created_at',
        order: order || 'desc',
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Assignments retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getAllAssignments:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async getAssignmentById(req, res) {
    try {
      const assignment = await VolunteerAssignment.findById(req.params.id);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
          code: 'NOT_FOUND',
        });
      }

      const isGlobal = [1, 4].includes(req.user.roleId);
      if (!isGlobal && assignment.program_vertical_id && assignment.program_vertical_id !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this assignment',
          code: 'FORBIDDEN',
        });
      }

      res.json({
        success: true,
        data: assignment,
        message: 'Assignment retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getAssignmentById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async createAssignment(req, res) {
    try {
      const volunteerId = req.body.volunteer_id;
      const volunteer = await Volunteer.findById(volunteerId);

      if (!volunteer) {
        return res.status(400).json({
          success: false,
          error: 'Volunteer not found',
          code: 'BAD_REQUEST',
        });
      }

      const isGlobal = [1, 4].includes(req.user.roleId);
      if (!isGlobal && volunteer.vertical_id !== req.user.verticalId && volunteer.vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to assign volunteers from another vertical',
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
        message: 'Assignment created successfully',
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

  async updateAssignment(req, res) {
    try {
      const id = req.params.id;
      const assignment = await VolunteerAssignment.findById(id);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
          code: 'NOT_FOUND',
        });
      }

      const isGlobal = [1, 4].includes(req.user.roleId);
      if (!isGlobal && assignment.program_vertical_id && assignment.program_vertical_id !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied',
          code: 'FORBIDDEN',
        });
      }

      const updated = await VolunteerAssignment.update(id, req.body);

      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'volunteer_assignments',
        entity_id: id,
        old_values: assignment,
        new_values: updated,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.json({
        success: true,
        data: updated,
        message: 'Assignment updated successfully',
      });
    } catch (error) {
      console.error('Error in updateAssignment:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  async deactivateAssignment(req, res) {
    try {
      const id = req.params.id;
      const assignment = await VolunteerAssignment.findById(id);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
          code: 'NOT_FOUND',
        });
      }

      const isGlobal = [1, 4].includes(req.user.roleId);
      if (!isGlobal && assignment.program_vertical_id && assignment.program_vertical_id !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied',
          code: 'FORBIDDEN',
        });
      }

      await VolunteerAssignment.deactivate(id);

      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'volunteer_assignments',
        entity_id: id,
        old_values: assignment,
        new_values: { status: 'inactive' },
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl,
      });

      res.json({
        success: true,
        message: 'Assignment deactivated successfully',
      });
    } catch (error) {
      console.error('Error in deactivateAssignment:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },
};

export default assignmentController;
