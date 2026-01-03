import { Waiver } from '../models/Waiver.js';

export const waiverController = {
  async getAllWaivers(req, res) {
    try {
      const {
        contact_id,
        fee_id,
        status,
        vertical_id,
        page = 1,
        limit = 10
      } = req.query;
      
      const filters = {};
      if (contact_id) filters.contact_id = parseInt(contact_id);
      if (fee_id) filters.fee_id = parseInt(fee_id);
      if (status) filters.status = status;
      if (vertical_id) filters.vertical_id = parseInt(vertical_id);

      const pagination = { page: parseInt(page), limit: parseInt(limit) };

      const result = await Waiver.findAll(filters, pagination);
      
      res.json({
        success: true,
        data: result.waivers,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Get all waivers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve waivers',
        error: error.message
      });
    }
  },

  async getWaiver(req, res) {
    try {
      const { id } = req.params;
      const waiver = await Waiver.findById(id);
      
      if (!waiver) {
        return res.status(404).json({
          success: false,
          message: 'Waiver not found'
        });
      }

      res.json({
        success: true,
        data: waiver
      });
    } catch (error) {
      console.error('Get waiver error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve waiver',
        error: error.message
      });
    }
  },

  async createWaiver(req, res) {
    try {
      const waiverData = {
        ...req.body,
        created_by: req.user.id
      };

      const newWaiver = await Waiver.create(waiverData);
      
      res.status(201).json({
        success: true,
        message: 'Waiver requested successfully',
        data: newWaiver
      });
    } catch (error) {
      console.error('Create waiver error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create waiver',
        error: error.message
      });
    }
  },

  async approveWaiver(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const updatedWaiver = await Waiver.approve(id, req.user.id, notes);
      
      if (!updatedWaiver) {
        return res.status(404).json({
          success: false,
          message: 'Waiver not found'
        });
      }

      res.json({
        success: true,
        message: 'Waiver approved successfully',
        data: updatedWaiver
      });
    } catch (error) {
      console.error('Approve waiver error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve waiver',
        error: error.message
      });
    }
  },

  async rejectWaiver(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const updatedWaiver = await Waiver.reject(id, req.user.id, notes);
      
      if (!updatedWaiver) {
        return res.status(404).json({
          success: false,
          message: 'Waiver not found'
        });
      }

      res.json({
        success: true,
        message: 'Waiver rejected successfully',
        data: updatedWaiver
      });
    } catch (error) {
      console.error('Reject waiver error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject waiver',
        error: error.message
      });
    }
  },

  async getWaiverStatistics(req, res) {
    try {
      const { from_date, to_date, vertical_id } = req.query;
      
      const filters = {};
      if (from_date) filters.from_date = from_date;
      if (to_date) filters.to_date = to_date;
      if (vertical_id) filters.vertical_id = parseInt(vertical_id);

      const stats = await Waiver.getStatistics(filters);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get waiver statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve waiver statistics',
        error: error.message
      });
    }
  },

  async getWaiversByContact(req, res) {
    try {
      const { contactId } = req.params;
      const { status, page = 1, limit = 10 } = req.query;
      
      const filters = { contact_id: parseInt(contactId) };
      if (status) filters.status = status;

      const pagination = { page: parseInt(page), limit: parseInt(limit) };

      const result = await Waiver.findAll(filters, pagination);
      
      res.json({
        success: true,
        data: result.waivers,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Get waivers by contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve waivers',
        error: error.message
      });
    }
  }
};

export default waiverController;