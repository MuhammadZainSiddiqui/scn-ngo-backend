import { FeePayment } from '../models/FeePayment.js';
import { executeQuery } from '../config/database.js';

export const paymentController = {
  async getAllPayments(req, res) {
    try {
      const {
        fee_id,
        contact_id,
        payment_method,
        from_date,
        to_date,
        page = 1,
        limit = 10
      } = req.query;
      
      const filters = {};
      if (fee_id) filters.fee_id = parseInt(fee_id);
      if (contact_id) filters.contact_id = parseInt(contact_id);
      if (payment_method) filters.payment_method = payment_method;
      if (from_date) filters.from_date = from_date;
      if (to_date) filters.to_date = to_date;

      const pagination = { page: parseInt(page), limit: parseInt(limit) };

      const result = await FeePayment.findAll(filters, pagination);
      
      res.json({
        success: true,
        data: result.payments,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Get all payments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payments',
        error: error.message
      });
    }
  },

  async getPayment(req, res) {
    try {
      const { id } = req.params;
      const payment = await FeePayment.findById(id);
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      console.error('Get payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment',
        error: error.message
      });
    }
  },

  async recordPayment(req, res) {
    try {
      const paymentData = {
        ...req.body,
        processed_by: req.user.id
      };

      const newPayment = await FeePayment.create(paymentData);
      
      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        data: newPayment
      });
    } catch (error) {
      console.error('Record payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record payment',
        error: error.message
      });
    }
  },

  async getPaymentStats(req, res) {
    try {
      const { from_date, to_date, vertical_id } = req.query;
      
      const filters = {};
      if (from_date) filters.from_date = from_date;
      if (to_date) filters.to_date = to_date;
      if (vertical_id) filters.vertical_id = parseInt(vertical_id);

      const stats = await FeePayment.getPaymentStats(filters);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get payment stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment statistics',
        error: error.message
      });
    }
  },

  async getPaymentsByContact(req, res) {
    try {
      const { contactId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      const filters = { contact_id: parseInt(contactId) };
      const pagination = { page: parseInt(page), limit: parseInt(limit) };

      const result = await FeePayment.findAll(filters, pagination);
      
      res.json({
        success: true,
        data: result.payments,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Get payments by contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payments',
        error: error.message
      });
    }
  }
};

export default paymentController;