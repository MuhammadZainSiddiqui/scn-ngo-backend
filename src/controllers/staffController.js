import Staff from '../models/Staff.js';
import AuditLog from '../models/AuditLog.js';

export const staffController = {
  async getAllStaff(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        employment_type,
        department,
        vertical_id,
        search,
        sort = 's.created_at',
        order = 'desc',
        burnout_level
      } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1 && req.user.roleId !== 4) {
        // Super Admin and HR Lead can see all, others limited to their vertical
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access staff from another vertical',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      // Staff can only see themselves in the list
      if (req.user.roleId === 3) {
        const staffMember = await Staff.findByUserId(req.user.id);
        if (staffMember) {
          return res.json({
            success: true,
            data: [staffMember],
            pagination: {
              page: 1,
              limit: 1,
              total: 1,
              totalPages: 1
            },
            message: 'Staff retrieved successfully'
          });
        }
        return res.status(404).json({
          success: false,
          error: 'Staff record not found',
          code: 'NOT_FOUND'
        });
      }

      const result = await Staff.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        employment_type,
        department,
        vertical_id: finalVerticalId,
        search,
        sort,
        order,
        burnout_level
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Staff retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllStaff:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getStaffById(req, res) {
    try {
      const staff = await Staff.findById(req.params.id);
      
      if (!staff) {
        return res.status(404).json({
          success: false,
          error: 'Staff not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1 && req.user.roleId !== 4) {
        // Super Admin and HR Lead can access all
        const staffMember = await Staff.findByUserId(req.user.id);
        if (staffMember && staffMember.id !== parseInt(req.params.id)) {
          // Staff can only view their own profile
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access this staff record',
            code: 'FORBIDDEN'
          });
        }
        
        if (staff.user_vertical_id !== req.user.verticalId && req.user.verticalId !== null) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access this staff record',
            code: 'FORBIDDEN'
          });
        }
      }

      res.json({
        success: true,
        data: staff,
        message: 'Staff retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getStaffById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async createStaff(req, res) {
    try {
      const {
        user_id,
        employee_id,
        join_date,
        employment_type = 'full_time',
        designation,
        department,
        reporting_to,
        salary,
        bank_name,
        bank_account_number,
        bank_ifsc,
        pan_number,
        aadhar_number,
        uan_number,
        esic_number,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relation,
        blood_group,
        date_of_birth,
        permanent_address,
        current_address,
        burnout_level = 'low',
        notes
      } = req.body;

      // Generate employee ID if not provided
      const finalEmployeeId = employee_id || await Staff.generateEmployeeId();

      // Check if user_id exists and is not already linked to staff
      const existingStaff = await Staff.findByUserId(user_id);
      if (existingStaff) {
        return res.status(409).json({
          success: false,
          error: 'User is already linked to a staff record',
          code: 'CONFLICT'
        });
      }

      // Check if employee_id is unique
      const existingEmployeeId = await Staff.findByEmployeeId(finalEmployeeId);
      if (existingEmployeeId) {
        return res.status(409).json({
          success: false,
          error: 'Employee ID already exists',
          code: 'CONFLICT'
        });
      }

      const staffData = {
        user_id,
        employee_id: finalEmployeeId,
        join_date,
        employment_type,
        designation,
        department,
        reporting_to,
        salary,
        bank_name,
        bank_account_number,
        bank_ifsc,
        pan_number,
        aadhar_number,
        uan_number,
        esic_number,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relation,
        blood_group,
        date_of_birth,
        permanent_address,
        current_address,
        burnout_level,
        notes,
        created_by: req.user.id
      };

      const newStaff = await Staff.create(staffData);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'staff',
        entity_id: newStaff.id,
        new_values: newStaff,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: newStaff,
        message: 'Staff created successfully'
      });
    } catch (error) {
      console.error('Error in createStaff:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateStaff(req, res) {
    try {
      const staff = await Staff.findById(req.params.id);
      
      if (!staff) {
        return res.status(404).json({
          success: false,
          error: 'Staff not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply access control
      if (req.user.roleId === 3) {
        // Staff can only update their own basic info
        const staffMember = await Staff.findByUserId(req.user.id);
        if (staffMember && staffMember.id !== parseInt(req.params.id)) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to update this staff record',
            code: 'FORBIDDEN'
          });
        }
        // Staff can only update limited fields
        const allowedFieldsForStaff = ['bank_name', 'bank_account_number', 'bank_ifsc', 
                                        'pan_number', 'aadhar_number', 'uan_number', 'esic_number',
                                        'emergency_contact_name', 'emergency_contact_phone', 
                                        'emergency_contact_relation', 'blood_group', 'date_of_birth',
                                        'permanent_address', 'current_address'];
        const updates = {};
        for (const field of allowedFieldsForStaff) {
          if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
          }
        }
        req.body = updates;
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1 && req.user.roleId !== 4) {
        if (staff.user_vertical_id !== req.user.verticalId && req.user.verticalId !== null) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to update this staff record',
            code: 'FORBIDDEN'
          });
        }
      }

      const updatedStaff = await Staff.update(req.params.id, req.body);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'staff',
        entity_id: updatedStaff.id,
        old_values: staff,
        new_values: updatedStaff,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedStaff,
        message: 'Staff updated successfully'
      });
    } catch (error) {
      console.error('Error in updateStaff:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateStaffStatus(req, res) {
    try {
      const staff = await Staff.findById(req.params.id);
      
      if (!staff) {
        return res.status(404).json({
          success: false,
          error: 'Staff not found',
          code: 'NOT_FOUND'
        });
      }

      // Only HR Lead and Super Admin can update status
      if (req.user.roleId !== 1 && req.user.roleId !== 4) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to update staff status',
          code: 'FORBIDDEN'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId === 4 && staff.user_vertical_id !== req.user.verticalId && staff.user_vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to update this staff record',
          code: 'FORBIDDEN'
        });
      }

      const { status, resignation_date, relieving_date } = req.body;

      const updatedStaff = await Staff.updateStatus(req.params.id, status, resignation_date, relieving_date);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE_STATUS',
        entity_type: 'staff',
        entity_id: updatedStaff.id,
        old_values: staff,
        new_values: updatedStaff,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedStaff,
        message: 'Staff status updated successfully'
      });
    } catch (error) {
      console.error('Error in updateStaffStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateBurnoutLevel(req, res) {
    try {
      const staff = await Staff.findById(req.params.id);
      
      if (!staff) {
        return res.status(404).json({
          success: false,
          error: 'Staff not found',
          code: 'NOT_FOUND'
        });
      }

      // Only HR Lead and Super Admin can update burnout level
      if (req.user.roleId !== 1 && req.user.roleId !== 4) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to update burnout level',
          code: 'FORBIDDEN'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId === 4 && staff.user_vertical_id !== req.user.verticalId && staff.user_vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to update this staff record',
          code: 'FORBIDDEN'
        });
      }

      const { burnout_level } = req.body;

      if (!['low', 'medium', 'high'].includes(burnout_level)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid burnout level. Must be low, medium, or high',
          code: 'BAD_REQUEST'
        });
      }

      const updatedStaff = await Staff.updateBurnoutLevel(req.params.id, burnout_level);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE_BURNOUT',
        entity_type: 'staff',
        entity_id: updatedStaff.id,
        old_values: staff,
        new_values: updatedStaff,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedStaff,
        message: 'Burnout level updated successfully'
      });
    } catch (error) {
      console.error('Error in updateBurnoutLevel:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async deleteStaff(req, res) {
    try {
      const staff = await Staff.findById(req.params.id);
      
      if (!staff) {
        return res.status(404).json({
          success: false,
          error: 'Staff not found',
          code: 'NOT_FOUND'
        });
      }

      // Only HR Lead and Super Admin can deactivate staff
      if (req.user.roleId !== 1 && req.user.roleId !== 4) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to deactivate staff',
          code: 'FORBIDDEN'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId === 4 && staff.user_vertical_id !== req.user.verticalId && staff.user_vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to deactivate this staff record',
          code: 'FORBIDDEN'
        });
      }

      const deletedStaff = await Staff.delete(req.params.id);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'staff',
        entity_id: req.params.id,
        old_values: staff,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: deletedStaff,
        message: 'Staff deactivated successfully'
      });
    } catch (error) {
      console.error('Error in deleteStaff:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async searchStaff(req, res) {
    try {
      const { search } = req.query;
      
      if (!search || search.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Search term is required',
          code: 'BAD_REQUEST'
        });
      }

      let results = await Staff.search(search);

      // Apply vertical isolation
      if (req.user.roleId !== 1 && req.user.roleId !== 4) {
        if (req.user.roleId === 3) {
          // Staff can only see themselves
          const staffMember = await Staff.findByUserId(req.user.id);
          results = results.filter(staff => staff.id === staffMember.id);
        } else {
          // Vertical Lead can see their vertical
          results = results.filter(staff => staff.vertical_id === req.user.verticalId);
        }
      }

      res.json({
        success: true,
        data: results,
        message: `Found ${results.length} staff members matching "${search}"`
      });
    } catch (error) {
      console.error('Error in searchStaff:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getStaffDirectory(req, res) {
    try {
      const { department, vertical_id, status = 'active' } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1 && req.user.roleId !== 4) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access this directory',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      // Staff can only see themselves in directory
      if (req.user.roleId === 3) {
        const staffMember = await Staff.findByUserId(req.user.id);
        if (staffMember) {
          return res.json({
            success: true,
            data: [staffMember],
            message: 'Staff directory retrieved successfully'
          });
        }
        return res.status(404).json({
          success: false,
          error: 'Staff record not found',
          code: 'NOT_FOUND'
        });
      }

      const directory = await Staff.getDirectory({
        department,
        vertical_id: finalVerticalId,
        status
      });

      res.json({
        success: true,
        data: directory,
        message: 'Staff directory retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getStaffDirectory:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getStaffByDepartment(req, res) {
    try {
      const { department } = req.params;
      const { page = 1, limit = 10 } = req.query;

      // Apply vertical isolation
      if (req.user.roleId !== 1 && req.user.roleId !== 4) {
        const staffMember = await Staff.findByUserId(req.user.id);
        if (staffMember && staffMember.department !== department) {
          // Staff can only view their own department
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access this department',
            code: 'FORBIDDEN'
          });
        }
      }

      const result = await Staff.getByDepartment(department, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: `Staff from ${department} department retrieved successfully`
      });
    } catch (error) {
      console.error('Error in getStaffByDepartment:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getStaffStatistics(req, res) {
    try {
      const { vertical_id } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1 && req.user.roleId !== 4) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access these statistics',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const stats = await Staff.getStats({
        vertical_id: finalVerticalId
      });

      res.json({
        success: true,
        data: stats,
        message: 'Staff statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getStaffStatistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getExpiringContracts(req, res) {
    try {
      const { days = 30 } = req.query;

      // Apply vertical isolation
      let contracts = await Staff.getExpiringContracts(parseInt(days));

      if (req.user.roleId !== 1 && req.user.roleId !== 4) {
        if (req.user.roleId === 3) {
          // Staff can only see their own
          const staffMember = await Staff.findByUserId(req.user.id);
          contracts = contracts.filter(staff => staff.id === staffMember.id);
        } else {
          // Vertical Lead can see their vertical
          contracts = contracts.filter(staff => staff.vertical_id === req.user.verticalId);
        }
      }

      res.json({
        success: true,
        data: contracts,
        message: `Staff with contracts expiring in ${days} days retrieved successfully`
      });
    } catch (error) {
      console.error('Error in getExpiringContracts:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getBurnoutReport(req, res) {
    try {
      const { vertical_id, burnout_level } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1 && req.user.roleId !== 4) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access this report',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      // Staff can only see their own burnout info
      if (req.user.roleId === 3) {
        const staffMember = await Staff.findByUserId(req.user.id);
        if (staffMember) {
          const burnoutInfo = await Staff.calculateBurnoutRisk(staffMember.id);
          return res.json({
            success: true,
            data: [burnoutInfo],
            message: 'Burnout report retrieved successfully'
          });
        }
        return res.status(404).json({
          success: false,
          error: 'Staff record not found',
          code: 'NOT_FOUND'
        });
      }

      const report = await Staff.getBurnoutReport({
        vertical_id: finalVerticalId,
        burnout_level
      });

      res.json({
        success: true,
        data: report,
        message: 'Burnout report retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getBurnoutReport:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async calculateBurnoutRisk(req, res) {
    try {
      const { id } = req.params;

      // Only HR Lead and Super Admin can calculate burnout risk for others
      if (req.user.roleId !== 1 && req.user.roleId !== 4) {
        // Staff can calculate their own
        const staffMember = await Staff.findByUserId(req.user.id);
        if (!staffMember || staffMember.id !== parseInt(id)) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to calculate burnout risk for this staff member',
            code: 'FORBIDDEN'
          });
        }
      }

      const burnoutInfo = await Staff.calculateBurnoutRisk(id);

      if (!burnoutInfo) {
        return res.status(404).json({
          success: false,
          error: 'Staff not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId === 4) {
        const staff = await Staff.findById(id);
        if (staff.user_vertical_id !== req.user.verticalId && staff.user_vertical_id !== null) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access this staff record',
            code: 'FORBIDDEN'
          });
        }
      }

      // Update the burnout level in the database
      await Staff.updateBurnoutLevel(id, burnoutInfo.burnout_level);

      res.json({
        success: true,
        data: burnoutInfo,
        message: 'Burnout risk calculated successfully'
      });
    } catch (error) {
      console.error('Error in calculateBurnoutRisk:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
};

export default staffController;
