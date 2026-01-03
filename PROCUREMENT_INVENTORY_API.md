# Procurement & Inventory Management API

Complete procurement and inventory management system for the NGO Dashboard with vendor management, requisition workflow, and inventory tracking.

## Features

### 1. Vendor Management (`/api/vendors`)
- Full CRUD operations for vendors
- Vendor categorization (goods, services, both)
- Vendor status tracking (active, inactive, blacklisted)
- Vendor ratings and payment terms
- Vendor search and filtering
- Vendor statistics and reports

### 2. Requisition Workflow (`/api/requisitions`)
- Create and manage procurement requisitions
- Approval workflow (pending → approved → ordered → received)
- Rejection with reason tracking
- Vendor assignment and PO numbering
- Requisition items with quantities and costs
- Requisition search and filtering
- Requisition statistics and analytics

### 3. Inventory Management (`/api/inventory`)
- Inventory item management
- Stock tracking with quantity levels
- Low stock and out of stock alerts
- Automatic stock status calculation (in_stock, low_stock, out_of_stock, discontinued)
- Stock movement transactions
- Inventory search and filtering
- Inventory aging reports
- Value calculation and reporting

## Database Tables

### Tables Created
1. **vendors** - Vendor information and contacts
2. **inventory** - Inventory items with stock levels
3. **requisitions** - Procurement requisitions
4. **requisition_items** - Items within requisitions
5. **stock_transactions** - Stock movement history

### Key Relationships
- `vendors.vertical_id` → `verticals.id`
- `inventory.vertical_id` → `verticals.id`
- `inventory.vendor_id` → `vendors.id`
- `requisitions.vertical_id` → `verticals.id`
- `requisitions.requested_by` → `users.id`
- `requisitions.vendor_id` → `vendors.id`
- `requisition_items.requisition_id` → `requisitions.id`
- `requisition_items.inventory_id` → `inventory.id`
- `stock_transactions.inventory_id` → `inventory.id`

## API Endpoints

### Vendor Endpoints

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/api/vendors` | Get all vendors with pagination and filters |
| GET | `/api/vendors/:id` | Get vendor by ID |
| GET | `/api/vendors/search?search=` | Search vendors |
| GET | `/api/vendors/statistics` | Get vendor statistics |
| GET | `/api/vendors/category/:category` | Get vendors by category |
| POST | `/api/vendors` | Create new vendor |
| PUT | `/api/vendors/:id` | Update vendor |
| PUT | `/api/vendors/:id/status` | Update vendor status |
| DELETE | `/api/vendors/:id` | Deactivate vendor |

#### Query Parameters for GET /api/vendors
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Filter by status (active, inactive, blacklisted)
- `type` - Filter by type (goods, services, both)
- `category` - Filter by category
- `vertical_id` - Filter by vertical
- `search` - Search term
- `sort` - Sort field (default: v.created_at)
- `order` - Sort order (asc/desc, default: desc)

### Requisition Endpoints

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/api/requisitions` | Get all requisitions with filters |
| GET | `/api/requisitions/:id` | Get requisition with items |
| GET | `/api/requisitions/search?search=` | Search requisitions |
| GET | `/api/requisitions/statistics` | Get requisition statistics |
| POST | `/api/requisitions` | Create new requisition |
| PUT | `/api/requisitions/:id` | Update requisition |
| PUT | `/api/requisitions/:id/approve` | Approve requisition |
| PUT | `/api/requisitions/:id/reject` | Reject requisition |
| PUT | `/api/requisitions/:id/order` | Place order |
| PUT | `/api/requisitions/:id/receive` | Receive items |
| DELETE | `/api/requisitions/:id` | Delete requisition |

#### Query Parameters for GET /api/requisitions
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Filter by status (pending, approved, rejected, ordered, received, cancelled)
- `vertical_id` - Filter by vertical
- `program_id` - Filter by program
- `priority` - Filter by priority (low, medium, high, urgent)
- `requested_by` - Filter by requester
- `vendor_id` - Filter by vendor
- `search` - Search term
- `sort` - Sort field (default: r.created_at)
- `order` - Sort order (asc/desc, default: desc)

#### Requisition Items Endpoints
| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/api/requisitions/:id/items` | Add item to requisition |
| PUT | `/api/requisitions/:id/items/:itemId` | Update requisition item |
| DELETE | `/api/requisitions/:id/items/:itemId` | Delete requisition item |

### Inventory Endpoints

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/api/inventory` | Get all inventory items |
| GET | `/api/inventory/:id` | Get inventory item with transactions |
| GET | `/api/inventory/search?search=` | Search inventory |
| GET | `/api/inventory/statistics` | Get inventory statistics |
| GET | `/api/inventory/low-stock` | Get low stock items |
| GET | `/api/inventory/out-of-stock` | Get out of stock items |
| GET | `/api/inventory/aging-report` | Get inventory aging report |
| GET | `/api/inventory/category/:category` | Get items by category |
| GET | `/api/inventory/vertical/:vertical_id` | Get items by vertical |
| POST | `/api/inventory` | Create inventory item |
| PUT | `/api/inventory/:id` | Update inventory item |
| PUT | `/api/inventory/:id/quantity` | Update inventory quantity |
| DELETE | `/api/inventory/:id` | Deactivate inventory item |

#### Query Parameters for GET /api/inventory
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Filter by status (in_stock, low_stock, out_of_stock, discontinued)
- `category` - Filter by category
- `subcategory` - Filter by subcategory
- `vertical_id` - Filter by vertical
- `vendor_id` - Filter by vendor
- `search` - Search term
- `sort` - Sort field (default: i.created_at)
- `order` - Sort order (asc/desc, default: desc)

#### Stock Transaction Endpoints
| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/api/inventory/:id/transactions` | Create stock transaction |
| GET | `/api/inventory/:id/transactions` | Get item transactions |

## Access Control

### Role-Based Permissions

#### Super Admin (role_id: 1)
- Full access to all vendors, requisitions, and inventory across all verticals
- Can create, update, delete any resource
- Can approve/reject requisitions

#### Vertical Lead (role_id: 2)
- Full access to resources within their vertical
- Can create, update, delete resources in their vertical
- Can approve/reject requisitions in their vertical

#### Staff (role_id: 3)
- Read-only access to vendors, requisitions, and inventory in their vertical
- Can create requisitions (own)
- Cannot approve/reject requisitions

#### HR Lead (role_id: 4)
- Read-only access to procurement and inventory resources
- No write permissions (unless vertical isolation allows)

### Vertical Isolation
All endpoints enforce vertical isolation:
- Non-Super Admin users can only access resources from their own vertical
- Global vendors (vertical_id = NULL) are accessible to all verticals

## Validation Rules

### Vendor Validation
- `name` - Required, max 255 characters
- `type` - Optional: goods, services, both
- `category` - Optional, max 100 characters
- `email` - Optional, must be valid email
- `phone` - Optional, 7-20 characters
- `status` - Optional: active, inactive, blacklisted
- `rating` - Optional, 1.00-5.00
- `credit_limit` - Optional, non-negative number
- `payment_terms` - Optional, max 100 characters

### Requisition Validation
- `title` - Required, max 255 characters
- `description` - Optional, max 5000 characters
- `vertical_id` - Required (auto-set to user's vertical if not provided)
- `priority` - Optional: low, medium, high, urgent
- `rejection_reason` - Required when rejecting, max 1000 characters

### Requisition Item Validation
- `item_name` - Required, max 255 characters
- `quantity` - Required, positive integer
- `unit` - Required, max 50 characters
- `estimated_unit_cost` - Optional, non-negative number
- `actual_unit_cost` - Optional, non-negative number
- `received_quantity` - Optional, non-negative integer

### Inventory Validation
- `name` - Required, max 255 characters
- `unit` - Required, max 50 characters
- `current_quantity` - Optional, non-negative integer
- `minimum_quantity` - Optional, non-negative integer
- `maximum_quantity` - Optional, non-negative integer
- `reorder_quantity` - Optional, positive integer
- `unit_cost` - Optional, non-negative number
- `vertical_id` - Required (auto-set to user's vertical if not provided)

## Workflows

### Requisition Workflow
1. **Create** - User creates a requisition with items
2. **Pending** - Requisition awaits approval
3. **Approve/Reject** - Super Admin or Vertical Lead approves or rejects
   - If rejected: status changes to 'rejected' with reason
   - If approved: status changes to 'approved'
4. **Order** - Assign vendor and place order (status: 'ordered')
5. **Receive** - Receive items and update inventory (status: 'received')
6. **Cancel** - Can cancel at any stage (before received)

### Inventory Stock Updates
Stock can be updated through:
1. Manual quantity adjustment via API
2. Stock transactions (in/out/adjustment/transfer)
3. Requisition receipt (automatic when receiving ordered items)

## Audit Logging
All operations are logged to the `audit_logs` table:
- CREATE, UPDATE, DELETE actions
- APPROVE, REJECT, ORDER, RECEIVE actions for requisitions
- STOCK_TRANSACTION actions for inventory
- UPDATE_STATUS, UPDATE_QUANTITY actions
- Includes user_id, entity_type, entity_id, old_values, new_values, IP address

## Database Migration

To create the required tables, run the migration:

```bash
mysql -u root -p ngo_dashboard < database/migrations/add_procurement_inventory_tables.sql
```

Or use your preferred database client to execute the SQL file.

## Example Requests

### Create Vendor
```bash
POST /api/vendors
{
  "name": "Office Supplies Co",
  "type": "goods",
  "category": "Office Supplies",
  "contact_person": "John Doe",
  "email": "john@officesupplies.com",
  "phone": "+91-9876543210",
  "address_line1": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "postal_code": "400001",
  "country": "India",
  "payment_terms": "30 days",
  "credit_limit": 50000,
  "status": "active"
}
```

### Create Requisition
```bash
POST /api/requisitions
{
  "title": "Office Supplies for Education Program",
  "description": "Need to stock up on supplies for the digital literacy program",
  "purpose": "Program supplies",
  "vertical_id": 1,
  "program_id": 1,
  "department": "Education",
  "priority": "medium",
  "notes": "Urgent need for upcoming workshop"
}
```

### Add Item to Requisition
```bash
POST /api/requisitions/1/items
{
  "item_name": "A4 Paper (500 sheets)",
  "description": "White A4 paper, 500 sheets per ream",
  "quantity": 50,
  "unit": "reams",
  "estimated_unit_cost": 250.00,
  "category": "Stationery"
}
```

### Approve Requisition
```bash
PUT /api/requisitions/1/approve
```

### Order Requisition
```bash
PUT /api/requisitions/1/order
{
  "vendor_id": 1,
  "po_number": "PO-2024-0001"
}
```

### Create Inventory Item
```bash
POST /api/inventory
{
  "name": "A4 Paper (500 sheets)",
  "description": "White A4 paper, 500 sheets per ream",
  "category": "Stationery",
  "unit": "reams",
  "current_quantity": 100,
  "minimum_quantity": 20,
  "reorder_quantity": 50,
  "unit_cost": 250.00,
  "location": "Shelf A-1",
  "vertical_id": 1
}
```

### Update Inventory Quantity
```bash
PUT /api/inventory/1/quantity
{
  "quantity": 150,
  "reason": "Restock from requisition REQ-2024-001"
}
```

## Files Created

### Models
- `src/models/Vendor.js` - Vendor model with CRUD operations
- `src/models/Requisition.js` - Requisition model with workflow
- `src/models/Inventory.js` - Inventory model with stock tracking

### Controllers
- `src/controllers/vendorController.js` - Vendor management controller
- `src/controllers/requisitionController.js` - Requisition workflow controller
- `src/controllers/inventoryController.js` - Inventory management controller

### Routes
- `src/routes/vendorRoutes.js` - Vendor API routes
- `src/routes/requisitionRoutes.js` - Requisition API routes
- `src/routes/inventoryRoutes.js` - Inventory API routes

### Database
- `database/migrations/add_procurement_inventory_tables.sql` - Database schema

### Validators (added to utils/validators.js)
- `createVendorValidation`, `updateVendorValidation`, `updateVendorStatusValidation`
- `createRequisitionValidation`, `updateRequisitionValidation`
- `addRequisitionItemValidation`, `updateRequisitionItemValidation`
- `approveRequisitionValidation`, `rejectRequisitionValidation`, `orderRequisitionValidation`
- `createInventoryValidation`, `updateInventoryValidation`, `updateInventoryQuantityValidation`
- `createStockTransactionValidation`

## Integration Notes

### Existing Integration Points
1. **Users Table** - All operations track `created_by` and performer IDs
2. **Verticals Table** - Resources linked to verticals for isolation
3. **Programs Table** - Requisitions can be linked to programs
4. **Audit Logs** - All operations logged for audit trail

### Middleware Used
- `verifyToken` - JWT authentication (from authMiddleware.js)
- `requireVerticalAccess` - Vertical isolation enforcement (from authMiddleware.js)

### Existing Role IDs
- 1: Super Admin (full access)
- 2: Vertical Lead (vertical access + approve/reject)
- 3: Staff (read-only + create requisitions)
- 4: HR Lead (read-only for procurement)

## Statistics Endpoints

### Vendor Statistics
```bash
GET /api/vendors/statistics
```
Returns:
- total_vendors, active_vendors, inactive_vendors
- total_order_value
- by_status, by_type, by_category
- top_vendors (by order value)

### Requisition Statistics
```bash
GET /api/requisitions/statistics?vertical_id=1&start_date=2024-01-01&end_date=2024-12-31
```
Returns:
- total_requisitions, pending_requisitions
- total_value, avg_processing_days
- by_status, by_priority

### Inventory Statistics
```bash
GET /api/inventory/statistics
```
Returns:
- total_items, total_value
- low_stock_items, out_of_stock_items, healthy_items
- by_status, by_category

### Inventory Aging Report
```bash
GET /api/inventory/aging-report
```
Returns items with:
- days_since_restock, days_since_used
- age_category (Never Used, Old 6+, Aging 3-6 months, Recent 0-3 months)

## Error Codes

All API responses use consistent error codes:
- `SUCCESS` - Operation successful
- `BAD_REQUEST` - Invalid input or validation error
- `UNAUTHORIZED` - Not authenticated
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource conflict (duplicate, etc.)
- `INTERNAL_SERVER_ERROR` - Server error

## Notes

1. **Automatic Status Calculation**: Inventory status (in_stock, low_stock, out_of_stock) is automatically calculated based on current_quantity and minimum_quantity
2. **Total Value**: Inventory item total_value is a generated column (current_quantity * unit_cost)
3. **Vendor Totals**: Vendor total_orders and total_amount are automatically updated when requisitions are received
4. **Trigger**: MySQL trigger updates vendor totals when requisitions change to 'received' status
5. **Audit Trail**: All modifications are logged with before/after values for complete audit trail

## Future Enhancements

Potential future features:
- Vendor performance analytics
- Budget tracking for requisitions
- Purchase order management
- Return handling and vendor credits
- Inventory forecasting
- Barcode/QR code scanning
- Multi-location inventory support
- Reorder automation and notifications
- Vendor quality ratings and reviews
