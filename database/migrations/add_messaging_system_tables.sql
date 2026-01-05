-- ============================================
-- Messaging System Tables
-- ============================================
-- Version: 1.0
-- Description: Tables for direct messaging, group conversations, notifications, and communication across the NGO platform
-- ============================================

USE ngo_dashboard;

-- ============================================
-- 1. MESSAGES TABLE (Direct Messages)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sender_id INT UNSIGNED NOT NULL COMMENT 'User who sent the message',
    receiver_id INT UNSIGNED NOT NULL COMMENT 'User who receives the message',
    subject VARCHAR(255) COMMENT 'Message subject',
    body TEXT NOT NULL COMMENT 'Message content',
    message_type ENUM('direct', 'announcement') DEFAULT 'direct' COMMENT 'Type of message',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium' COMMENT 'Message priority',
    is_read BOOLEAN DEFAULT FALSE COMMENT 'Whether message has been read',
    read_at TIMESTAMP NULL COMMENT 'When message was read',
    archived_by_sender BOOLEAN DEFAULT FALSE COMMENT 'Archived by sender',
    archived_by_receiver BOOLEAN DEFAULT FALSE COMMENT 'Archived by receiver',
    deleted_by_sender BOOLEAN DEFAULT FALSE COMMENT 'Soft delete by sender',
    deleted_by_receiver BOOLEAN DEFAULT FALSE COMMENT 'Soft delete by receiver',
    vertical_id INT UNSIGNED NULL COMMENT 'Vertical for organization',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE SET NULL,
    INDEX idx_sender_id (sender_id),
    INDEX idx_receiver_id (receiver_id),
    INDEX idx_is_read (is_read),
    INDEX idx_vertical_id (vertical_id),
    INDEX idx_created_at (created_at),
    INDEX idx_archived_sender (archived_by_sender),
    INDEX idx_archived_receiver (archived_by_receiver),
    INDEX idx_deleted_sender (deleted_by_sender),
    INDEX idx_deleted_receiver (deleted_by_receiver)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Direct messages between users';

-- ============================================
-- 2. CONVERSATIONS TABLE (Group Conversations)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'Conversation name',
    description VARCHAR(500) COMMENT 'Conversation description',
    conversation_type ENUM('group', 'announcement', 'notification') DEFAULT 'group' COMMENT 'Type of conversation',
    is_archived BOOLEAN DEFAULT FALSE COMMENT 'Whether conversation is archived',
    vertical_id INT UNSIGNED NULL COMMENT 'Vertical for organization',
    created_by INT UNSIGNED NOT NULL COMMENT 'User who created conversation',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE SET NULL,
    INDEX idx_created_by (created_by),
    INDEX idx_vertical_id (vertical_id),
    INDEX idx_conversation_type (conversation_type),
    INDEX idx_is_archived (is_archived),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Group conversations and threads';

-- ============================================
-- 3. CONVERSATION MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_members (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    role ENUM('member', 'moderator', 'admin') DEFAULT 'member' COMMENT 'Member role in conversation',
    notification_preference ENUM('all', 'mention_only', 'none') DEFAULT 'all' COMMENT 'Notification preference',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL COMMENT 'When member left conversation',
    last_read_at TIMESTAMP NULL COMMENT 'Last time member read messages',
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_conversation_member (conversation_id, user_id, left_at),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_user_id (user_id),
    INDEX idx_left_at (left_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Members of group conversations';

-- ============================================
-- 4. CONVERSATION MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT UNSIGNED NOT NULL,
    sender_id INT UNSIGNED NOT NULL COMMENT 'User who sent the message',
    body TEXT NOT NULL COMMENT 'Message content',
    message_type ENUM('message', 'system', 'notification') DEFAULT 'message' COMMENT 'Message type',
    is_pinned BOOLEAN DEFAULT FALSE COMMENT 'Whether message is pinned',
    is_deleted BOOLEAN DEFAULT FALSE COMMENT 'Soft delete flag',
    deleted_at TIMESTAMP NULL COMMENT 'When message was deleted',
    deleted_by INT UNSIGNED NULL COMMENT 'Who deleted the message',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_is_pinned (is_pinned),
    INDEX idx_is_deleted (is_deleted),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Messages in group conversations';

-- ============================================
-- 5. MESSAGE ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS message_attachments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    message_id INT UNSIGNED NULL COMMENT 'Direct message ID',
    conversation_message_id INT UNSIGNED NULL COMMENT 'Conversation message ID',
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size INT UNSIGNED COMMENT 'File size in bytes',
    file_type VARCHAR(100) COMMENT 'MIME type or file type',
    uploaded_by INT UNSIGNED NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_message_id) REFERENCES conversation_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_message_id (message_id),
    INDEX idx_conversation_message_id (conversation_message_id),
    INDEX idx_uploaded_by (uploaded_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='File attachments for messages';

-- ============================================
-- 6. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL COMMENT 'User who receives notification',
    type ENUM('message', 'task', 'alert', 'announcement', 'assignment', 'system') DEFAULT 'system' COMMENT 'Notification type',
    title VARCHAR(255) NOT NULL COMMENT 'Notification title',
    message TEXT NOT NULL COMMENT 'Notification content',
    data JSON COMMENT 'Additional data',
    action_url VARCHAR(500) COMMENT 'URL to navigate to when clicked',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium' COMMENT 'Notification priority',
    is_read BOOLEAN DEFAULT FALSE COMMENT 'Whether notification has been read',
    read_at TIMESTAMP NULL COMMENT 'When notification was read',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System notifications for users';

-- ============================================
-- 7. MESSAGE READ RECEIPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_message_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL COMMENT 'User who read the message',
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_message_id) REFERENCES conversation_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_read_receipt (conversation_message_id, user_id),
    INDEX idx_conversation_message_id (conversation_message_id),
    INDEX idx_user_id (user_id),
    INDEX idx_read_at (read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Track message reads in conversations';

-- ============================================
-- 8. MESSAGE HISTORY TABLE (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS message_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    message_id INT UNSIGNED NULL COMMENT 'Direct message ID',
    conversation_message_id INT UNSIGNED NULL COMMENT 'Conversation message ID',
    action ENUM('create', 'edit', 'delete', 'read', 'archive', 'pin', 'unpin') NOT NULL,
    old_values JSON COMMENT 'Previous values',
    new_values JSON COMMENT 'New values',
    user_id INT UNSIGNED NOT NULL COMMENT 'User who performed action',
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_message_id) REFERENCES conversation_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_message_id (message_id),
    INDEX idx_conversation_message_id (conversation_message_id),
    INDEX idx_action (action),
    INDEX idx_performed_at (performed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail for message operations';

-- ============================================
-- 9. NOTIFICATION PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    email_on_message BOOLEAN DEFAULT TRUE COMMENT 'Send email on new message',
    email_on_assignment BOOLEAN DEFAULT TRUE COMMENT 'Send email on task assignment',
    email_on_alert BOOLEAN DEFAULT TRUE COMMENT 'Send email on alerts',
    in_app_only BOOLEAN DEFAULT FALSE COMMENT 'Only in-app notifications',
    do_not_disturb BOOLEAN DEFAULT FALSE COMMENT 'Do not disturb mode',
    dnd_start_time TIME COMMENT 'Do not disturb start time',
    dnd_end_time TIME COMMENT 'Do not disturb end time',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_preference (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User notification preferences';

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Create default notification preferences for new users
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS after_user_insert_create_notification_preferences
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO notification_preferences (user_id, email_on_message, email_on_assignment, email_on_alert, in_app_only, do_not_disturb)
    VALUES (NEW.id, TRUE, TRUE, TRUE, FALSE, FALSE);
END$$
DELIMITER ;

-- ============================================
-- SEED DEFAULT NOTIFICATION SLA
-- ============================================

-- Insert default notification preferences for existing users (if any don't have them)
INSERT INTO notification_preferences (user_id, email_on_message, email_on_assignment, email_on_alert, in_app_only, do_not_disturb)
SELECT id, TRUE, TRUE, TRUE, FALSE, FALSE
FROM users
WHERE id NOT IN (SELECT user_id FROM notification_preferences);

-- ============================================
-- END OF MIGRATIONS
-- ============================================
