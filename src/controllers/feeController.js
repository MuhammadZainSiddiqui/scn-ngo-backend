import { Fee } from '../models/Fee.js';
import { FeePayment } from '../models/FeePayment.js';

export const feeController = {
  async getAllFees(req, res) {
    try {
      const {
        contact_id,
        vertical_id,
        status,
        fee_plan_id,
        from_date,
        to_date,
        include_overdue,
        page = 1,
        limit = 10
      } = req.query;
      
      const filters = {};
      if (contact_id) filters.contact_id = parseInt(contact_id);
      if (vertical_id) filters.vertical_id = parseInt(vertical_id);
      if (status) filters.status = status;
      if (fee_plan_id) filters.fee_plan_id = parseInt(fee_plan_id);
      if (from_date) filters.from_date = from_date;
      if (to_date) filters.to_date = to_date;
      if (include_overdue === 'true') filters.include_overdue = true;

      const pagination = { page: parseInt(page), limit: parseInt(limit) };

      const result = await Fee.findAll(filters, pagination);
      
      res.json({
        success: true,
        data: result.fees,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Get all fees error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve fees',
        error: error.message
      });
    }
  },

  async getFee(req, res) {
    try {
      const { id } = req.params;
      const fee = await Fee.findById(id);
      
      if (!fee) {
        return res.status(404).json({
          success: false,
          message: 'Fee not found'
        });
      }

      res.json({
        success: true,
        data: fee
      });
    } catch (error) {
      console.error('Get fee error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve fee',
        error: error.message
      });
    }
  },

  async createFee(req, res) {
    try {
      const feeData = {
        ...req.body,
        created_by: req.user.id
      };

      const newFee = await Fee.create(feeData);
      
      res.status(201).json({
        success: true,
        message: 'Fee created successfully',
        data: newFee
      });
    } catch (error) {
      console.error('Create fee error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create fee',
        error: error.message
      });
    }
  },

  async updateFeeStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const updatedFee = await Fee.updateStatus(id, status, req.user.id, notes);
      
      if (!updatedFee) {
        return res.status(404).json({
          success: false,
          message: 'Fee not found'
        });
      }

      res.json({
        success: true,
        message: 'Fee status updated successfully',
        data: updatedFee
      });
    } catch (error) {
      console.error('Update fee status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update fee status',
        error: error.message
      });
    }
  },

  async updateFeeAmount(req, res) {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;

      const updatedFee = await Fee.updateAmount(id, amount, req.user.id, reason);
      
      if (!updatedFee) {
        return res.status(404).json({
          success: false,
          message: 'Fee not found'
        });
      }

      res.json({
        success: true,
        message: 'Fee amount updated successfully',
        data: updatedFee
      });
    } catch (error) {
      console.error('Update fee amount error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update fee amount',
        error: error.message
      });
    }
  },

  async deleteFee(req, res) {
    try {
      const { id } = req.params;
      const success = await Fee.delete(id, req.user.id);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Fee not found'
        });
      }

      res.json({
        success: true,
        message: 'Fee deleted successfully'
      });
    } catch (error) {
      console.error('Delete fee error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete fee',
        error: error.message
      });
    }
  },

  async getStatistics(req, res) {
    try {
      const { contact_id, vertical_id, from_date, to_date } = req.query;
      
      const filters = {};
      if (contact_id) filters.contact_id = parseInt(contact_id);
      if (vertical_id) filters.vertical_id = parseInt(vertical_id);
      if (from_date) filters.from_date = from_date;
      if (to_date) filters.to_date = to_date;

      const stats = await Fee.getStatistics(filters);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get fee statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve fee statistics',
        error: error.message
      });
    }
  },

  async getAgingReport(req, res) {
    try {
      const { vertical_id } = req.query;
      
      const agingReport = await Fee.getAgingReport(vertical_id ? parseInt(vertical_id) : null);
      
      res.json({
        success: true,
        data: agingReport
      });
    } catch (error) {
      console.error('Get aging report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve aging report',
        error: error.message
      });
    }
  },

  async getFeesByContact(req, res) {
    try {
      const { contactId } = req.params;
      const { status, page = 1, limit = 10 } = req.query;
      
      const filters = { contact_id: parseInt(contactId) };
      if (status) filters.status = status;

      const pagination = { page: parseInt(page), limit: parseInt(limit) };

      const result = await Fee.findAll(filters, pagination);
      
      res.json({
        success: true,
        data: result.fees,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Get fees by contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve fees',
        error: error.message
      });
    }
  }
};

export default feeController;