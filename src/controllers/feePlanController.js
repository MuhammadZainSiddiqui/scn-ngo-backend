import { FeePlan } from '../models/FeePlan.js';
import { executeQuery } from '../config/database.js';

export const feePlanController = {
  async getAllFeePlans(req, res) {
    try {
      const { vertical_id, search, page = 1, limit = 10 } = req.query;
      
      const filters = {};
      if (vertical_id) filters.vertical_id = parseInt(vertical_id);
      if (search) filters.search = search;

      const pagination = { page: parseInt(page), limit: parseInt(limit) };

      const result = await FeePlan.findAll(filters, pagination);
      
      res.json({
        success: true,
        data: result.plans,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Get all fee plans error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve fee plans',
        error: error.message
      });
    }
  },

  async getFeePlan(req, res) {
    try {
      const { id } = req.params;
      const plan = await FeePlan.findById(id);
      
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Fee plan not found'
        });
      }

      res.json({
        success: true,
        data: plan
      });
    } catch (error) {
      console.error('Get fee plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve fee plan',
        error: error.message
      });
    }
  },

  async createFeePlan(req, res) {
    try {
      const planData = {
        ...req.body,
        created_by: req.user.id
      };

      const newPlan = await FeePlan.create(planData);
      
      res.status(201).json({
        success: true,
        message: 'Fee plan created successfully',
        data: newPlan
      });
    } catch (error) {
      console.error('Create fee plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create fee plan',
        error: error.message
      });
    }
  },

  async updateFeePlan(req, res) {
    try {
      const { id } = req.params;
      const planData = req.body;

      const updatedPlan = await FeePlan.update(id, planData);
      
      if (!updatedPlan) {
        return res.status(404).json({
          success: false,
          message: 'Fee plan not found'
        });
      }

      res.json({
        success: true,
        message: 'Fee plan updated successfully',
        data: updatedPlan
      });
    } catch (error) {
      console.error('Update fee plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update fee plan',
        error: error.message
      });
    }
  },

  async deleteFeePlan(req, res) {
    try {
      const { id } = req.params;
      const success = await FeePlan.delete(id);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Fee plan not found'
        });
      }

      res.json({
        success: true,
        message: 'Fee plan deleted successfully'
      });
    } catch (error) {
      console.error('Delete fee plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete fee plan',
        error: error.message
      });
    }
  },

  async getTemplates(req, res) {
    try {
      const { category } = req.query;
      const templates = await FeePlan.findTemplates(category);
      
      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Get templates error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve templates',
        error: error.message
      });
    }
  },

  async bulkCreateFromTemplate(req, res) {
    try {
      const { planId, contactIds, billingDate } = req.body;
      
      if (!contactIds || !Array.isArray(contactIds)) {
        return res.status(400).json({
          success: false,
          message: 'contactIds must be an array'
        });
      }

      const feeIds = await FeePlan.bulkCreateFromPlan(
        planId,
        contactIds,
        req.user.id,
        billingDate
      );

      const fees = await Promise.all(
        feeIds.map(id => executeQuery('SELECT * FROM fees WHERE id = ?', [id]).then(r => r[0]))
      );

      res.status(201).json({
        success: true,
        message: `${fees.length} fees created successfully`,
        data: fees
      });
    } catch (error) {
      console.error('Bulk create from template error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create fees from template',
        error: error.message
      });
    }
  }
};

export default feePlanController;