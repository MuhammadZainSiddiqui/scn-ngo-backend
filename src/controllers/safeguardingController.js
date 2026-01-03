import Safeguarding from '../models/Safeguarding.js';
import AuditLog from '../models/AuditLog.js';
import { validationResult } from 'express-validator';

export const safeguardingController = {
  async getAllRecords(req, res) {
    try {
      const options = {
        ...req.query,
        // Vertical isolation: Vertical Lead and Staff can only see their own vertical's records
        // unless it's a Super Admin or HR Lead (if specified in roleMiddleware)
        vertical_id: req.user.role_id === 1 ? req.query.vertical_id : (req.user.role_id === 4 ? req.query.vertical_id : req.user.vertical_id)
      };

      const result = await Safeguarding.findAll(options);
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching safeguarding records:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getRecordById(req, res) {
    try {
      const record = await Safeguarding.findById(req.params.id);
      if (!record) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }

      // Role-based access control
      // Super Admin (1) and HR Lead (4) can access all records
      // Vertical Lead (2) can access records in their vertical
      // Others might have restricted access
      const canAccess = req.user.role_id === 1 || 
                        req.user.role_id === 4 || 
                        (req.user.role_id === 2 && record.vertical_id === req.user.vertical_id) ||
                        (record.reported_by === req.user.id);

      if (!canAccess) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      // Log access to safeguarding-specific access log
      await Safeguarding.logAccess({
        record_id: record.id,
        accessed_by: req.user.id,
        access_type: 'view',
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        access_reason: req.query.reason || 'Viewed record details'
      });

      res.json({
        success: true,
        data: record
      });
    } catch (error) {
      console.error('Error fetching safeguarding record:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async createRecord(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const recordData = {
        ...req.body,
        reported_by: req.user.id,
        vertical_id: req.body.vertical_id || req.user.vertical_id
      };

      const result = await Safeguarding.create(recordData);
      
      // Log audit trail
      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'safeguarding_records',
        entity_id: result.id,
        new_values: recordData,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        request_url: req.originalUrl
      });

      res.status(201).json({
        success: true,
        message: 'Safeguarding record created successfully',
        data: { id: result.id, incident_number: result.incident_number }
      });
    } catch (error) {
      console.error('Error creating safeguarding record:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async updateRecord(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const oldRecord = await Safeguarding.findById(req.params.id);
      if (!oldRecord) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }

      // Only Super Admin, HR Lead, or assigned investigator can update
      const canUpdate = req.user.role_id === 1 || 
                         req.user.role_id === 4 || 
                         (oldRecord.assigned_to === req.user.id);

      if (!canUpdate) {
        return res.status(403).json({ success: false, error: 'Access denied to update this record' });
      }

      await Safeguarding.update(req.params.id, req.body);

      // Log access
      await Safeguarding.logAccess({
        record_id: req.params.id,
        accessed_by: req.user.id,
        access_type: 'edit',
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        access_reason: 'Updated record details'
      });

      // Log audit trail
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'safeguarding_records',
        entity_id: req.params.id,
        old_values: oldRecord,
        new_values: { ...oldRecord, ...req.body },
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        request_url: req.originalUrl
      });

      res.json({
        success: true,
        message: 'Safeguarding record updated successfully'
      });
    } catch (error) {
      console.error('Error updating safeguarding record:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async archiveRecord(req, res) {
    try {
      const record = await Safeguarding.findById(req.params.id);
      if (!record) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }

      if (req.user.role_id !== 1 && req.user.role_id !== 4) {
        return res.status(403).json({ success: false, error: 'Only Super Admin or HR Lead can archive records' });
      }

      await Safeguarding.archive(req.params.id);

      // Log audit trail
      await AuditLog.create({
        user_id: req.user.id,
        action: 'ARCHIVE',
        entity_type: 'safeguarding_records',
        entity_id: req.params.id,
        old_values: { status: record.status },
        new_values: { status: 'closed' },
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        request_url: req.originalUrl
      });

      res.json({
        success: true,
        message: 'Safeguarding record archived successfully'
      });
    } catch (error) {
      console.error('Error archiving safeguarding record:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getViewHistory(req, res) {
    try {
      if (req.user.role_id !== 1 && req.user.role_id !== 4) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const result = await Safeguarding.getAccessHistory(req.params.id, req.query);
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching access history:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
};
