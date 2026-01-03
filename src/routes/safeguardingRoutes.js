import { Router } from 'express';
import { safeguardingController } from '../controllers/safeguardingController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { safeguardingValidation, updateSafeguardingValidation, paginationValidation, idParamValidation } from '../utils/validators.js';

const router = Router();

// Apply verifyToken to all safeguarding routes
router.use(verifyToken);

// GET all safeguarding records
router.get('/', paginationValidation, safeguardingController.getAllRecords);

// GET safeguarding record by ID
router.get('/:id', idParamValidation, safeguardingController.getRecordById);

// POST create safeguarding record
router.post('/', safeguardingValidation, safeguardingController.createRecord);

// PUT update safeguarding record
router.put('/:id', idParamValidation, updateSafeguardingValidation, safeguardingController.updateRecord);

// DELETE archive safeguarding record
router.delete('/:id', idParamValidation, safeguardingController.archiveRecord);

// GET view history for record
router.get('/:id/history', idParamValidation, paginationValidation, safeguardingController.getViewHistory);

export default router;
