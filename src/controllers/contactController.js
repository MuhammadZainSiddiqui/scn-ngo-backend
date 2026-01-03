import Contact from '../models/Contact.js';
import ContactType from '../models/ContactType.js';
import AuditLog from '../models/AuditLog.js';
import { formatContactResponse } from '../utils/helpers.js';

export const contactController = {
  async getAllContacts(req, res) {
    try {
      const { page, limit, contact_type_id, vertical_id, status } = req.query;
      
      // Vertical isolation: Staff/Vertical Lead can only see contacts from their vertical
      // Super Admin can see all
      let finalVerticalId = vertical_id;
      if (req.user.roleId !== 1) {
        if (vertical_id && parseInt(vertical_id) !== req.user.verticalId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to access contacts from another vertical',
            code: 'FORBIDDEN'
          });
        }
        finalVerticalId = req.user.verticalId;
      }

      const result = await Contact.findAll({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        contact_type_id,
        vertical_id: finalVerticalId,
        status
      });

      res.json({
        success: true,
        data: result.data.map(formatContactResponse),
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error in getAllContacts:', error);
      res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
    }
  },

  async getContactById(req, res) {
    try {
      const contact = await Contact.findById(req.params.id);
      if (!contact) {
        return res.status(404).json({ success: false, error: 'Contact not found', code: 'NOT_FOUND' });
      }

      // Vertical isolation
      if (req.user.roleId !== 1 && contact.vertical_id !== req.user.verticalId && contact.vertical_id !== null) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this contact',
          code: 'FORBIDDEN'
        });
      }

      res.json({ success: true, data: formatContactResponse(contact) });
    } catch (error) {
      console.error('Error in getContactById:', error);
      res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
    }
  },

  async createContact(req, res) {
    try {
      const { email, contact_type_id } = req.body;

      // Check if email unique
      if (email) {
        const exists = await Contact.checkEmailExists(email);
        if (exists) {
          return res.status(409).json({ success: false, error: 'Email already exists', code: 'CONFLICT' });
        }
      }

      // Verify contact type exists
      const type = await ContactType.findById(contact_type_id);
      if (!type) {
        return res.status(400).json({ success: false, error: 'Invalid contact type', code: 'BAD_REQUEST' });
      }

      const contactData = {
        ...req.body,
        created_by: req.user.id
      };

      const newContact = await Contact.create(contactData);
      
      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'contacts',
        entity_id: newContact.id,
        new_values: newContact,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl
      });

      res.status(201).json({ success: true, data: formatContactResponse(newContact), message: 'Contact created' });
    } catch (error) {
      console.error('Error in createContact:', error);
      res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
    }
  },

  async updateContact(req, res) {
    try {
      const id = req.params.id;
      const contact = await Contact.findById(id);
      if (!contact) {
        return res.status(404).json({ success: false, error: 'Contact not found', code: 'NOT_FOUND' });
      }

      // Vertical isolation
      if (req.user.roleId !== 1 && contact.vertical_id !== req.user.verticalId && contact.vertical_id !== null) {
        return res.status(403).json({ success: false, error: 'Permission denied', code: 'FORBIDDEN' });
      }

      const { email } = req.body;
      if (email && email !== contact.email) {
        const exists = await Contact.checkEmailExists(email, id);
        if (exists) {
          return res.status(409).json({ success: false, error: 'Email already exists', code: 'CONFLICT' });
        }
      }

      const updatedContact = await Contact.update(id, req.body);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'contacts',
        entity_id: id,
        old_values: contact,
        new_values: updatedContact,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl
      });

      res.json({ success: true, data: formatContactResponse(updatedContact), message: 'Contact updated' });
    } catch (error) {
      console.error('Error in updateContact:', error);
      res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
    }
  },

  async deleteContact(req, res) {
    try {
      const id = req.params.id;
      const contact = await Contact.findById(id);
      if (!contact) {
        return res.status(404).json({ success: false, error: 'Contact not found', code: 'NOT_FOUND' });
      }

      // Only Admin can delete
      if (req.user.roleId !== 1) {
        return res.status(403).json({ success: false, error: 'Only admin can delete contacts', code: 'FORBIDDEN' });
      }

      await Contact.delete(id);

      // Audit log
      await AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'contacts',
        entity_id: id,
        old_values: contact,
        new_values: { status: 'inactive' },
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        request_url: req.originalUrl
      });

      res.json({ success: true, message: 'Contact deactivated successfully' });
    } catch (error) {
      console.error('Error in deleteContact:', error);
      res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
    }
  },

  async searchContacts(req, res) {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ success: false, error: 'Search query is required', code: 'BAD_REQUEST' });
      }

      const results = await Contact.search(q);
      
      // Filter results for vertical isolation
      let filteredResults = results;
      if (req.user.roleId !== 1) {
        filteredResults = results.filter(c => c.vertical_id === req.user.verticalId || c.vertical_id === null);
      }

      res.json({ success: true, data: filteredResults.map(formatContactResponse) });
    } catch (error) {
      console.error('Error in searchContacts:', error);
      res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
    }
  },

  async getContactsByType(req, res) {
    try {
      const { typeId } = req.params;
      const results = await Contact.getByType(typeId);

      // Filter results for vertical isolation
      let filteredResults = results;
      if (req.user.roleId !== 1) {
        filteredResults = results.filter(c => c.vertical_id === req.user.verticalId || c.vertical_id === null);
      }

      res.json({ success: true, data: filteredResults.map(formatContactResponse) });
    } catch (error) {
      console.error('Error in getContactsByType:', error);
      res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
    }
  },

  async getContactsByVertical(req, res) {
    try {
      const { verticalId } = req.params;
      
      // Vertical isolation
      if (req.user.roleId !== 1 && parseInt(verticalId) !== req.user.verticalId) {
        return res.status(403).json({ success: false, error: 'Permission denied', code: 'FORBIDDEN' });
      }

      const results = await Contact.getByVertical(verticalId);
      res.json({ success: true, data: results.map(formatContactResponse) });
    } catch (error) {
      console.error('Error in getContactsByVertical:', error);
      res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
    }
  },

  async getContactTypes(req, res) {
    try {
      const types = await ContactType.findAll();
      res.json({ success: true, data: types });
    } catch (error) {
      console.error('Error in getContactTypes:', error);
      res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
    }
  },

  async createContactType(req, res) {
    try {
      // Only Admin can create contact types
      if (req.user.roleId !== 1) {
        return res.status(403).json({ success: false, error: 'Only admin can create contact types', code: 'FORBIDDEN' });
      }

      const newType = await ContactType.create(req.body);
      res.status(201).json({ success: true, data: newType, message: 'Contact type created' });
    } catch (error) {
      console.error('Error in createContactType:', error);
      res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
    }
  }
};

export default contactController;
