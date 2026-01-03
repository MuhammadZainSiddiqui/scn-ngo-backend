-- ============================================
-- Procurement & Inventory Management Tables
-- ============================================
-- Version: 1.0
-- Description: Tables for vendor management, requisitions, and inventory tracking
-- ============================================

USE ngo_dashboard;

-- ============================================
-- 1. VENDORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vendors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vendor_code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique vendor code (e.g., VEN-2024-001)',
    name VARCHAR(255) NOT NULL,
    type ENUM('goods', 'services', 'both') DEFAULT 'goods' COMMENT 'Type of vendor',
    category VARCHAR(100) COMMENT 'Vendor category (e.g., IT, Office Supplies, Food)',
    contact_person VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    gstin VARCHAR(20) COMMENT 'GST identification number',
    pan_number VARCHAR(20) COMMENT 'PAN number',
    payment_terms VARCHAR(100) DEFAULT '30 days' COMMENT 'Payment terms',
    credit_limit DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Credit limit for vendor',
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(20),
    status ENUM('active', 'inactive', 'blacklisted') DEFAULT 'active',
    rating DECIMAL(3, 2) DEFAULT 0.00 COMMENT 'Vendor rating (1.00 - 5.00)',
    total_orders INT UNSIGNED DEFAULT 0 COMMENT 'Total orders placed',
    total_amount DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Total order amount',
    notes TEXT,
    vertical_id INT UNSIGNED NULL COMMENT 'Associated vertical (NULL for global vendors)',
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_vendor_code (vendor_code),
    INDEX idx_name (name),
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_vertical (vertical_id),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vendor and supplier management';

-- ============================================
-- 2. INVENTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inventory (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique item code (e.g., INV-001)',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) COMMENT 'Item category (e.g., Electronics, Stationery, Food)',
    subcategory VARCHAR(100) COMMENT 'Item subcategory',
    unit VARCHAR(50) NOT NULL COMMENT 'Unit of measurement (e.g., pcs, kg, liters)',
    current_quantity INT NOT NULL DEFAULT 0 COMMENT 'Current stock quantity',
    minimum_quantity INT NOT NULL DEFAULT 10 COMMENT 'Minimum reorder level',
    maximum_quantity INT DEFAULT NULL COMMENT 'Maximum stock level',
    reorder_quantity INT DEFAULT 50 COMMENT 'Quantity to reorder',
    unit_cost DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Cost per unit',
    total_value DECIMAL(15, 2) GENERATED ALWAYS AS (current_quantity * unit_cost) STORED,
    location VARCHAR(100) COMMENT 'Storage location',
    status ENUM('in_stock', 'low_stock', 'out_of_stock', 'discontinued') GENERATED ALWAYS AS (
        CASE
            WHEN current_quantity = 0 THEN 'out_of_stock'
            WHEN current_quantity <= minimum_quantity THEN 'low_stock'
            ELSE 'in_stock'
        END
    ) STORED,
    last_restocked_date TIMESTAMP NULL COMMENT 'Date of last restock',
    last_used_date TIMESTAMP NULL COMMENT 'Date when item was last used',
    vendor_id INT UNSIGNED NULL COMMENT 'Preferred vendor',
    vertical_id INT UNSIGNED NOT NULL COMMENT 'Owning vertical',
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_item_code (item_code),
    INDEX idx_name (name),
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_vertical (vertical_id),
    INDEX idx_vendor (vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Inventory items and stock management';

-- ============================================
-- 3. REQUISITIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS requisitions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    requisition_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique requisition number (e.g., REQ-2024-001)',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    purpose TEXT COMMENT 'Purpose of requisition',
    vertical_id INT UNSIGNED NOT NULL COMMENT 'Requesting vertical',
    program_id INT UNSIGNED NULL COMMENT 'Associated program',
    requested_by INT UNSIGNED NOT NULL COMMENT 'User who created requisition',
    department VARCHAR(100),
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'approved', 'rejected', 'ordered', 'received', 'cancelled') DEFAULT 'pending',
    estimated_total DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Estimated total cost',
    approved_by INT UNSIGNED NULL COMMENT 'User who approved',
    approved_date TIMESTAMP NULL COMMENT 'Date of approval',
    rejected_by INT UNSIGNED NULL COMMENT 'User who rejected',
    rejected_date TIMESTAMP NULL COMMENT 'Date of rejection',
    rejection_reason TEXT,
    ordered_by INT UNSIGNED NULL COMMENT 'User who placed order',
    ordered_date TIMESTAMP NULL COMMENT 'Date order was placed',
    vendor_id INT UNSIGNED NULL COMMENT 'Selected vendor for order',
    po_number VARCHAR(100) COMMENT 'Purchase order number',
    received_by INT UNSIGNED NULL COMMENT 'User who received items',
    received_date TIMESTAMP NULL COMMENT 'Date items were received',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE RESTRICT,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (ordered_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_requisition_number (requisition_number),
    INDEX idx_status (status),
    INDEX idx_vertical (vertical_id),
    INDEX idx_program (program_id),
    INDEX idx_requested_by (requested_by),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Procurement requisitions';

-- ============================================
-- 4. REQUISITION ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS requisition_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    requisition_id INT UNSIGNED NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INT NOT NULL COMMENT 'Requested quantity',
    received_quantity INT DEFAULT 0 COMMENT 'Quantity actually received',
    unit VARCHAR(50) NOT NULL COMMENT 'Unit of measurement',
    estimated_unit_cost DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Estimated cost per unit',
    actual_unit_cost DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Actual cost per unit',
    total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * estimated_unit_cost) STORED,
    item_code VARCHAR(50) COMMENT 'Link to inventory item if exists',
    inventory_id INT UNSIGNED NULL COMMENT 'Link to inventory item',
    category VARCHAR(100),
    specifications TEXT COMMENT 'Item specifications/requirements',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requisition_id) REFERENCES requisitions(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL,
    INDEX idx_requisition_id (requisition_id),
    INDEX idx_inventory_id (inventory_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Items within a requisition';

-- ============================================
-- 5. STOCK TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stock_transactions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique transaction number',
    inventory_id INT UNSIGNED NOT NULL,
    transaction_type ENUM('in', 'out', 'adjustment', 'transfer') NOT NULL,
    quantity INT NOT NULL COMMENT 'Positive for in, negative for out',
    previous_quantity INT NOT NULL COMMENT 'Quantity before transaction',
    new_quantity INT NOT NULL COMMENT 'Quantity after transaction',
    unit_cost DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Cost per unit at transaction time',
    reference_type ENUM('requisition', 'manual', 'donation', 'adjustment', 'transfer') NOT NULL,
    reference_id INT UNSIGNED NOT NULL COMMENT 'ID of reference record',
    reason TEXT COMMENT 'Reason for transaction',
    performed_by INT UNSIGNED NOT NULL,
    vertical_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE RESTRICT,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE RESTRICT,
    INDEX idx_transaction_number (transaction_number),
    INDEX idx_inventory_id (inventory_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_created_at (created_at),
    INDEX idx_vertical (vertical_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stock movement transactions';

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Update vendor totals on order completion
DELIMITER //
CREATE TRIGGER update_vendor_totals
AFTER UPDATE ON requisitions
FOR EACH ROW
BEGIN
    IF NEW.status = 'received' AND OLD.status != 'received' AND NEW.vendor_id IS NOT NULL THEN
        UPDATE vendors
        SET total_orders = total_orders + 1,
            total_amount = total_amount + NEW.estimated_total,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.vendor_id;
    END IF;
END//
DELIMITER ;

-- ============================================
-- TABLES CREATED
-- ============================================
-- 1. vendors
-- 2. inventory
-- 3. requisitions
-- 4. requisition_items
-- 5. stock_transactions
-- ============================================
