-- ============================================
-- NGO Dashboard Database Schema
-- ============================================
-- Version: 1.0
-- Description: Complete database schema for NGO management system
-- Features: RBAC, Donations, Programs, HR, Volunteers, Safeguarding, Audit Logs
-- ============================================

-- Create database
DROP DATABASE IF EXISTS ngo_dashboard;
CREATE DATABASE ngo_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ngo_dashboard;

-- ============================================
-- 1. ROLES TABLE
-- ============================================
CREATE TABLE roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSON COMMENT 'JSON object defining module-level permissions',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User roles with RBAC permissions';

-- ============================================
-- 2. VERTICALS TABLE
-- ============================================
CREATE TABLE verticals (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    budget DECIMAL(15, 2) DEFAULT 0.00,
    lead_user_id INT UNSIGNED NULL COMMENT 'Foreign key to users table, set after users table creation',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Organizational verticals/departments';

-- ============================================
-- 3. USERS TABLE
-- ============================================
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role_id INT UNSIGNED NOT NULL,
    vertical_id INT UNSIGNED NULL COMMENT 'NULL for Super Admin',
    profile_picture VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_role (role_id),
    INDEX idx_vertical (vertical_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System users with role and vertical assignments';

-- Add foreign key for vertical lead after users table is created
ALTER TABLE verticals 
ADD CONSTRAINT fk_verticals_lead_user 
FOREIGN KEY (lead_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- 4. CONTACTS TABLE
-- ============================================
CREATE TABLE contacts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type ENUM('donor', 'volunteer', 'vendor', 'partner', 'beneficiary', 'other') NOT NULL,
    category ENUM('individual', 'organization', 'corporate', 'foundation', 'government') DEFAULT 'individual',
    title VARCHAR(20) COMMENT 'Mr., Mrs., Dr., etc.',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    organization_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    pan_number VARCHAR(20) COMMENT 'For Indian tax purposes',
    aadhar_number VARCHAR(20) COMMENT 'For Indian identification',
    gstin VARCHAR(20) COMMENT 'For vendors/corporate donors',
    tax_exempt BOOLEAN DEFAULT FALSE,
    tags JSON COMMENT 'Array of tags for categorization',
    notes TEXT,
    preferred_contact_method ENUM('email', 'phone', 'whatsapp', 'mail') DEFAULT 'email',
    vertical_id INT UNSIGNED NULL COMMENT 'Primary vertical association',
    assigned_to_user_id INT UNSIGNED NULL,
    status ENUM('active', 'inactive', 'blocked') DEFAULT 'active',
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_type (type),
    INDEX idx_category (category),
    INDEX idx_email (email),
    INDEX idx_organization (organization_name),
    INDEX idx_vertical (vertical_id),
    INDEX idx_status (status),
    FULLTEXT INDEX ft_search (first_name, last_name, organization_name, email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Centralized contacts management';

-- ============================================
-- 5. PROGRAMS TABLE
-- ============================================
CREATE TABLE programs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    vertical_id INT UNSIGNED NOT NULL,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15, 2) DEFAULT 0.00,
    spent_amount DECIMAL(15, 2) DEFAULT 0.00,
    status ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled') DEFAULT 'planning',
    manager_user_id INT UNSIGNED NULL,
    location VARCHAR(255),
    beneficiary_target INT UNSIGNED DEFAULT 0,
    beneficiary_reached INT UNSIGNED DEFAULT 0,
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE RESTRICT,
    FOREIGN KEY (manager_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_code (code),
    INDEX idx_vertical (vertical_id),
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date),
    FULLTEXT INDEX ft_search (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Programs and projects';

-- ============================================
-- 6. PROGRAM KPIS TABLE
-- ============================================
CREATE TABLE program_kpis (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    program_id INT UNSIGNED NOT NULL,
    kpi_name VARCHAR(255) NOT NULL,
    description TEXT,
    target_value DECIMAL(15, 2),
    current_value DECIMAL(15, 2) DEFAULT 0.00,
    unit VARCHAR(50) COMMENT 'e.g., people, kg, hours, percentage',
    measurement_frequency ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one_time') DEFAULT 'monthly',
    status ENUM('on_track', 'at_risk', 'behind', 'achieved') DEFAULT 'on_track',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
    INDEX idx_program (program_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Key Performance Indicators for programs';

-- ============================================
-- 7. DONATIONS TABLE
-- ============================================
CREATE TABLE donations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    donation_number VARCHAR(50) NOT NULL UNIQUE,
    donor_id INT UNSIGNED NOT NULL,
    donation_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method ENUM('cash', 'cheque', 'bank_transfer', 'online', 'upi', 'card', 'other') NOT NULL,
    payment_reference VARCHAR(100),
    payment_status ENUM('pending', 'received', 'failed', 'refunded') DEFAULT 'received',
    donation_type ENUM('one_time', 'recurring', 'pledge') DEFAULT 'one_time',
    frequency ENUM('monthly', 'quarterly', 'yearly') NULL COMMENT 'For recurring donations',
    campaign VARCHAR(255),
    purpose TEXT,
    anonymous BOOLEAN DEFAULT FALSE,
    tax_exemption_claimed BOOLEAN DEFAULT FALSE,
    receipt_number VARCHAR(50) UNIQUE,
    receipt_issued_date DATE,
    notes TEXT,
    vertical_id INT UNSIGNED NULL COMMENT 'Primary vertical for this donation',
    program_id INT UNSIGNED NULL COMMENT 'Specific program if applicable',
    received_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES contacts(id) ON DELETE RESTRICT,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE SET NULL,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_donation_number (donation_number),
    INDEX idx_donor (donor_id),
    INDEX idx_date (donation_date),
    INDEX idx_vertical (vertical_id),
    INDEX idx_program (program_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_receipt (receipt_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Donation records';

-- ============================================
-- 8. DONATION ALLOCATIONS TABLE
-- ============================================
CREATE TABLE donation_allocations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    donation_id INT UNSIGNED NOT NULL,
    vertical_id INT UNSIGNED NULL,
    program_id INT UNSIGNED NULL,
    amount DECIMAL(15, 2) NOT NULL,
    allocation_percentage DECIMAL(5, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE SET NULL,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    INDEX idx_donation (donation_id),
    INDEX idx_vertical (vertical_id),
    INDEX idx_program (program_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='How donations are allocated across verticals/programs';

-- ============================================
-- 9. VOLUNTEERS TABLE
-- ============================================
CREATE TABLE volunteers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contact_id INT UNSIGNED NOT NULL UNIQUE,
    volunteer_id VARCHAR(50) NOT NULL UNIQUE,
    join_date DATE NOT NULL,
    tier ENUM('tier_1', 'tier_2', 'tier_3', 'tier_4') NOT NULL COMMENT 'Based on hours contributed',
    total_hours DECIMAL(10, 2) DEFAULT 0.00,
    skills JSON COMMENT 'Array of skills',
    availability JSON COMMENT 'Days/times available',
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    blood_group VARCHAR(5),
    medical_conditions TEXT,
    tshirt_size ENUM('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'),
    insurance_policy_number VARCHAR(100),
    insurance_provider VARCHAR(255),
    insurance_expiry DATE,
    police_verification_status ENUM('not_required', 'pending', 'verified', 'rejected') DEFAULT 'not_required',
    police_verification_date DATE,
    orientation_completed BOOLEAN DEFAULT FALSE,
    orientation_date DATE,
    status ENUM('active', 'inactive', 'suspended', 'blacklisted') DEFAULT 'active',
    notes TEXT,
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_volunteer_id (volunteer_id),
    INDEX idx_tier (tier),
    INDEX idx_status (status),
    INDEX idx_join_date (join_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Volunteer management';

-- ============================================
-- 10. VOLUNTEER ACTIVITIES TABLE
-- ============================================
CREATE TABLE volunteer_activities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    volunteer_id INT UNSIGNED NOT NULL,
    activity_date DATE NOT NULL,
    program_id INT UNSIGNED NULL,
    vertical_id INT UNSIGNED NULL,
    activity_type VARCHAR(100) COMMENT 'Event, fieldwork, training, etc.',
    hours DECIMAL(5, 2) NOT NULL,
    description TEXT,
    supervisor_user_id INT UNSIGNED NULL,
    verified BOOLEAN DEFAULT FALSE,
    verified_by INT UNSIGNED NULL,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (volunteer_id) REFERENCES volunteers(id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE SET NULL,
    FOREIGN KEY (supervisor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_volunteer (volunteer_id),
    INDEX idx_activity_date (activity_date),
    INDEX idx_program (program_id),
    INDEX idx_verified (verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Volunteer activity tracking';

-- ============================================
-- 11. STAFF/HR TABLE
-- ============================================
CREATE TABLE staff (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    join_date DATE NOT NULL,
    employment_type ENUM('full_time', 'part_time', 'contract', 'intern') DEFAULT 'full_time',
    designation VARCHAR(100),
    department VARCHAR(100),
    reporting_to INT UNSIGNED NULL,
    salary DECIMAL(12, 2),
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(20),
    pan_number VARCHAR(20),
    aadhar_number VARCHAR(20),
    uan_number VARCHAR(20) COMMENT 'Universal Account Number for PF',
    esic_number VARCHAR(20),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    blood_group VARCHAR(5),
    date_of_birth DATE,
    permanent_address TEXT,
    current_address TEXT,
    resignation_date DATE NULL,
    relieving_date DATE NULL,
    burnout_level ENUM('low', 'medium', 'high') DEFAULT 'low' COMMENT 'Staff burnout risk level',
    notes TEXT,
    status ENUM('active', 'on_leave', 'resigned', 'terminated') DEFAULT 'active',
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (reporting_to) REFERENCES staff(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_employee_id (employee_id),
    INDEX idx_user (user_id),
    INDEX idx_reporting_to (reporting_to),
    INDEX idx_status (status),
    INDEX idx_join_date (join_date),
    INDEX idx_burnout_level (burnout_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Staff/Employee records';

-- ============================================
-- 11.5. STAFF CONTRACTS TABLE
-- ============================================
CREATE TABLE staff_contracts (
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

-- ============================================
-- 12. LEAVE RECORDS TABLE
-- ============================================
CREATE TABLE leave_records (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_id INT UNSIGNED NOT NULL,
    leave_type ENUM('casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid', 'compensatory') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4, 1) NOT NULL COMMENT 'Supports half-days',
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    approved_by INT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_staff (staff_id),
    INDEX idx_dates (start_date, end_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Leave management';

-- ============================================
-- 13. ATTENDANCE TABLE
-- ============================================
CREATE TABLE attendance (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_id INT UNSIGNED NOT NULL,
    attendance_date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    status ENUM('present', 'absent', 'half_day', 'leave', 'holiday', 'week_off') NOT NULL,
    work_hours DECIMAL(5, 2),
    location VARCHAR(255) COMMENT 'Office/Field/Work from home',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    UNIQUE KEY unique_staff_date (staff_id, attendance_date),
    INDEX idx_staff (staff_id),
    INDEX idx_date (attendance_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daily attendance tracking';

-- ============================================
-- 14. VENDORS TABLE
-- ============================================
CREATE TABLE vendors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contact_id INT UNSIGNED NOT NULL UNIQUE,
    vendor_code VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(100) COMMENT 'Type of vendor - stationery, food, transport, etc.',
    payment_terms VARCHAR(255),
    credit_period INT UNSIGNED COMMENT 'Credit period in days',
    credit_limit DECIMAL(12, 2),
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(20),
    rating DECIMAL(3, 2) COMMENT '1-5 rating',
    blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason TEXT,
    status ENUM('active', 'inactive', 'blacklisted') DEFAULT 'active',
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_vendor_code (vendor_code),
    INDEX idx_category (category),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vendor master';

-- ============================================
-- 15. PURCHASE ORDERS TABLE
-- ============================================
CREATE TABLE purchase_orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    po_number VARCHAR(50) NOT NULL UNIQUE,
    vendor_id INT UNSIGNED NOT NULL,
    po_date DATE NOT NULL,
    expected_delivery_date DATE,
    vertical_id INT UNSIGNED NULL,
    program_id INT UNSIGNED NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
    discount_amount DECIMAL(15, 2) DEFAULT 0.00,
    net_amount DECIMAL(15, 2) NOT NULL,
    payment_terms TEXT,
    delivery_address TEXT,
    status ENUM('draft', 'pending_approval', 'approved', 'rejected', 'ordered', 'partially_received', 'received', 'cancelled') DEFAULT 'draft',
    approved_by INT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    created_by INT UNSIGNED NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE SET NULL,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_po_number (po_number),
    INDEX idx_vendor (vendor_id),
    INDEX idx_po_date (po_date),
    INDEX idx_status (status),
    INDEX idx_vertical (vertical_id),
    INDEX idx_program (program_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Purchase orders';

-- ============================================
-- 16. PURCHASE ORDER ITEMS TABLE
-- ============================================
CREATE TABLE purchase_order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    po_id INT UNSIGNED NOT NULL,
    item_description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) COMMENT 'pieces, kg, liters, etc.',
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    received_quantity DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    INDEX idx_po (po_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Purchase order line items';

-- ============================================
-- 17. EXPENSES TABLE
-- ============================================
CREATE TABLE expenses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    expense_number VARCHAR(50) NOT NULL UNIQUE,
    expense_date DATE NOT NULL,
    category VARCHAR(100) NOT NULL COMMENT 'Travel, Food, Stationery, Utilities, etc.',
    amount DECIMAL(12, 2) NOT NULL,
    vertical_id INT UNSIGNED NULL,
    program_id INT UNSIGNED NULL,
    vendor_id INT UNSIGNED NULL,
    payment_method ENUM('cash', 'cheque', 'bank_transfer', 'card', 'upi', 'other') NOT NULL,
    payment_reference VARCHAR(100),
    bill_number VARCHAR(100),
    description TEXT,
    claimed_by INT UNSIGNED NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'reimbursed') DEFAULT 'pending',
    approved_by INT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE SET NULL,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_expense_number (expense_number),
    INDEX idx_date (expense_date),
    INDEX idx_category (category),
    INDEX idx_vertical (vertical_id),
    INDEX idx_program (program_id),
    INDEX idx_status (status),
    INDEX idx_claimed_by (claimed_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Expense tracking';

-- ============================================
-- 18. SAFEGUARDING RECORDS TABLE
-- ============================================
CREATE TABLE safeguarding_records (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    incident_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    incident_date DATE NOT NULL,
    reported_date DATE NOT NULL,
    incident_type ENUM('abuse', 'exploitation', 'harassment', 'discrimination', 'misconduct', 'other') NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    location VARCHAR(255),
    description TEXT NOT NULL,
    people_involved JSON COMMENT 'Array of person details (encrypted/anonymized)',
    witness_details TEXT,
    immediate_action_taken TEXT,
    status ENUM('reported', 'under_investigation', 'resolved', 'closed', 'escalated') DEFAULT 'reported',
    resolution TEXT,
    resolution_date DATE,
    reported_by INT UNSIGNED NOT NULL,
    assigned_to INT UNSIGNED NULL,
    vertical_id INT UNSIGNED NULL,
    program_id INT UNSIGNED NULL,
    confidential BOOLEAN DEFAULT TRUE,
    external_authority_notified BOOLEAN DEFAULT FALSE,
    authority_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE SET NULL,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    INDEX idx_incident_number (incident_number),
    INDEX idx_incident_date (incident_date),
    INDEX idx_severity (severity),
    INDEX idx_status (status),
    INDEX idx_confidential (confidential)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Safeguarding and incident management - RESTRICTED ACCESS';

-- ============================================
-- 19. SAFEGUARDING ACCESS LOG TABLE
-- ============================================
CREATE TABLE safeguarding_access_log (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    record_id INT UNSIGNED NOT NULL,
    accessed_by INT UNSIGNED NOT NULL,
    access_type ENUM('view', 'edit', 'export', 'delete') NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    access_reason TEXT,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (record_id) REFERENCES safeguarding_records(id) ON DELETE CASCADE,
    FOREIGN KEY (accessed_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_record (record_id),
    INDEX idx_accessed_by (accessed_by),
    INDEX idx_accessed_at (accessed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail for safeguarding record access';

-- ============================================
-- 20. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL COMMENT 'NULL for system actions',
    action VARCHAR(100) NOT NULL COMMENT 'CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.',
    entity_type VARCHAR(100) NOT NULL COMMENT 'Table/entity name',
    entity_id INT UNSIGNED NULL COMMENT 'ID of affected record',
    old_values JSON COMMENT 'Previous state',
    new_values JSON COMMENT 'New state',
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Complete audit trail for all system actions';

-- ============================================
-- 21. DOCUMENTS TABLE
-- ============================================
CREATE TABLE documents (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL COMMENT 'contacts, donations, programs, staff, etc.',
    entity_id INT UNSIGNED NOT NULL,
    document_type VARCHAR(100) COMMENT 'ID proof, receipt, contract, report, etc.',
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT UNSIGNED COMMENT 'Size in bytes',
    mime_type VARCHAR(100),
    description TEXT,
    uploaded_by INT UNSIGNED NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Document/file attachments for all entities';

-- ============================================
-- 22. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    entity_type VARCHAR(100) NULL,
    entity_id INT UNSIGNED NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User notifications';

-- ============================================
-- 23. SETTINGS TABLE
-- ============================================
CREATE TABLE settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE COMMENT 'Can be accessed without authentication',
    updated_by INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_key (setting_key),
    INDEX idx_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Application settings and configuration';

-- ============================================
-- 24. COMMUNICATION LOG TABLE
-- ============================================
CREATE TABLE communication_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contact_id INT UNSIGNED NOT NULL,
    communication_type ENUM('email', 'phone', 'whatsapp', 'meeting', 'letter', 'other') NOT NULL,
    direction ENUM('inbound', 'outbound') NOT NULL,
    subject VARCHAR(255),
    message TEXT,
    response TEXT,
    scheduled_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    status ENUM('scheduled', 'sent', 'delivered', 'failed', 'responded') DEFAULT 'sent',
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_contact (contact_id),
    INDEX idx_type (communication_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Track all communications with contacts';

-- ============================================
-- 25. BENEFICIARIES TABLE
-- ============================================
CREATE TABLE beneficiaries (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contact_id INT UNSIGNED NOT NULL,
    beneficiary_id VARCHAR(50) NOT NULL UNIQUE,
    vertical_id INT UNSIGNED NULL,
    program_id INT UNSIGNED NULL,
    enrollment_date DATE NOT NULL,
    household_size INT UNSIGNED,
    annual_income DECIMAL(12, 2),
    category ENUM('below_poverty_line', 'above_poverty_line', 'vulnerable', 'other'),
    special_needs TEXT,
    guardian_name VARCHAR(255),
    guardian_phone VARCHAR(20),
    status ENUM('active', 'completed', 'dropped', 'inactive') DEFAULT 'active',
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE RESTRICT,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE SET NULL,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_beneficiary_id (beneficiary_id),
    INDEX idx_vertical (vertical_id),
    INDEX idx_program (program_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Program beneficiaries';

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Active users with role and vertical info
CREATE VIEW v_active_users AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.phone,
    r.name AS role_name,
    v.name AS vertical_name,
    v.code AS vertical_code,
    u.last_login,
    u.created_at
FROM users u
INNER JOIN roles r ON u.role_id = r.id
LEFT JOIN verticals v ON u.vertical_id = v.id
WHERE u.is_active = TRUE;

-- View: Donation summary
CREATE VIEW v_donation_summary AS
SELECT 
    d.id,
    d.donation_number,
    d.donation_date,
    d.amount,
    d.payment_status,
    CONCAT(c.first_name, ' ', c.last_name) AS donor_name,
    c.organization_name,
    v.name AS vertical_name,
    p.name AS program_name,
    d.receipt_number
FROM donations d
INNER JOIN contacts c ON d.donor_id = c.id
LEFT JOIN verticals v ON d.vertical_id = v.id
LEFT JOIN programs p ON d.program_id = p.id;

-- View: Program dashboard
CREATE VIEW v_program_dashboard AS
SELECT 
    p.id,
    p.name,
    p.code,
    p.status,
    v.name AS vertical_name,
    p.budget,
    p.spent_amount,
    ROUND((p.spent_amount / p.budget * 100), 2) AS budget_utilization_percent,
    p.beneficiary_target,
    p.beneficiary_reached,
    ROUND((p.beneficiary_reached / p.beneficiary_target * 100), 2) AS beneficiary_percent,
    CONCAT(u.first_name, ' ', u.last_name) AS manager_name,
    p.start_date,
    p.end_date
FROM programs p
INNER JOIN verticals v ON p.vertical_id = v.id
LEFT JOIN users u ON p.manager_user_id = u.id;

-- View: Volunteer summary
CREATE VIEW v_volunteer_summary AS
SELECT 
    vol.id,
    vol.volunteer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS volunteer_name,
    c.email,
    c.phone,
    vol.tier,
    vol.total_hours,
    vol.join_date,
    vol.status,
    vol.insurance_expiry,
    CASE 
        WHEN vol.insurance_expiry < CURDATE() THEN 'Expired'
        WHEN vol.insurance_expiry <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Expiring Soon'
        ELSE 'Valid'
    END AS insurance_status
FROM volunteers vol
INNER JOIN contacts c ON vol.contact_id = c.id;

-- View: Staff summary
CREATE VIEW v_staff_summary AS
SELECT 
    s.id,
    s.employee_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    u.email,
    u.phone,
    s.designation,
    s.employment_type,
    v.name AS vertical_name,
    r.name AS role_name,
    s.join_date,
    s.status
FROM staff s
INNER JOIN users u ON s.user_id = u.id
LEFT JOIN verticals v ON u.vertical_id = v.id
INNER JOIN roles r ON u.role_id = r.id;

-- ============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Trigger: Update volunteer tier based on hours
DELIMITER //
CREATE TRIGGER update_volunteer_tier BEFORE UPDATE ON volunteers
FOR EACH ROW
BEGIN
    IF NEW.total_hours >= 200 THEN
        SET NEW.tier = 'tier_4';
    ELSEIF NEW.total_hours >= 100 THEN
        SET NEW.tier = 'tier_3';
    ELSEIF NEW.total_hours >= 50 THEN
        SET NEW.tier = 'tier_2';
    ELSE
        SET NEW.tier = 'tier_1';
    END IF;
END//
DELIMITER ;

-- Trigger: Update total hours when volunteer activity is added
DELIMITER //
CREATE TRIGGER add_volunteer_hours AFTER INSERT ON volunteer_activities
FOR EACH ROW
BEGIN
    UPDATE volunteers 
    SET total_hours = total_hours + NEW.hours
    WHERE id = NEW.volunteer_id;
END//
DELIMITER ;

-- Trigger: Update program spent amount when expense is approved
DELIMITER //
CREATE TRIGGER update_program_spend AFTER UPDATE ON expenses
FOR EACH ROW
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.program_id IS NOT NULL THEN
        UPDATE programs 
        SET spent_amount = spent_amount + NEW.amount
        WHERE id = NEW.program_id;
    END IF;
END//
DELIMITER ;

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Procedure: Get vertical financial summary
DELIMITER //
CREATE PROCEDURE sp_vertical_financial_summary(IN p_vertical_id INT)
BEGIN
    SELECT 
        v.name AS vertical_name,
        v.budget AS total_budget,
        COALESCE(SUM(d.amount), 0) AS total_donations,
        COALESCE(SUM(e.amount), 0) AS total_expenses,
        (v.budget + COALESCE(SUM(d.amount), 0) - COALESCE(SUM(e.amount), 0)) AS available_balance
    FROM verticals v
    LEFT JOIN donations d ON d.vertical_id = v.id AND d.payment_status = 'received'
    LEFT JOIN expenses e ON e.vertical_id = v.id AND e.status = 'approved'
    WHERE v.id = p_vertical_id
    GROUP BY v.id, v.name, v.budget;
END//
DELIMITER ;

-- Procedure: Generate donation receipt number
DELIMITER //
CREATE PROCEDURE sp_generate_receipt_number(OUT receipt_num VARCHAR(50))
BEGIN
    DECLARE last_num INT DEFAULT 0;
    DECLARE year_part VARCHAR(4);
    
    SET year_part = YEAR(CURDATE());
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number, 9) AS UNSIGNED)), 0) INTO last_num
    FROM donations
    WHERE receipt_number LIKE CONCAT('REC', year_part, '%');
    
    SET last_num = last_num + 1;
    SET receipt_num = CONCAT('REC', year_part, LPAD(last_num, 6, '0'));
END//
DELIMITER ;

-- ============================================
-- INITIAL SETTINGS DATA
-- ============================================
INSERT INTO settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('organization_name', 'NGO Dashboard', 'string', 'Organization name', TRUE),
('currency', 'INR', 'string', 'Default currency', TRUE),
('tax_exemption_80g', 'true', 'boolean', '80G tax exemption available', TRUE),
('financial_year_start_month', '4', 'number', 'Financial year starts in April (4)', FALSE),
('volunteer_insurance_mandatory', 'true', 'boolean', 'Volunteer insurance is mandatory', FALSE),
('po_approval_threshold', '50000', 'number', 'PO amount threshold for approval requirement', FALSE),
('expense_approval_threshold', '5000', 'number', 'Expense amount threshold for approval', FALSE);

-- ============================================
-- SCHEMA CREATION COMPLETE
-- ============================================
-- Total Tables: 25
-- Total Views: 5
-- Total Triggers: 3
-- Total Stored Procedures: 2
-- ============================================
