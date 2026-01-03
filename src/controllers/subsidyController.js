import { Subsidy } from '../models/Subsidy.js';

export const subsidyController = {
  async getAllSubsidies(req, res) {
    try {
      const {
        contact_id,
        vertical_id,
        program_id,
        status,
        page = 1,
        limit = 10
      } = req.query;
      
      const filters = {};
      if (contact_id) filters.contact_id = parseInt(contact_id);
      if (vertical_id) filters.vertical_id = parseInt(vertical_id);
      if (program_id) filters.program_id = parseInt(program_id);
      if (status) filters.status = status;

      const pagination = { page: parseInt(page), limit: parseInt(limit) };

      const result = await Subsidy.findAll(filters, pagination);
      
      res.json({
        success: true,
        data: result.subsidies,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Get all subsidies error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve subsidies',
        error: error.message
      });
    }
  },

  async getSubsidy(req, res) {
    try {
      const { id } = req.params;
      const subsidy = await Subsidy.findById(id);
      
      if (!subsidy) {
        return res.status(404).json({
          success: false,
          message: 'Subsidy not found'
        });
      }

      res.json({
        success: true,
        data: subsidy
      });
    } catch (error) {
      console.error('Get subsidy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve subsidy',
        error: error.message
      });
    }
  },

  async createSubsidy(req, res) {
    try {
      const subsidyData = {
        ...req.body,
        allocated_by: req.user.id
      };

      const newSubsidy = await Subsidy.create(subsidyData);
      
      res.status(201).json({
        success: true,
        message: 'Subsidy created successfully',
        data: newSubsidy
      });
    } catch (error) {
      console.error('Create subsidy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create subsidy',
        error: error.message
      });
    }
  },

  async updateSubsidy(req, res) {
    try {
      const { id } = req.params;
      const subsidyData = {
        ...req.body,
        updated_by: req.user.id
      };

      const updatedSubsidy = await Subsidy.update(id, subsidyData);
      
      if (!updatedSubsidy) {
        return res.status(404).json({
          success: false,
          message: 'Subsidy not found'
        });
      }

      res.json({
        success: true,
        message: 'Subsidy updated successfully',
        data: updatedSubsidy
      });
    } catch (error) {
      console.error('Update subsidy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update subsidy',
        error: error.message
      });
    }
  },

  async allocateSubsidy(req, res) {
    try {
      const { id } = req.params;
      const { feeId, amount } = req.body;

      await Subsidy.allocate(id, feeId, amount, req.user.id);

      res.json({
        success: true,
        message: 'Subsidy allocated successfully'
      });
    } catch (error) {
      console.error('Allocate subsidy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to allocate subsidy',
        error: error.message
      });
    }
  },

  async getAllocationStats(req, res) {
    try {
      const { contact_id, vertical_id, program_id, from_date, to_date } = req.query;
      
      const filters = {};
      if (contact_id) filters.contact_id = parseInt(contact_id);
      if (vertical_id) filters.vertical_id = parseInt(vertical_id);
      if (program_id) filters.program_id = parseInt(program_id);
      if (from_date) filters.from_date = from_date;
      if (to_date) filters.to_date = to_date;

      const stats = await Subsidy.getAllocationStats(filters);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get allocation stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve allocation statistics',
        error: error.message
      });
    }
  },

  async getUsageReport(req, res) {
    try {
      const { from_date, to_date, vertical_id } = req.query;
      
      const filters = {};
      if (from_date) filters.from_date = from_date;
      if (to_date) filters.to_date = to_date;
      if (vertical_id) filters.vertical_id = parseInt(vertical_id);

      const report = await Subsidy.getUsageReport(filters);
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Get usage report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve usage report',
        error: error.message
      });
    }
  },

  async deleteSubsidy(req, res) {
    try {
      const { id } = req.params;
      const success = await Subsidy.delete(id, req.user.id);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Subsidy not found'
        });
      }

      res.json({
        success: true,
        message: 'Subsidy deleted successfully'
      });
    } catch (error) {
      console.error('Delete subsidy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete subsidy',
        error: error.message
      });
    }
  }
};

export default subsidyController;