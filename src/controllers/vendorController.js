import Vendor from '../models/Vendor.js';
import AuditLog from '../models/AuditLog.js';

export const vendorController = {
  async getAllVendors(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        type,
        category,
        vertical_id,
        search,
        sort = 'v.created_at',
        order = 'desc'
      } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access vendors from another vertical',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const result = await Vendor.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        type,
        category,
        vertical_id: finalVerticalId,
        search,
        sort,
        order
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Vendors retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllVendors:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getVendorById(req, res) {
    try {
      const vendor = await Vendor.findById(req.params.id);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          error: 'Vendor not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (vendor.vertical_id && vendor.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access this vendor',
            code: 'FORBIDDEN'
          });
        }
      }

      res.json({
        success: true,
        data: vendor,
        message: 'Vendor retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getVendorById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async createVendor(req, res) {
    try {
      const {
        name,
        type = 'goods',
        category,
        contact_person,
        email,
        phone,
        alternate_phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country = 'India',
        gstin,
        pan_number,
        payment_terms = '30 days',
        credit_limit = 0,
        bank_name,
        bank_account_number,
        bank_ifsc,
        status = 'active',
        vertical_id,
        notes
      } = req.body;

      // Set vertical_id to user's vertical if not provided and not super admin
      let finalVerticalId = vertical_id;
      if (!finalVerticalId && req.user.roleId !== 1) {
        finalVerticalId = req.user.verticalId;
      }

      const vendorData = {
        name,
        type,
        category,
        contact_person,
        email,
        phone,
        alternate_phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        gstin,
        pan_number,
        payment_terms,
        credit_limit,
        bank_name,
        bank_account_number,
        bank_ifsc,
        status,
        vertical_id: finalVerticalId,
        notes,
        created_by: req.user.id
      };

      const newVendor = await Vendor.create(vendorData);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'vendor',
        entity_id: newVendor.id,
        new_values: newVendor,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: newVendor,
        message: 'Vendor created successfully'
      });
    } catch (error) {
      console.error('Error in createVendor:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateVendor(req, res) {
    try {
      const vendor = await Vendor.findById(req.params.id);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          error: 'Vendor not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (vendor.vertical_id && vendor.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to update this vendor',
            code: 'FORBIDDEN'
          });
        }
      }

      const updatedVendor = await Vendor.update(req.params.id, req.body);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'vendor',
        entity_id: updatedVendor.id,
        old_values: vendor,
        new_values: updatedVendor,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedVendor,
        message: 'Vendor updated successfully'
      });
    } catch (error) {
      console.error('Error in updateVendor:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateVendorStatus(req, res) {
    try {
      const vendor = await Vendor.findById(req.params.id);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          error: 'Vendor not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (vendor.vertical_id && vendor.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to update this vendor',
            code: 'FORBIDDEN'
          });
        }
      }

      const { status } = req.body;
      const updatedVendor = await Vendor.updateStatus(req.params.id, status);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE_STATUS',
        entity_type: 'vendor',
        entity_id: updatedVendor.id,
        old_values: vendor,
        new_values: updatedVendor,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedVendor,
        message: 'Vendor status updated successfully'
      });
    } catch (error) {
      console.error('Error in updateVendorStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async deleteVendor(req, res) {
    try {
      const vendor = await Vendor.findById(req.params.id);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          error: 'Vendor not found',
          code: 'NOT_FOUND'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        if (vendor.vertical_id && vendor.vertical_id !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to delete this vendor',
            code: 'FORBIDDEN'
          });
        }
      }

      const deletedVendor = await Vendor.delete(req.params.id);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'vendor',
        entity_id: req.params.id,
        old_values: vendor,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: deletedVendor,
        message: 'Vendor deactivated successfully'
      });
    } catch (error) {
      console.error('Error in deleteVendor:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async searchVendors(req, res) {
    try {
      const { search } = req.query;

      if (!search) {
        return res.status(400).json({
          success: false,
          error: 'Search term is required',
          code: 'BAD_REQUEST'
        });
      }

      const results = await Vendor.search(search);

      // Filter results based on vertical access
      let filteredResults = results;
      if (req.user.roleId !== 1) {
        filteredResults = results.filter(v => !v.vertical_id || v.vertical_id === req.user.verticalId);
      }

      res.json({
        success: true,
        data: filteredResults,
        message: 'Vendors retrieved successfully'
      });
    } catch (error) {
      console.error('Error in searchVendors:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getVendorStats(req, res) {
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

      const stats = await Vendor.getStats({ vertical_id: finalVerticalId });

      res.json({
        success: true,
        data: stats,
        message: 'Vendor statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getVendorStats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getVendorsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 10, vertical_id } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access vendors from this vertical',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const result = await Vendor.getByCategory(category, {
        page: parseInt(page),
        limit: parseInt(limit),
        vertical_id: finalVerticalId
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Vendors retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getVendorsByCategory:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
};

export default vendorController;
