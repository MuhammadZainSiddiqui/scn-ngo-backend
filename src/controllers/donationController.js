import Donation from '../models/Donation.js';
import Allocation from '../models/Allocation.js';
import Contact from '../models/Contact.js';
import AuditLog from '../models/AuditLog.js';

export const donationController = {
  async getAllDonations(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        donor_id,
        vertical_id,
        program_id,
        payment_status,
        date_from,
        date_to,
        search,
        sort = 'd.created_at',
        order = 'desc'
      } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access donations from another vertical',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const result = await Donation.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        donor_id,
        vertical_id: finalVerticalId,
        program_id,
        payment_status,
        date_from,
        date_to,
        search,
        sort,
        order
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Donations retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllDonations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getDonationById(req, res) {
    try {
      const donation = await Donation.findById(req.params.id);
      
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
          error: 'You do not have permission to access this donation',
          code: 'FORBIDDEN'
        });
      }

      // Get allocation details
      const allocations = await Allocation.findByDonation(donation.id);

      const responseData = {
        ...donation,
        allocations
      };

      res.json({
        success: true,
        data: responseData,
        message: 'Donation retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getDonationById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async createDonation(req, res) {
    try {
      const {
        donor_id,
        amount,
        currency = 'INR',
        payment_method,
        payment_reference,
        donation_type = 'one_time',
        frequency,
        campaign,
        purpose,
        anonymous = false,
        vertical_id,
        program_id,
        notes,
        donation_date
      } = req.body;

      // Verify donor exists
      const donor = await Contact.findById(donor_id);
      if (!donor) {
        return res.status(400).json({
          success: false,
          error: 'Donor not found',
          code: 'BAD_REQUEST'
        });
      }

      // Check for duplicate transaction ID
      if (payment_reference) {
        const exists = await Donation.checkTransactionIdExists(payment_reference);
        if (exists) {
          return res.status(409).json({
            success: false,
            error: 'Payment reference already exists',
            code: 'CONFLICT'
          });
        }
      }

      const donationData = {
        donor_id,
        amount,
        currency,
        payment_method,
        payment_reference,
        donation_type,
        frequency,
        campaign,
        purpose,
        anonymous,
        vertical_id,
        program_id,
        received_by: req.user.id,
        notes,
        donation_date
      };

      const newDonation = await Donation.create(donationData);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'donations',
        entity_id: newDonation.id,
        new_values: newDonation,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: newDonation,
        message: 'Donation created successfully'
      });
    } catch (error) {
      console.error('Error in createDonation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async updateDonation(req, res) {
    try {
      const donation = await Donation.findById(req.params.id);
      
      if (!donation) {
        return res.status(404).json({
          success: false,
          error: 'Donation not found',
          code: 'NOT_FOUND'
        });
      }

      // Check if donation can be updated (only pending)
      if (donation.payment_status !== 'pending') {
        return res.status(422).json({
          success: false,
          error: 'Cannot update donation that is not in pending status',
          code: 'INVALID_STATUS'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1 && donation.vertical_id !== req.user.verticalId && donation.vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to update this donation',
          code: 'FORBIDDEN'
        });
      }

      // Check for duplicate transaction ID if payment_reference is being updated
      if (req.body.payment_reference && req.body.payment_reference !== donation.payment_reference) {
        const exists = await Donation.checkTransactionIdExists(req.body.payment_reference, req.params.id);
        if (exists) {
          return res.status(409).json({
            success: false,
            error: 'Payment reference already exists',
            code: 'CONFLICT'
          });
        }
      }

      // Prevent negative amounts
      if (req.body.amount && req.body.amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Amount must be positive',
          code: 'BAD_REQUEST'
        });
      }

      const updatedDonation = await Donation.update(req.params.id, req.body);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'donations',
        entity_id: updatedDonation.id,
        old_values: donation,
        new_values: updatedDonation,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedDonation,
        message: 'Donation updated successfully'
      });
    } catch (error) {
      console.error('Error in updateDonation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async confirmDonation(req, res) {
    try {
      const donation = await Donation.findById(req.params.id);
      
      if (!donation) {
        return res.status(404).json({
          success: false,
          error: 'Donation not found',
          code: 'NOT_FOUND'
        });
      }

      // Check if donation can be confirmed
      if (donation.payment_status === 'received') {
        return res.status(422).json({
          success: false,
          error: 'Donation is already confirmed',
          code: 'INVALID_STATUS'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1 && donation.vertical_id !== req.user.verticalId && donation.vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to confirm this donation',
          code: 'FORBIDDEN'
        });
      }

      const updatedDonation = await Donation.updateStatus(req.params.id, 'received');

      // Create allocations if provided
      if (req.body.allocations && Array.isArray(req.body.allocations)) {
        for (const allocation of req.body.allocations) {
          await Allocation.create({
            ...allocation,
            donation_id: req.params.id
          });
        }
      }

      // Generate receipt if requested
      if (req.body.generate_receipt) {
        await Donation.issueReceipt(req.params.id);
      }

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'CONFIRM',
        entity_type: 'donations',
        entity_id: updatedDonation.id,
        old_values: donation,
        new_values: updatedDonation,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedDonation,
        message: 'Donation confirmed successfully'
      });
    } catch (error) {
      console.error('Error in confirmDonation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async deleteDonation(req, res) {
    try {
      const donation = await Donation.findById(req.params.id);
      
      if (!donation) {
        return res.status(404).json({
          success: false,
          error: 'Donation not found',
          code: 'NOT_FOUND'
        });
      }

      // Check if donation can be deleted
      if (donation.payment_status === 'received') {
        return res.status(422).json({
          success: false,
          error: 'Cannot delete confirmed donation. Change status to failed instead.',
          code: 'INVALID_STATUS'
        });
      }

      // Apply vertical isolation
      if (req.user.roleId !== 1 && donation.vertical_id !== req.user.verticalId && donation.vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to delete this donation',
          code: 'FORBIDDEN'
        });
      }

      // Delete associated allocations first
      const allocations = await Allocation.findByDonation(req.params.id);
      for (const allocation of allocations) {
        await Allocation.delete(allocation.id);
      }

      const deletedDonation = await Donation.delete(req.params.id);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'donations',
        entity_id: req.params.id,
        old_values: donation,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: deletedDonation,
        message: 'Donation deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteDonation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async issueReceipt(req, res) {
    try {
      const donation = await Donation.findById(req.params.id);
      
      if (!donation) {
        return res.status(404).json({
          success: false,
          error: 'Donation not found',
          code: 'NOT_FOUND'
        });
      }

      // Check if receipt can be issued
      if (donation.payment_status !== 'received') {
        return res.status(422).json({
          success: false,
          error: 'Can only issue receipt for confirmed donations',
          code: 'INVALID_STATUS'
        });
      }

      if (donation.receipt_number) {
        return res.status(422).json({
          success: false,
          error: 'Receipt already issued for this donation',
          code: 'ALREADY_ISSUED'
        });
      }

      const updatedDonation = await Donation.issueReceipt(req.params.id);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'ISSUE_RECEIPT',
        entity_type: 'donations',
        entity_id: updatedDonation.id,
        old_values: donation,
        new_values: updatedDonation,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: updatedDonation,
        message: 'Receipt issued successfully'
      });
    } catch (error) {
      console.error('Error in issueReceipt:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async searchDonations(req, res) {
    try {
      const { search } = req.query;
      
      if (!search || search.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Search term is required',
          code: 'BAD_REQUEST'
        });
      }

      let results = await Donation.search(search);

      // Apply vertical isolation
      if (req.user.roleId !== 1) {
        results = results.filter(donation => 
          donation.vertical_id === req.user.verticalId || donation.vertical_id === null
        );
      }

      res.json({
        success: true,
        data: results,
        message: `Found ${results.length} donations matching "${search}"`
      });
    } catch (error) {
      console.error('Error in searchDonations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getDonationsByDonor(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const donorId = req.params.donorId;

      // Verify donor exists
      const donor = await Contact.findById(donorId);
      if (!donor) {
        return res.status(404).json({
          success: false,
          error: 'Donor not found',
          code: 'NOT_FOUND'
        });
      }

      const result = await Donation.getByDonor(donorId, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Donations retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getDonationsByDonor:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getDonationsByVertical(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const verticalId = req.params.verticalId;

      // Apply vertical isolation
      if (req.user.roleId !== 1 && parseInt(verticalId) !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access donations from another vertical',
          code: 'FORBIDDEN'
        });
      }

      const result = await Donation.getByVertical(verticalId, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Donations retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getDonationsByVertical:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getDonationsByProgram(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const programId = req.params.programId;

      const result = await Donation.getByProgram(programId, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Donations retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getDonationsByProgram:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getDonationStats(req, res) {
    try {
      const { date_from, date_to, vertical_id } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        finalVerticalId = req.user.verticalId;
      }

      const stats = await Donation.getStats({
        date_from,
        date_to,
        vertical_id: finalVerticalId
      });

      res.json({
        success: true,
        data: stats,
        message: 'Donation statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getDonationStats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  },

  async getDonationReport(req, res) {
    try {
      const { 
        date_from, 
        date_to, 
        vertical_id, 
        program_id, 
        payment_status,
        format = 'json' 
      } = req.query;

      // Apply vertical isolation
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        finalVerticalId = req.user.verticalId;
      }

      const reportData = await Donation.findAll({
        date_from,
        date_to,
        vertical_id: finalVerticalId,
        program_id,
        payment_status,
        limit: 10000, // Large limit for reports
        sort: 'd.donation_date',
        order: 'desc'
      });

      // Get statistics for the report
      const stats = await Donation.getStats({
        date_from,
        date_to,
        vertical_id: finalVerticalId,
        program_id
      });

      const report = {
        generated_at: new Date().toISOString(),
        filters: {
          date_from,
          date_to,
          vertical_id: finalVerticalId,
          program_id,
          payment_status
        },
        summary: stats,
        donations: reportData.data
      };

      if (format === 'csv') {
        // Convert to CSV format
        const csvData = report.donations.map(donation => ({
          'Donation Number': donation.donation_number,
          'Date': donation.donation_date,
          'Donor': donation.organization_name || `${donation.first_name} ${donation.last_name}`,
          'Amount': donation.amount,
          'Currency': donation.currency,
          'Payment Method': donation.payment_method,
          'Status': donation.payment_status,
          'Vertical': donation.vertical_name || '',
          'Program': donation.program_name || '',
          'Receipt Number': donation.receipt_number || ''
        }));

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=donation-report-${Date.now()}.csv`);
        
        const csv = convertToCSV(csvData);
        return res.send(csv);
      }

      res.json({
        success: true,
        data: report,
        message: 'Donation report generated successfully'
      });
    } catch (error) {
      console.error('Error in getDonationReport:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
};

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header] || '';
      return `"${value.toString().replace(/"/g, '""')}"`;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}

export default donationController;