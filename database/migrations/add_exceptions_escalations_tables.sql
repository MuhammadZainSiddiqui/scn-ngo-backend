-- ============================================
-- Exceptions & Escalations Management Tables
-- ============================================
-- Version: 1.0
-- Description: Tables for exception tracking, severity management, status workflow, assignment tracking, and escalation reporting
-- ============================================

USE ngo_dashboard;

-- ============================================
-- 1. EXCEPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exceptions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    exception_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique exception number (e.g., EXC-2024-001)',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) COMMENT 'Exception category (e.g., financial, operational, compliance, technical)',
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium' COMMENT 'Severity level',
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open' COMMENT 'Exception status workflow',
    vertical_id INT UNSIGNED NOT NULL COMMENT 'Associated vertical',
    program_id INT UNSIGNED NULL COMMENT 'Associated program',
    created_by INT UNSIGNED NOT NULL COMMENT 'User who created exception',
    assigned_to INT UNSIGNED NULL COMMENT 'User assigned to handle exception',
    assigned_date TIMESTAMP NULL COMMENT 'Date exception was assigned',
    priority BOOLEAN DEFAULT FALSE COMMENT 'Priority flag for important exceptions',
    due_date TIMESTAMP NULL COMMENT 'Expected resolution date',
    resolution_notes TEXT COMMENT 'Notes on how exception was resolved',
    resolved_at TIMESTAMP NULL COMMENT 'Date when exception was resolved',
    resolved_by INT UNSIGNED NULL COMMENT 'User who resolved exception',
    closed_at TIMESTAMP NULL COMMENT 'Date when exception was closed',
    closed_by INT UNSIGNED NULL COMMENT 'User who closed exception',
    escalation_level INT UNSIGNED DEFAULT 0 COMMENT 'Current escalation level (0-3)',
    escalation_count INT UNSIGNED DEFAULT 0 COMMENT 'Total number of escalations',
    last_escalated_at TIMESTAMP NULL COMMENT 'Date of last escalation',
    sla_breach BOOLEAN DEFAULT FALSE COMMENT 'Whether SLA was breached',
    tags VARCHAR(500) COMMENT 'Comma-separated tags for filtering',
    notes TEXT COMMENT 'Additional notes and comments',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE RESTRICT,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_exception_number (exception_number),
    INDEX idx_status (status),
    INDEX idx_severity (severity),
    INDEX idx_vertical (vertical_id),
    INDEX idx_program (program_id),
    INDEX idx_created_by (created_by),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_priority (priority),
    INDEX idx_due_date (due_date),
    INDEX idx_escalation_level (escalation_level),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Exception tracking and management';

-- ============================================
-- 2. EXCEPTION COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exception_comments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    exception_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE COMMENT 'Internal comment (not visible to external stakeholders)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (exception_id) REFERENCES exceptions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_exception_id (exception_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Comments on exceptions';

-- ============================================
-- 3. EXCEPTION ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exception_attachments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    exception_id INT UNSIGNED NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT UNSIGNED COMMENT 'File size in bytes',
    file_type VARCHAR(100) COMMENT 'MIME type or file type',
    uploaded_by INT UNSIGNED NOT NULL,
    description VARCHAR(500) COMMENT 'Attachment description',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exception_id) REFERENCES exceptions(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_exception_id (exception_id),
    INDEX idx_uploaded_by (uploaded_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Attachments for exceptions';

-- ============================================
-- 4. EXCEPTION ESCALATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exception_escalations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    exception_id INT UNSIGNED NOT NULL,
    escalated_from_user_id INT UNSIGNED NULL COMMENT 'Previous assigned user',
    escalated_to_user_id INT UNSIGNED NULL COMMENT 'New assigned user',
    escalated_by INT UNSIGNED NOT NULL COMMENT 'User who triggered escalation',
    escalation_level INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Escalation level (1-3)',
    reason TEXT NOT NULL COMMENT 'Reason for escalation',
    escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL COMMENT 'Date when escalated issue was resolved',
    status ENUM('pending', 'acknowledged', 'resolved') DEFAULT 'pending',
    FOREIGN KEY (exception_id) REFERENCES exceptions(id) ON DELETE CASCADE,
    FOREIGN KEY (escalated_from_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (escalated_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (escalated_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_exception_id (exception_id),
    INDEX idx_escalated_at (escalated_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Exception escalation history';

-- ============================================
-- 5. EXCEPTION HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exception_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    exception_id INT UNSIGNED NOT NULL,
    action ENUM('create', 'update', 'assign', 'reassign', 'resolve', 'close', 'reopen', 'escalate', 'comment', 'attach') NOT NULL,
    performed_by INT UNSIGNED NOT NULL,
    old_values JSON COMMENT 'Previous values for update actions',
    new_values JSON COMMENT 'New values for update actions',
    description TEXT COMMENT 'Description of the action',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exception_id) REFERENCES exceptions(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_exception_id (exception_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Exception change history';

-- ============================================
-- 6. EXCEPTION SLA RULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exception_sla_rules (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    response_time_hours INT UNSIGNED NOT NULL DEFAULT 24 COMMENT 'Expected response time in hours',
    resolution_time_hours INT UNSIGNED NOT NULL DEFAULT 72 COMMENT 'Expected resolution time in hours',
    auto_escalate BOOLEAN DEFAULT TRUE COMMENT 'Auto-escalate if SLA breached',
    escalate_after_hours INT UNSIGNED DEFAULT 48 COMMENT 'Escalate after these many hours if unresolved',
    escalate_to_role_id INT UNSIGNED NULL COMMENT 'Role to escalate to',
    active BOOLEAN DEFAULT TRUE COMMENT 'Whether this SLA rule is active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (escalate_to_role_id) REFERENCES roles(id) ON DELETE SET NULL,
    UNIQUE KEY idx_severity (severity, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SLA rules for exception management';

-- ============================================
-- DEFAULT SLA RULES
-- ============================================
INSERT INTO exception_sla_rules (severity, response_time_hours, resolution_time_hours, auto_escalate, escalate_after_hours, escalate_to_role_id) VALUES
('low', 48, 168, TRUE, 144, 2),
('medium', 24, 72, TRUE, 48, 2),
('high', 8, 24, TRUE, 12, 1),
('critical', 2, 8, TRUE, 4, 1);

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Procedure: Generate exception number
DELIMITER //
CREATE PROCEDURE sp_generate_exception_number(OUT exception_num VARCHAR(50))
BEGIN
    DECLARE year_prefix VARCHAR(4);
    DECLARE next_num INT;
    
    SET year_prefix = YEAR(CURDATE());
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(exception_number, 13) AS UNSIGNED)), 0) + 1
    INTO next_num
    FROM exceptions
    WHERE exception_number LIKE CONCAT('EXC-', year_prefix, '-%');
    
    SET exception_num = CONCAT('EXC-', year_prefix, '-', LPAD(next_num, 3, '0'));
END//
DELIMITER ;

-- ============================================
-- TABLES CREATED
-- ============================================
-- 1. exceptions
-- 2. exception_comments
-- 3. exception_attachments
-- 4. exception_escalations
-- 5. exception_history
-- 6. exception_sla_rules
-- ============================================
