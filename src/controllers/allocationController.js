import Allocation from '../models/Allocation.js';
import Donation from '../models/Donation.js';
import AuditLog from '../models/AuditLog.js';
import { executeQuery } from '../config/database.js';

export const allocationController = {
  async getAllAllocations(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        donation_id,
        vertical_id,
        program_id,
        sort = 'da.created_at',
        order = 'desc'
      } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access allocations from another vertical',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const result = await Allocation.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        donation_id,
        vertical_id: finalVerticalId,
        program_id,
        sort,
        order
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Allocations retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllAllocations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getAllocationById(req, res) {
    try {
      const allocation = await Allocation.findById(req.params.id);
      
      if (!allocation) {
        return res.status(404).json({
          success: false,
          error: 'Allocation not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1 && allocation.vertical_id !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this allocation',
          code: 'FORBIDDEN'
        });
      }

      res.json({
        success: true,
        data: allocation,
        message: 'Allocation retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllocationById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getAllocationsByDonation(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const donationId = req.params.donationId;

      // Verify donation exists
      const donation = await Donation.findById(donationId);
      if (!donation) {
        return res.status(404).json({
          success: false,
          error: 'Donation not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1 && donation.vertical_id !== req.user.verticalId && donation.vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access allocations for this donation',
          code: 'FORBIDDEN'
        });
      }

      const result = await Allocation.findByDonation(donationId);

      res.json({
        success: true,
        data: result,
        message: 'Donation allocations retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllocationsByDonation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getAllocationsByVertical(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const verticalId = req.params.verticalId;

      // Apply vertical isolation
      if (req.user.roleId !== 1 && parseInt(verticalId) !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access allocations from another vertical',
          code: 'FORBIDDEN'
        });
      }

      const result = await Allocation.findByVertical(verticalId, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Vertical allocations retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllocationsByVertical:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getAllocationsByProgram(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const programId = req.params.programId;

      const result = await Allocation.findByProgram(programId, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Program allocations retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllocationsByProgram:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async createAllocation(req, res) {
    try {
      const { donation_id, vertical_id, program_id, amount, allocation_percentage, notes } = req.body;

      // Verify donation exists and user has access
      const donation = await Donation.findById(donation_id);
      if (!donation) {
        return res.status(404).json({
          success: false,
          error: 'Donation not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1 && donation.vertical_id !== req.user.verticalId && donation.vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to create allocations for this donation',
          code: 'FORBIDDEN'
        });
      }

      // Verify vertical exists and user has access to it
      if (vertical_id) {
        const verticalQuery = 'SELECT id FROM verticals WHERE id = ? AND is_active = TRUE';
        const verticalResult = await executeQuery(verticalQuery, [vertical_id]);
        
        if (verticalResult.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Vertical not found',
            code: 'BAD_REQUEST'
          });
        }

        // Check vertical access
        if (req.user.roleId !== 1 && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to allocate to another vertical',
            code: 'FORBIDDEN'
          });
        }
      }

      // Verify program exists if provided
      if (program_id) {
        const programQuery = 'SELECT id, vertical_id FROM programs WHERE id = ? AND status != "cancelled"';
        const programResult = await executeQuery(programQuery, [program_id]);
        
        if (programResult.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Program not found',
            code: 'BAD_REQUEST'
          });
        }

        // If vertical_id is provided, ensure program belongs to the same vertical
        if (vertical_id && programResult[0].vertical_id !== parseInt(vertical_id)) {
          return res.status(400).json({
            success: false,
            error: 'Program does not belong to the specified vertical',
            code: 'BAD_REQUEST'
          });
        }
      }

      // Ensure positive amount
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Allocation amount must be positive',
          code: 'BAD_REQUEST'
        });
      }

      // Ensure either vertical_id or program_id is provided
      if (!vertical_id && !program_id) {
        return res.status(400).json({
          success: false,
          error: 'Either vertical_id or program_id must be provided',
          code: 'BAD_REQUEST'
        });
      }

      const allocationData = {
        donation_id,
        vertical_id,
        program_id,
        amount,
        allocation_percentage,
        notes
      };

      const newAllocation = await Allocation.create(allocationData);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'donation_allocations',
        entity_id: newAllocation.id,
        new_values: newAllocation,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: newAllocation,
        message: 'Allocation created successfully'
      });
    } catch (error) {
      console.error('Error in createAllocation:', error);
      
      // Handle specific error types
      if (error.message.includes('Can only allocate from confirmed donations')) {
        return res.status(422).json({
          success: false,
          error: error.message,
          code: 'INVALID_DONATION_STATUS'
        });
      }
      
      if (error.message.includes('Total allocations would exceed donation amount')) {
        return res.status(422).json({
          success: false,
          error: error.message,
          code: 'ALLOCATION_EXCEEDS_DONATION'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateAllocation(req, res) {
    try {
      const allocation = await Allocation.findById(req.params.id);
      
      if (!allocation) {
        return res.status(404).json({
          success: false,
          error: 'Allocation not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1 && allocation.vertical_id !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to update this allocation',
          code: 'FORBIDDEN'
        });
      }

      // Ensure positive amount if amount is being updated
      if (req.body.amount !== undefined && req.body.amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Allocation amount must be positive',
          code: 'BAD_REQUEST'
        });
      }

      // Verify vertical access if vertical_id is being updated
      if (req.body.vertical_id && req.body.vertical_id !== allocation.vertical_id) {
        if (req.user.roleId !== 1 && parseInt(req.body.vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to allocate to another vertical',
            code: 'FORBIDDEN'
          });
        }
      }

      const updatedAllocation = await Allocation.update(req.params.id, req.body);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'donation_allocations',
        entity_id: updatedAllocation.id,
        old_values: allocation,
        new_values: updatedAllocation,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedAllocation,
        message: 'Allocation updated successfully'
      });
    } catch (error) {
      console.error('Error in updateAllocation:', error);
      
      // Handle specific error types
      if (error.message.includes('Updated allocation would exceed donation amount')) {
        return res.status(422).json({
          success: false,
          error: error.message,
          code: 'ALLOCATION_EXCEEDS_DONATION'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async deleteAllocation(req, res) {
    try {
      const allocation = await Allocation.findById(req.params.id);
      
      if (!allocation) {
        return res.status(404).json({
          success: false,
          error: 'Allocation not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1 && allocation.vertical_id !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to delete this allocation',
          code: 'FORBIDDEN'
        });
      }

      const deletedAllocation = await Allocation.delete(req.params.id);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'donation_allocations',
        entity_id: req.params.id,
        old_values: allocation,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: deletedAllocation,
        message: 'Allocation deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteAllocation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async reallocate(req, res) {
    try {
      const allocation = await Allocation.findById(req.params.id);
      
      if (!allocation) {
        return res.status(404).json({
          success: false,
          error: 'Allocation not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1 && allocation.vertical_id !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to reallocate this allocation',
          code: 'FORBIDDEN'
        });
      }

      const { new_vertical_id, new_program_id } = req.body;

      // Verify new vertical access
      if (req.user.roleId !== 1 && parseInt(new_vertical_id) !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to allocate to another vertical',
          code: 'FORBIDDEN'
        });
      }

      // Verify new vertical exists
      const verticalQuery = 'SELECT id FROM verticals WHERE id = ? AND is_active = TRUE';
      const verticalResult = await executeQuery(verticalQuery, [new_vertical_id]);
      
      if (verticalResult.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'New vertical not found',
          code: 'BAD_REQUEST'
        });
      }

      const newAllocation = await Allocation.reallocate(
        req.params.id,
        new_vertical_id,
        new_program_id
      );

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'REALLOCATE',
        entity_type: 'donation_allocations',
        entity_id: newAllocation.id,
        old_values: allocation,
        new_values: newAllocation,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: newAllocation,
        message: 'Allocation reallocated successfully'
      });
    } catch (error) {
      console.error('Error in reallocate:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
};

export default allocationController;