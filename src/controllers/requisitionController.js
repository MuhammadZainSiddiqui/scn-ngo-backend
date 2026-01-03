import Requisition from '../models/Requisition.js';
import AuditLog from '../models/AuditLog.js';
import Inventory from '../models/Inventory.js';

export const requisitionController = {
  async getAllRequisitions(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        vertical_id,
        program_id,
        priority,
        requested_by,
        vendor_id,
        search,
        sort = 'r.created_at',
        order = 'desc'
      } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access requisitions from another vertical',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const result = await Requisition.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        vertical_id: finalVerticalId,
        program_id,
        priority,
        requested_by,
        vendor_id,
        search,
        sort,
        order
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Requisitions retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllRequisitions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getRequisitionById(req, res) {
    try {
      const requisition = await Requisition.findById(req.params.id);

      if (!requisition) {
        return res.status(404).json({
          success: false,
          error: 'Requisition not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (requisition.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access this requisition',
            code: 'FORBIDDEN'
          });
        }
      }

      // Get items
      const items = await Requisition.getItems(requisition.id);

      res.json({
        success: true,
        data: {
          ...requisition,
          items
        },
        message: 'Requisition retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getRequisitionById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async createRequisition(req, res) {
    try {
      const {
        title,
        description,
        purpose,
        vertical_id,
        program_id,
        department,
        priority = 'medium',
        notes
      } = req.body;

      // Set vertical_id to user's vertical if not provided
      let finalVerticalId = vertical_id;
      if (!finalVerticalId && req.user.roleId !== 1) {
        finalVerticalId = req.user.verticalId;
      }

      const requisitionData = {
        title,
        description,
        purpose,
        vertical_id: finalVerticalId,
        program_id,
        requested_by: req.user.id,
        department,
        priority,
        notes
      };

      const newRequisition = await Requisition.create(requisitionData);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'requisition',
        entity_id: newRequisition.id,
        new_values: newRequisition,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: newRequisition,
        message: 'Requisition created successfully'
      });
    } catch (error) {
      console.error('Error in createRequisition:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateRequisition(req, res) {
    try {
      const requisition = await Requisition.findById(req.params.id);

      if (!requisition) {
        return res.status(404).json({
          success: false,
          error: 'Requisition not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (requisition.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to update this requisition',
            code: 'FORBIDDEN'
          });
        }
      }

      // Only allow updates for pending requisitions
      if (requisition.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Cannot update requisition that has been approved, ordered, or received',
          code: 'BAD_REQUEST'
        });
      }

      const updatedRequisition = await Requisition.update(req.params.id, req.body);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'requisition',
        entity_id: updatedRequisition.id,
        old_values: requisition,
        new_values: updatedRequisition,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedRequisition,
        message: 'Requisition updated successfully'
      });
    } catch (error) {
      console.error('Error in updateRequisition:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async approveRequisition(req, res) {
    try {
      const requisition = await Requisition.findById(req.params.id);

      if (!requisition) {
        return res.status(404).json({
          success: false,
          error: 'Requisition not found',
          code: 'NOT_FOUND'
        });
      }

      // Check if user can approve (Super Admin or Vertical Lead)
      if (req.user.roleId !== 1 && req.user.roleId !== 2) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to approve requisitions',
          code: 'FORBIDDEN'
        });
      }

      // Apply vertical isolation for Vertical Leads
      if (req.user.roleId === 2 && requisition.vertical_id !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to approve requisitions from another vertical',
          code: 'FORBIDDEN'
        });
      }

      // Only approve pending requisitions
      if (requisition.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Cannot approve requisition with current status',
          code: 'BAD_REQUEST'
        });
      }

      const updatedRequisition = await Requisition.approve(req.params.id, req.user.id);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'APPROVE',
        entity_type: 'requisition',
        entity_id: updatedRequisition.id,
        old_values: requisition,
        new_values: updatedRequisition,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedRequisition,
        message: 'Requisition approved successfully'
      });
    } catch (error) {
      console.error('Error in approveRequisition:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async rejectRequisition(req, res) {
    try {
      const requisition = await Requisition.findById(req.params.id);

      if (!requisition) {
        return res.status(404).json({
          success: false,
          error: 'Requisition not found',
          code: 'NOT_FOUND'
        });
      }

      // Check if user can reject (Super Admin or Vertical Lead)
      if (req.user.roleId !== 1 && req.user.roleId !== 2) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to reject requisitions',
          code: 'FORBIDDEN'
        });
      }

      // Apply vertical isolation for Vertical Leads
      if (req.user.roleId === 2 && requisition.vertical_id !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to reject requisitions from another vertical',
          code: 'FORBIDDEN'
        });
      }

      // Only reject pending requisitions
      if (requisition.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Cannot reject requisition with current status',
          code: 'BAD_REQUEST'
        });
      }

      const { rejection_reason } = req.body;
      const updatedRequisition = await Requisition.reject(req.params.id, req.user.id, rejection_reason);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'REJECT',
        entity_type: 'requisition',
        entity_id: updatedRequisition.id,
        old_values: requisition,
        new_values: updatedRequisition,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedRequisition,
        message: 'Requisition rejected successfully'
      });
    } catch (error) {
      console.error('Error in rejectRequisition:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async orderRequisition(req, res) {
    try {
      const requisition = await Requisition.findById(req.params.id);

      if (!requisition) {
        return res.status(404).json({
          success: false,
          error: 'Requisition not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (requisition.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to order this requisition',
            code: 'FORBIDDEN'
          });
        }
      }

      // Only order approved requisitions
      if (requisition.status !== 'approved') {
        return res.status(400).json({
          success: false,
          error: 'Can only order approved requisitions',
          code: 'BAD_REQUEST'
        });
      }

      const { vendor_id, po_number } = req.body;
      const updatedRequisition = await Requisition.order(req.params.id, req.user.id, vendor_id, po_number);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'ORDER',
        entity_type: 'requisition',
        entity_id: updatedRequisition.id,
        old_values: requisition,
        new_values: updatedRequisition,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedRequisition,
        message: 'Requisition ordered successfully'
      });
    } catch (error) {
      console.error('Error in orderRequisition:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async receiveRequisition(req, res) {
    try {
      const requisition = await Requisition.findById(req.params.id);

      if (!requisition) {
        return res.status(404).json({
          success: false,
          error: 'Requisition not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (requisition.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to receive this requisition',
            code: 'FORBIDDEN'
          });
        }
      }

      // Only receive ordered requisitions
      if (requisition.status !== 'ordered') {
        return res.status(400).json({
          success: false,
          error: 'Can only receive ordered requisitions',
          code: 'BAD_REQUEST'
        });
      }

      const updatedRequisition = await Requisition.receive(req.params.id, req.user.id);

      // Update inventory for received items
      const items = await Requisition.getItems(requisition.id);
      for (const item of items) {
        if (item.inventory_id && item.received_quantity > 0) {
          // Create stock transaction
          await Inventory.createStockTransaction({
            inventory_id: item.inventory_id,
            transaction_type: 'in',
            quantity: item.received_quantity,
            unit_cost: item.actual_unit_cost || item.estimated_unit_cost,
            reference_type: 'requisition',
            reference_id: requisition.id,
            reason: `Received from requisition ${requisition.requisition_number}`,
            performed_by: req.user.id,
            vertical_id: requisition.vertical_id
          });
        }
      }

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'RECEIVE',
        entity_type: 'requisition',
        entity_id: updatedRequisition.id,
        old_values: requisition,
        new_values: updatedRequisition,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedRequisition,
        message: 'Requisition received successfully'
      });
    } catch (error) {
      console.error('Error in receiveRequisition:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async deleteRequisition(req, res) {
    try {
      const requisition = await Requisition.findById(req.params.id);

      if (!requisition) {
        return res.status(404).json({
          success: false,
          error: 'Requisition not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (requisition.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to delete this requisition',
            code: 'FORBIDDEN'
          });
        }
      }

      // Only creator can delete (or Super Admin)
      if (req.user.roleId !== 1 && requisition.requested_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own requisitions',
          code: 'FORBIDDEN'
        });
      }

      const deletedRequisition = await Requisition.delete(req.params.id);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'requisition',
        entity_id: req.params.id,
        old_values: requisition,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: deletedRequisition,
        message: 'Requisition deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteRequisition:', error);
      if (error.message === 'Cannot delete requisition that has been approved, ordered, or received') {
        return res.status(400).json({
          success: false,
          error: error.message,
          code: 'BAD_REQUEST'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async searchRequisitions(req, res) {
    try {
      const { search } = req.query;

      if (!search) {
        return res.status(400).json({
          success: false,
          error: 'Search term is required',
          code: 'BAD_REQUEST'
        });
      }

      const results = await Requisition.search(search);

      // Filter results based on vertical access
      let filteredResults = results;
      if (req.user.roleId !== 1) {
        filteredResults = results.filter(r => !r.vertical_id || r.vertical_id === req.user.verticalId);
      }

      res.json({
        success: true,
        data: filteredResults,
        message: 'Requisitions retrieved successfully'
      });
    } catch (error) {
      console.error('Error in searchRequisitions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async addRequisitionItem(req, res) {
    try {
      const requisition = await Requisition.findById(req.params.id);

      if (!requisition) {
        return res.status(404).json({
          success: false,
          error: 'Requisition not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (requisition.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to add items to this requisition',
            code: 'FORBIDDEN'
          });
        }
      }

      // Only add items to pending requisitions
      if (requisition.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Cannot add items to requisition that has been approved, ordered, or received',
          code: 'BAD_REQUEST'
        });
      }

      const item = await Requisition.addItem(req.params.id, req.body);

      res.status(201).json({
        success: true,
        data: item,
        message: 'Item added to requisition successfully'
      });
    } catch (error) {
      console.error('Error in addRequisitionItem:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateRequisitionItem(req, res) {
    try {
      const requisition = await Requisition.findById(req.params.id);

      if (!requisition) {
        return res.status(404).json({
          success: false,
          error: 'Requisition not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (requisition.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to update items in this requisition',
            code: 'FORBIDDEN'
          });
        }
      }

      // Only update items in pending requisitions
      if (requisition.status !== 'pending' && requisition.status !== 'approved') {
        return res.status(400).json({
          success: false,
          error: 'Cannot update items in requisition with current status',
          code: 'BAD_REQUEST'
        });
      }

      const item = await Requisition.updateItem(req.params.itemId, req.body);

      res.json({
        success: true,
        data: item,
        message: 'Item updated successfully'
      });
    } catch (error) {
      console.error('Error in updateRequisitionItem:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async deleteRequisitionItem(req, res) {
    try {
      const requisition = await Requisition.findById(req.params.id);

      if (!requisition) {
        return res.status(404).json({
          success: false,
          error: 'Requisition not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (requisition.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to delete items from this requisition',
            code: 'FORBIDDEN'
          });
        }
      }

      // Only delete items from pending requisitions
      if (requisition.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete items from requisition that has been approved, ordered, or received',
          code: 'BAD_REQUEST'
        });
      }

      const result = await Requisition.deleteItem(req.params.itemId);

      res.json({
        success: true,
        data: result,
        message: 'Item deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteRequisitionItem:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getRequisitionStats(req, res) {
    try {
      const { vertical_id, program_id, start_date, end_date } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access statistics for this vertical',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const stats = await Requisition.getStats({
        vertical_id: finalVerticalId,
        program_id,
        start_date,
        end_date
      });

      res.json({
        success: true,
        data: stats,
        message: 'Requisition statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getRequisitionStats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
};

export default requisitionController;
