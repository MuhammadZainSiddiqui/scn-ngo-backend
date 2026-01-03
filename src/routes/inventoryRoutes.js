import express from 'express';
import { inventoryController } from '../controllers/inventoryController.js';
import {
  verifyToken,
  requireVerticalAccess
} from '../middleware/authMiddleware.js';
import {
  idParamValidation,
  paginationValidation,
  searchValidation,
  createInventoryValidation,
  updateInventoryValidation,
  updateInventoryQuantityValidation,
  createStockTransactionValidation
} from '../utils/validators.js';

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// GET /api/inventory - Get all inventory items with filtering & pagination
router.get('/',
  paginationValidation,
  requireVerticalAccess,
  inventoryController.getAllInventory
);

// GET /api/inventory/search - Search inventory
router.get('/search',
  searchValidation,
  requireVerticalAccess,
  inventoryController.searchInventory
);

// GET /api/inventory/statistics - Get inventory statistics
router.get('/statistics',
  requireVerticalAccess,
  inventoryController.getInventoryStats
);

// GET /api/inventory/low-stock - Get low stock items
router.get('/low-stock',
  requireVerticalAccess,
  inventoryController.getLowStockItems
);

// GET /api/inventory/out-of-stock - Get out of stock items
router.get('/out-of-stock',
  requireVerticalAccess,
  inventoryController.getOutOfStockItems
);

// GET /api/inventory/aging-report - Get inventory aging report
router.get('/aging-report',
  requireVerticalAccess,
  inventoryController.getAgingReport
);

// GET /api/inventory/category/:category - Get inventory by category
router.get('/category/:category',
  requireVerticalAccess,
  inventoryController.getInventoryByCategory
);

// GET /api/inventory/vertical/:vertical_id - Get inventory by vertical
router.get('/vertical/:vertical_id',
  requireVerticalAccess,
  inventoryController.getInventoryByVertical
);

// GET /api/inventory/:id - Get single inventory item
router.get('/:id',
  idParamValidation,
  requireVerticalAccess,
  inventoryController.getInventoryById
);

// POST /api/inventory - Create new inventory item
router.post('/',
  createInventoryValidation,
  inventoryController.createInventoryItem
);

// PUT /api/inventory/:id - Update inventory item
router.put('/:id',
  idParamValidation,
  updateInventoryValidation,
  requireVerticalAccess,
  inventoryController.updateInventoryItem
);

// PUT /api/inventory/:id/quantity - Update inventory quantity
router.put('/:id/quantity',
  idParamValidation,
  updateInventoryQuantityValidation,
  requireVerticalAccess,
  inventoryController.updateInventoryQuantity
);

// DELETE /api/inventory/:id - Deactivate inventory item
router.delete('/:id',
  idParamValidation,
  requireVerticalAccess,
  inventoryController.deleteInventoryItem
);

// Stock Transactions
// POST /api/inventory/:id/transactions - Create stock transaction
router.post('/:id/transactions',
  idParamValidation,
  createStockTransactionValidation,
  requireVerticalAccess,
  inventoryController.createStockTransaction
);

// GET /api/inventory/:id/transactions - Get stock transactions for item
router.get('/:id/transactions',
  idParamValidation,
  requireVerticalAccess,
  inventoryController.getStockTransactions
);

export default router;
