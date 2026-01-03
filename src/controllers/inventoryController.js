import Inventory from '../models/Inventory.js';
import AuditLog from '../models/AuditLog.js';

export const inventoryController = {
  async getAllInventory(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        category,
        subcategory,
        vertical_id,
        vendor_id,
        search,
        sort = 'i.created_at',
        order = 'desc'
      } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access inventory from another vertical',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const result = await Inventory.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        category,
        subcategory,
        vertical_id: finalVerticalId,
        vendor_id,
        search,
        sort,
        order
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Inventory items retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllInventory:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getInventoryById(req, res) {
    try {
      const item = await Inventory.findById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Inventory item not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (item.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access this inventory item',
            code: 'FORBIDDEN'
          });
        }
      }

      // Get stock transactions
      const transactions = await Inventory.getStockTransactions(item.id, { limit: 20 });

      res.json({
        success: true,
        data: {
          ...item,
          recent_transactions: transactions
        },
        message: 'Inventory item retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getInventoryById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async createInventoryItem(req, res) {
    try {
      const {
        name,
        description,
        category,
        subcategory,
        unit,
        current_quantity = 0,
        minimum_quantity = 10,
        maximum_quantity,
        reorder_quantity = 50,
        unit_cost = 0,
        location,
        vendor_id,
        vertical_id
      } = req.body;

      // Set vertical_id to user's vertical if not provided
      let finalVerticalId = vertical_id;
      if (!finalVerticalId && req.user.roleId !== 1) {
        finalVerticalId = req.user.verticalId;
      }

      const inventoryData = {
        name,
        description,
        category,
        subcategory,
        unit,
        current_quantity,
        minimum_quantity,
        maximum_quantity,
        reorder_quantity,
        unit_cost,
        location,
        vendor_id,
        vertical_id: finalVerticalId,
        created_by: req.user.id
      };

      const newItem = await Inventory.create(inventoryData);

      // If initial quantity > 0, create stock transaction
      if (current_quantity > 0) {
        await Inventory.createStockTransaction({
          inventory_id: newItem.id,
          transaction_type: 'in',
          quantity: current_quantity,
          unit_cost: unit_cost,
          reference_type: 'manual',
          reference_id: newItem.id,
          reason: 'Initial stock entry',
          performed_by: req.user.id,
          vertical_id: finalVerticalId
        });
      }

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'inventory',
        entity_id: newItem.id,
        new_values: newItem,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: newItem,
        message: 'Inventory item created successfully'
      });
    } catch (error) {
      console.error('Error in createInventoryItem:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateInventoryItem(req, res) {
    try {
      const item = await Inventory.findById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Inventory item not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (item.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to update this inventory item',
            code: 'FORBIDDEN'
          });
        }
      }

      const updatedItem = await Inventory.update(req.params.id, req.body);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'inventory',
        entity_id: updatedItem.id,
        old_values: item,
        new_values: updatedItem,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedItem,
        message: 'Inventory item updated successfully'
      });
    } catch (error) {
      console.error('Error in updateInventoryItem:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateInventoryQuantity(req, res) {
    try {
      const item = await Inventory.findById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Inventory item not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (item.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to update this inventory item',
            code: 'FORBIDDEN'
          });
        }
      }

      const { quantity, unit_cost } = req.body;
      const updatedItem = await Inventory.updateQuantity(req.params.id, quantity, unit_cost);

      // Calculate difference for stock transaction
      const difference = quantity - item.current_quantity;

      if (difference !== 0) {
        // Create stock transaction
        await Inventory.createStockTransaction({
          inventory_id: item.id,
          transaction_type: difference > 0 ? 'in' : 'out',
          quantity: Math.abs(difference),
          unit_cost: unit_cost || item.unit_cost,
          reference_type: 'manual',
          reference_id: item.id,
          reason: req.body.reason || 'Manual quantity adjustment',
          performed_by: req.user.id,
          vertical_id: item.vertical_id
        });
      }

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE_QUANTITY',
        entity_type: 'inventory',
        entity_id: updatedItem.id,
        old_values: item,
        new_values: updatedItem,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedItem,
        message: 'Inventory quantity updated successfully'
      });
    } catch (error) {
      console.error('Error in updateInventoryQuantity:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async deleteInventoryItem(req, res) {
    try {
      const item = await Inventory.findById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Inventory item not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (item.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to delete this inventory item',
            code: 'FORBIDDEN'
          });
        }
      }

      const deletedItem = await Inventory.delete(req.params.id);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'inventory',
        entity_id: req.params.id,
        old_values: item,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: deletedItem,
        message: 'Inventory item deactivated successfully'
      });
    } catch (error) {
      console.error('Error in deleteInventoryItem:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async searchInventory(req, res) {
    try {
      const { search } = req.query;

      if (!search) {
        return res.status(400).json({
          success: false,
          error: 'Search term is required',
          code: 'BAD_REQUEST'
        });
      }

      const results = await Inventory.search(search);

      // Filter results based on vertical access
      let filteredResults = results;
      if (req.user.roleId !== 1) {
        filteredResults = results.filter(i => i.vertical_id === req.user.verticalId);
      }

      res.json({
        success: true,
        data: filteredResults,
        message: 'Inventory items retrieved successfully'
      });
    } catch (error) {
      console.error('Error in searchInventory:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getLowStockItems(req, res) {
    try {
      const { vertical_id } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access inventory from this vertical',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const items = await Inventory.getLowStock(finalVerticalId);

      res.json({
        success: true,
        data: items,
        count: items.length,
        message: 'Low stock items retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getLowStockItems:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getOutOfStockItems(req, res) {
    try {
      const { vertical_id } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access inventory from this vertical',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const items = await Inventory.getOutOfStock(finalVerticalId);

      res.json({
        success: true,
        data: items,
        count: items.length,
        message: 'Out of stock items retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getOutOfStockItems:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getInventoryByVertical(req, res) {
    try {
      const { vertical_id } = req.params;
      const { page = 1, limit = 10, category, status } = req.query;

      // Apply vertical isolation
      if (req.user.roleId !== 1 && parseInt(vertical_id) !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access inventory from this vertical',
          code: 'FORBIDDEN'
        });
      }

      const result = await Inventory.getByVertical(vertical_id, {
        page: parseInt(page),
        limit: parseInt(limit),
        category,
        status
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Inventory items retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getInventoryByVertical:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async createStockTransaction(req, res) {
    try {
      const {
        inventory_id,
        transaction_type,
        quantity,
        unit_cost,
        reference_type,
        reference_id,
        reason,
        vertical_id
      } = req.body;

      // Verify inventory exists and user has access
      const item = await Inventory.findById(inventory_id);
      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Inventory item not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (item.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to create transactions for this inventory item',
            code: 'FORBIDDEN'
          });
        }
      }

      const transactionId = await Inventory.createStockTransaction({
        inventory_id,
        transaction_type,
        quantity,
        unit_cost,
        reference_type,
        reference_id,
        reason,
        performed_by: req.user.id,
        vertical_id: vertical_id || item.vertical_id
      });

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'STOCK_TRANSACTION',
        entity_type: 'stock_transaction',
        entity_id: transactionId,
        new_values: {
          inventory_id,
          transaction_type,
          quantity,
          reference_type,
          reference_id
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: { id: transactionId },
        message: 'Stock transaction created successfully'
      });
    } catch (error) {
      console.error('Error in createStockTransaction:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getStockTransactions(req, res) {
    try {
      const { inventory_id } = req.params;
      const { page = 1, limit = 50, transaction_type } = req.query;

      // Verify inventory exists and user has access
      const item = await Inventory.findById(inventory_id);
      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Inventory item not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (item.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access transactions for this inventory item',
            code: 'FORBIDDEN'
          });
        }
      }

      const transactions = await Inventory.getStockTransactions(inventory_id, {
        page: parseInt(page),
        limit: parseInt(limit),
        transaction_type
      });

      res.json({
        success: true,
        data: transactions,
        message: 'Stock transactions retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getStockTransactions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getInventoryStats(req, res) {
    try {
      const { vertical_id } = req.query;

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

      const stats = await Inventory.getStats({ vertical_id: finalVerticalId });

      res.json({
        success: true,
        data: stats,
        message: 'Inventory statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getInventoryStats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getInventoryByCategory(req, res) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 10, vertical_id } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access inventory from this vertical',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const result = await Inventory.getByCategory(category, {
        page: parseInt(page),
        limit: parseInt(limit),
        vertical_id: finalVerticalId
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Inventory items retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getInventoryByCategory:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getAgingReport(req, res) {
    try {
      const { vertical_id } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access reports for this vertical',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const report = await Inventory.getAgingReport(finalVerticalId);

      res.json({
        success: true,
        data: report,
        message: 'Aging report retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAgingReport:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
};

export default inventoryController;
