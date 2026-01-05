import Exception from '../models/Exception.js';
import AuditLog from '../models/AuditLog.js';

export const exceptionController = {
  async getAllExceptions(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        severity,
        vertical_id,
        assigned_to,
        created_by,
        priority,
        category,
        start_date,
        end_date,
        search,
        sort = 'e.created_at',
        order = 'desc',
        overdue_only,
        sla_breach_only
      } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        // Super Admin can see all, others limited to their vertical
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access exceptions from another vertical',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const result = await Exception.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        severity,
        vertical_id: finalVerticalId,
        assigned_to,
        created_by,
        priority,
        category,
        start_date,
        end_date,
        search,
        sort,
        order,
        overdue_only: overdue_only === 'true',
        sla_breach_only: sla_breach_only === 'true'
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Exceptions retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllExceptions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getExceptionById(req, res) {
    try {
      const exception = await Exception.findById(req.params.id);

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (exception.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access this exception',
            code: 'FORBIDDEN'
          });
        }
      }

      res.json({
        success: true,
        data: exception,
        message: 'Exception retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getExceptionById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async createException(req, res) {
    try {
      const {
        title,
        description,
        category,
        severity = 'medium',
        vertical_id,
        program_id,
        assigned_to = null,
        priority = false,
        due_date = null,
        tags = null,
        notes = null
      } = req.body;

      // Validate required fields
      if (!title || !description) {
        return res.status(400).json({
          success: false,
          error: 'Title and description are required',
          code: 'BAD_REQUEST'
        });
      }

      // Apply vertical isolation
      const finalVerticalId = req.user.roleId === 1 ? vertical_id : req.user.verticalId;

      const exceptionData = {
        title,
        description,
        category,
        severity,
        vertical_id: finalVerticalId,
        program_id,
        created_by: req.user.id,
        assigned_to,
        priority,
        due_date,
        tags,
        notes
      };

      const newException = await Exception.create(exceptionData);

      // Add history record
      await Exception.addHistory(
        newException.id,
        'create',
        req.user.id,
        null,
        { exception_number: newException.exception_number },
        'Exception created'
      );

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'exception',
        entity_id: newException.id,
        new_values: newException,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: newException,
        message: 'Exception created successfully'
      });
    } catch (error) {
      console.error('Error in createException:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateException(req, res) {
    try {
      const exception = await Exception.findById(req.params.id);

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (exception.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to update this exception',
            code: 'FORBIDDEN'
          });
        }
      }

      // Check if user can update (assigned user or admin/lead)
      if (req.user.roleId === 3 && exception.assigned_to !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You can only update exceptions assigned to you',
          code: 'FORBIDDEN'
        });
      }

      const updatedException = await Exception.update(req.params.id, req.body);

      // Add history record
      await Exception.addHistory(
        updatedException.id,
        'update',
        req.user.id,
        exception,
        req.body,
        'Exception details updated'
      );

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'exception',
        entity_id: updatedException.id,
        old_values: exception,
        new_values: updatedException,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedException,
        message: 'Exception updated successfully'
      });
    } catch (error) {
      console.error('Error in updateException:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateExceptionStatus(req, res) {
    try {
      const exception = await Exception.findById(req.params.id);

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          code: 'NOT_FOUND'
        });
      }

      const { status } = req.body;

      // Validate status workflow
      const validStatusTransitions = {
        open: ['in_progress', 'resolved', 'closed'],
        in_progress: ['resolved', 'closed', 'open'],
        resolved: ['closed', 'open'],
        closed: ['open']
      };

      if (!validStatusTransitions[exception.status]?.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status transition from ${exception.status} to ${status}`,
          code: 'BAD_REQUEST'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1 && req.user.roleId !== 2) {
        if (exception.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to update this exception',
            code: 'FORBIDDEN'
          });
        }
      }

      // Check if user can update
      if (req.user.roleId === 3 && exception.assigned_to !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You can only update exceptions assigned to you',
          code: 'FORBIDDEN'
        });
      }

      const updatedException = await Exception.updateStatus(req.params.id, status, req.user.id);

      // Add history record
      await Exception.addHistory(
        updatedException.id,
        'update',
        req.user.id,
        { status: exception.status },
        { status: status },
        `Status changed from ${exception.status} to ${status}`
      );

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE_STATUS',
        entity_type: 'exception',
        entity_id: updatedException.id,
        old_values: { status: exception.status },
        new_values: { status: status },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedException,
        message: 'Exception status updated successfully'
      });
    } catch (error) {
      console.error('Error in updateExceptionStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async assignException(req, res) {
    try {
      const exception = await Exception.findById(req.params.id);

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          code: 'NOT_FOUND'
        });
      }

      const { assigned_to } = req.body;

      if (!assigned_to) {
        return res.status(400).json({
          success: false,
          error: 'Assigned to user ID is required',
          code: 'BAD_REQUEST'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (exception.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to assign this exception',
            code: 'FORBIDDEN'
          });
        }
      }

      const previousAssignee = exception.assigned_to;
      const updatedException = await Exception.assign(req.params.id, assigned_to, req.user.id);

      // Add history record
      await Exception.addHistory(
        updatedException.id,
        'assign',
        req.user.id,
        { assigned_to: previousAssignee },
        { assigned_to: assigned_to },
        `Exception assigned to user ID ${assigned_to}`
      );

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'ASSIGN',
        entity_type: 'exception',
        entity_id: updatedException.id,
        old_values: { assigned_to: previousAssignee },
        new_values: { assigned_to: assigned_to },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedException,
        message: 'Exception assigned successfully'
      });
    } catch (error) {
      console.error('Error in assignException:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async reassignException(req, res) {
    try {
      const exception = await Exception.findById(req.params.id);

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          code: 'NOT_FOUND'
        });
      }

      const { assigned_to } = req.body;

      if (!assigned_to) {
        return res.status(400).json({
          success: false,
          error: 'Assigned to user ID is required',
          code: 'BAD_REQUEST'
        });
      }

      if (assigned_to === exception.assigned_to) {
        return res.status(400).json({
          success: false,
          error: 'Cannot reassign to the same user',
          code: 'BAD_REQUEST'
        });
      }

      // Apply vertical isolation - only admin or lead can reassign
      if (req.user.roleId === 3) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to reassign exceptions',
          code: 'FORBIDDEN'
        });
      }

      if (req.user.roleId !== 1 && exception.vertical_id !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to reassign this exception',
          code: 'FORBIDDEN'
        });
      }

      const previousAssignee = exception.assigned_to;
      const updatedException = await Exception.reassign(req.params.id, assigned_to, req.user.id);

      // Add history record
      await Exception.addHistory(
        updatedException.id,
        'reassign',
        req.user.id,
        { assigned_to: previousAssignee },
        { assigned_to: assigned_to },
        `Exception reassigned from user ID ${previousAssignee} to user ID ${assigned_to}`
      );

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'REASSIGN',
        entity_type: 'exception',
        entity_id: updatedException.id,
        old_values: { assigned_to: previousAssignee },
        new_values: { assigned_to: assigned_to },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedException,
        message: 'Exception reassigned successfully'
      });
    } catch (error) {
      console.error('Error in reassignException:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async resolveException(req, res) {
    try {
      const exception = await Exception.findById(req.params.id);

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          code: 'NOT_FOUND'
        });
      }

      if (exception.status === 'resolved' || exception.status === 'closed') {
        return res.status(400).json({
          success: false,
          error: 'Exception is already resolved or closed',
          code: 'BAD_REQUEST'
        });
      }

      const { resolution_notes } = req.body;

      if (!resolution_notes || resolution_notes.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Resolution notes are required',
          code: 'BAD_REQUEST'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (exception.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to resolve this exception',
            code: 'FORBIDDEN'
          });
        }
      }

      // Check if user can resolve (assigned user or admin/lead)
      if (req.user.roleId === 3 && exception.assigned_to !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You can only resolve exceptions assigned to you',
          code: 'FORBIDDEN'
        });
      }

      const updatedException = await Exception.resolve(req.params.id, resolution_notes, req.user.id);

      // Add history record
      await Exception.addHistory(
        updatedException.id,
        'resolve',
        req.user.id,
        null,
        { resolution_notes, resolved_at: updatedException.resolved_at },
        'Exception marked as resolved'
      );

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'RESOLVE',
        entity_type: 'exception',
        entity_id: updatedException.id,
        old_values: { status: exception.status },
        new_values: { status: 'resolved', resolution_notes },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedException,
        message: 'Exception resolved successfully'
      });
    } catch (error) {
      console.error('Error in resolveException:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async closeException(req, res) {
    try {
      const exception = await Exception.findById(req.params.id);

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          code: 'NOT_FOUND'
        });
      }

      if (exception.status === 'closed') {
        return res.status(400).json({
          success: false,
          error: 'Exception is already closed',
          code: 'BAD_REQUEST'
        });
      }

      if (exception.status !== 'resolved') {
        return res.status(400).json({
          success: false,
          error: 'Exception must be resolved before closing',
          code: 'BAD_REQUEST'
        });
      }

      // Apply vertical isolation - only admin or lead can close
      if (req.user.roleId === 3) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to close exceptions',
          code: 'FORBIDDEN'
        });
      }

      if (req.user.roleId !== 1 && exception.vertical_id !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to close this exception',
          code: 'FORBIDDEN'
        });
      }

      const updatedException = await Exception.close(req.params.id, req.user.id);

      // Add history record
      await Exception.addHistory(
        updatedException.id,
        'close',
        req.user.id,
        null,
        { closed_at: updatedException.closed_at },
        'Exception closed'
      );

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'CLOSE',
        entity_type: 'exception',
        entity_id: updatedException.id,
        old_values: { status: exception.status },
        new_values: { status: 'closed' },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedException,
        message: 'Exception closed successfully'
      });
    } catch (error) {
      console.error('Error in closeException:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async deleteException(req, res) {
    try {
      const exception = await Exception.findById(req.params.id);

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          code: 'NOT_FOUND'
        });
      }

      // Only Super Admin can delete exceptions
      if (req.user.roleId !== 1) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to delete exceptions',
          code: 'FORBIDDEN'
        });
      }

      const deletedException = await Exception.delete(req.params.id);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'exception',
        entity_id: req.params.id,
        old_values: deletedException,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: deletedException,
        message: 'Exception deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteException:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getBySeverity(req, res) {
    try {
      const { severity } = req.params;
      const validSeverities = ['low', 'medium', 'high', 'critical'];

      if (!validSeverities.includes(severity)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid severity level',
          code: 'BAD_REQUEST'
        });
      }

      const { page = 1, limit = 10, vertical_id } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        finalVerticalId = req.user.verticalId;
      }

      const result = await Exception.getBySeverity(severity, {
        page: parseInt(page),
        limit: parseInt(limit),
        vertical_id: finalVerticalId
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: `Exceptions with severity ${severity} retrieved successfully`
      });
    } catch (error) {
      console.error('Error in getBySeverity:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getByStatus(req, res) {
    try {
      const { status } = req.params;
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
          code: 'BAD_REQUEST'
        });
      }

      const { page = 1, limit = 10, vertical_id } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        finalVerticalId = req.user.verticalId;
      }

      const result = await Exception.getByStatus(status, {
        page: parseInt(page),
        limit: parseInt(limit),
        vertical_id: finalVerticalId
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: `Exceptions with status ${status} retrieved successfully`
      });
    } catch (error) {
      console.error('Error in getByStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getAssignedToUser(req, res) {
    try {
      const { user_id } = req.params;

      const { page = 1, limit = 10 } = req.query;

      // Users can only see their own assigned exceptions unless admin
      if (req.user.roleId !== 1 && req.user.id !== parseInt(user_id)) {
        return res.status(403).json({
          success: false,
          error: 'You can only view your own assigned exceptions',
          code: 'FORBIDDEN'
        });
      }

      const result = await Exception.getAssignedToUser(parseInt(user_id), {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: `Exceptions assigned to user ${user_id} retrieved successfully`
      });
    } catch (error) {
      console.error('Error in getAssignedToUser:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getStatistics(req, res) {
    try {
      const { vertical_id } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        finalVerticalId = req.user.verticalId;
      }

      const stats = await Exception.getStats({
        vertical_id: finalVerticalId
      });

      res.json({
        success: true,
        data: stats,
        message: 'Exception statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getStatistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getEscalationReport(req, res) {
    try {
      const { vertical_id, severity, start_date, end_date } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        finalVerticalId = req.user.verticalId;
      }

      const report = await Exception.getEscalationReport({
        vertical_id: finalVerticalId,
        severity,
        start_date,
        end_date
      });

      res.json({
        success: true,
        data: report,
        message: 'Escalation report retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getEscalationReport:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getOverdue(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      // Apply vertical isolation
      const vertical_id = req.user.roleId === 1 ? null : req.user.verticalId;

      const result = await Exception.getOverdue({
        page: parseInt(page),
        limit: parseInt(limit),
        vertical_id
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Overdue exceptions retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getOverdue:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async searchExceptions(req, res) {
    try {
      const { search } = req.query;

      if (!search) {
        return res.status(400).json({
          success: false,
          error: 'Search term is required',
          code: 'BAD_REQUEST'
        });
      }

      const { page = 1, limit = 10 } = req.query;

      const result = await Exception.search(search, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      // Filter by vertical for non-admin users
      let filteredData = result.data;
      if (req.user.roleId !== 1) {
        filteredData = result.data.filter(e => e.vertical_id === req.user.verticalId);
      }

      res.json({
        success: true,
        data: filteredData,
        pagination: result.pagination,
        message: 'Exceptions searched successfully'
      });
    } catch (error) {
      console.error('Error in searchExceptions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getUserWorkload(req, res) {
    try {
      const { user_id } = req.params;
      const { status } = req.query;

      // Users can only see their own workload unless admin
      if (req.user.roleId !== 1 && req.user.id !== parseInt(user_id)) {
        return res.status(403).json({
          success: false,
          error: 'You can only view your own workload',
          code: 'FORBIDDEN'
        });
      }

      const workload = await Exception.getUserWorkload(parseInt(user_id), { status });

      res.json({
        success: true,
        data: workload,
        message: 'User workload retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getUserWorkload:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getVerticalSummary(req, res) {
    try {
      const { vertical_id } = req.params;

      // Apply vertical isolation
      if (req.user.roleId !== 1 && parseInt(vertical_id) !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this vertical summary',
          code: 'FORBIDDEN'
        });
      }

      const summary = await Exception.getVerticalSummary(parseInt(vertical_id));

      res.json({
        success: true,
        data: summary,
        message: 'Vertical exception summary retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getVerticalSummary:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async escalateException(req, res) {
    try {
      const exception = await Exception.findById(req.params.id);

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          code: 'NOT_FOUND'
        });
      }

      const { reason, escalated_to_user_id, escalation_level } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Reason for escalation is required',
          code: 'BAD_REQUEST'
        });
      }

      // Only admin or lead can escalate
      if (req.user.roleId === 3) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to escalate exceptions',
          code: 'FORBIDDEN'
        });
      }

      if (req.user.roleId !== 1 && exception.vertical_id !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to escalate this exception',
          code: 'FORBIDDEN'
        });
      }

      const newLevel = escalation_level || exception.escalation_level + 1;

      if (newLevel > 3) {
        return res.status(400).json({
          success: false,
          error: 'Maximum escalation level (3) reached',
          code: 'BAD_REQUEST'
        });
      }

      const updatedException = await Exception.escalate(
        req.params.id,
        req.user.id,
        reason,
        newLevel,
        escalated_to_user_id
      );

      // Add history record
      await Exception.addHistory(
        updatedException.id,
        'escalate',
        req.user.id,
        { escalation_level: exception.escalation_level },
        { escalation_level: newLevel, escalated_to: escalated_to_user_id },
        `Exception escalated to level ${newLevel}`
      );

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'ESCALATE',
        entity_type: 'exception',
        entity_id: updatedException.id,
        old_values: { escalation_level: exception.escalation_level },
        new_values: { escalation_level: newLevel },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedException,
        message: 'Exception escalated successfully'
      });
    } catch (error) {
      console.error('Error in escalateException:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getExceptionComments(req, res) {
    try {
      const exception = await Exception.findById(req.params.id);

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (exception.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access this exception',
            code: 'FORBIDDEN'
          });
        }
      }

      const { internal_only = false } = req.query;
      const comments = await Exception.getComments(req.params.id, {
        internal_only: internal_only === 'true'
      });

      res.json({
        success: true,
        data: comments,
        message: 'Exception comments retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getExceptionComments:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async addComment(req, res) {
    try {
      const exception = await Exception.findById(req.params.id);

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (exception.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to comment on this exception',
            code: 'FORBIDDEN'
          });
        }
      }

      const { comment, is_internal = false } = req.body;

      if (!comment || comment.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Comment is required',
          code: 'BAD_REQUEST'
        });
      }

      const commentId = await Exception.addComment(req.params.id, req.user.id, comment, is_internal);

      // Add history record
      await Exception.addHistory(
        req.params.id,
        'comment',
        req.user.id,
        null,
        { comment_id: commentId, is_internal },
        'Comment added'
      );

      res.status(201).json({
        success: true,
        data: { id: commentId },
        message: 'Comment added successfully'
      });
    } catch (error) {
      console.error('Error in addComment:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getExceptionHistory(req, res) {
    try {
      const exception = await Exception.findById(req.params.id);

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (exception.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access this exception',
            code: 'FORBIDDEN'
          });
        }
      }

      const history = await Exception.getHistory(req.params.id);

      res.json({
        success: true,
        data: history,
        message: 'Exception history retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getExceptionHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getExceptionEscalations(req, res) {
    try {
      const exception = await Exception.findById(req.params.id);

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (exception.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access this exception',
            code: 'FORBIDDEN'
          });
        }
      }

      const escalations = await Exception.getEscalations(req.params.id);

      res.json({
        success: true,
        data: escalations,
        message: 'Exception escalations retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getExceptionEscalations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
};
