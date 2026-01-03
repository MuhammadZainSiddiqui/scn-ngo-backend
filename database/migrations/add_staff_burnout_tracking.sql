-- Migration: Add burnout tracking and notes to staff table
-- Date: 2025-01-XX
-- Description: Add burnout_level and notes columns to staff table for HR & Staff Management

USE ngo_dashboard;

-- Add burnout_level column if it doesn't exist
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS burnout_level ENUM('low', 'medium', 'high') DEFAULT 'low' COMMENT 'Staff burnout risk level';

-- Add notes column if it doesn't exist
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS notes TEXT AFTER burnout_level;

-- Add index for burnout_level for better query performance
CREATE INDEX IF NOT EXISTS idx_burnout_level ON staff(burnout_level);

-- Add staff_contracts table for contract tracking
CREATE TABLE IF NOT EXISTS staff_contracts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_id INT UNSIGNED NOT NULL,
    contract_number VARCHAR(50) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    contract_type ENUM('permanent', 'fixed_term', 'probation', 'consultancy') DEFAULT 'fixed_term',
    renewal_date DATE NULL,
    terms TEXT,
    status ENUM('active', 'expired', 'terminated', 'renewed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    INDEX idx_staff (staff_id),
    INDEX idx_contract_number (contract_number),
    INDEX idx_dates (start_date, end_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Staff contract records';
