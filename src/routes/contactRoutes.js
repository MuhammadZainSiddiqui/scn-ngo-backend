import { Router } from 'express';
import { contactController } from '../controllers/contactController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { contactValidation, handleValidationErrors } from '../utils/validators.js';
import { body } from 'express-validator';

const router = Router();

// Protect all routes
router.use(verifyToken);

// Contact Types
router.get('/contact-types', contactController.getContactTypes);
router.post('/contact-types', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  handleValidationErrors
], contactController.createContactType);

// Contacts
router.get('/', contactController.getAllContacts);
router.get('/search', contactController.searchContacts);
router.get('/type/:typeId', contactController.getContactsByType);
router.get('/vertical/:verticalId', contactController.getContactsByVertical);
router.get('/:id', contactController.getContactById);

router.post('/', contactValidation, contactController.createContact);
router.put('/:id', contactValidation, contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

export default router;
