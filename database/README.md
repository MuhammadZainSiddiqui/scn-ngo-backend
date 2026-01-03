# NGO Dashboard - Database Setup Guide

This directory contains the complete MySQL database schema and seed data for the NGO Dashboard application.

## 📋 Table of Contents

- [Overview](#overview)
- [Database Structure](#database-structure)
- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
  - [Method 1: Using MySQL Workbench (Recommended for Beginners)](#method-1-using-mysql-workbench-recommended-for-beginners)
  - [Method 2: Using MySQL Command Line](#method-2-using-mysql-command-line)
  - [Method 3: Using phpMyAdmin](#method-3-using-phpmyadmin)
- [Verification](#verification)
- [Sample Queries](#sample-queries)
- [Schema Details](#schema-details)
- [Troubleshooting](#troubleshooting)

## 📊 Overview

The NGO Dashboard database is designed to manage:
- User authentication and role-based access control (RBAC)
- Multiple organizational verticals (Education, Health, Livelihood, etc.)
- Donor management and donation tracking
- Program management with KPIs
- Volunteer management with tier-based system
- Staff/HR records
- Procurement and vendor management
- Safeguarding records with access logging
- Complete audit trails

**Total Tables:** 25  
**Total Views:** 5  
**Total Triggers:** 3  
**Total Stored Procedures:** 2

## 🗂️ Database Structure

### Core Tables

1. **Users & Access Control**
   - `roles` - User roles with permissions
   - `users` - System users
   - `verticals` - Organizational departments

2. **Contact Management**
   - `contacts` - Centralized contact management
   - `communication_log` - Track all communications

3. **Donations**
   - `donations` - Donation records
   - `donation_allocations` - How donations are distributed

4. **Programs**
   - `programs` - Programs and projects
   - `program_kpis` - Key Performance Indicators
   - `beneficiaries` - Program beneficiaries

5. **Volunteers**
   - `volunteers` - Volunteer master data
   - `volunteer_activities` - Activity tracking

6. **HR/Staff**
   - `staff` - Employee records
   - `attendance` - Daily attendance
   - `leave_records` - Leave management

7. **Procurement**
   - `vendors` - Vendor master
   - `purchase_orders` - Purchase orders
   - `purchase_order_items` - PO line items
   - `expenses` - Expense tracking

8. **Safeguarding**
   - `safeguarding_records` - Incident records
   - `safeguarding_access_log` - Access audit trail

9. **System**
   - `audit_logs` - Complete system audit trail
   - `documents` - File attachments
   - `notifications` - User notifications
   - `settings` - Application settings

## 🔧 Prerequisites

Before setting up the database, ensure you have:

- **MySQL Server 8.0 or higher** installed
- **MySQL Workbench** (for GUI setup) OR **MySQL Command Line Client**
- Sufficient privileges to create databases (root or user with CREATE DATABASE permission)
- At least **500MB** of free disk space

### Check MySQL Version

```bash
mysql --version
```

Should output: `mysql Ver 8.0.x` or higher

## 🚀 Installation Methods

### Method 1: Using MySQL Workbench (Recommended for Beginners)

#### Step 1: Open MySQL Workbench

1. Launch MySQL Workbench
2. Click on your MySQL connection (usually `Local instance MySQL80` or similar)
3. Enter your MySQL root password when prompted

#### Step 2: Create Database

1. Click on **File** → **Open SQL Script**
2. Navigate to the `database` folder
3. Select `schema.sql`
4. Click **Execute** button (lightning bolt icon) or press `Ctrl+Shift+Enter`
5. Wait for the script to complete (should take 10-30 seconds)

You should see:
- Green checkmarks indicating successful execution
- Message: "X statements executed, X succeeded, 0 errors"

#### Step 3: Load Sample Data

1. Click on **File** → **Open SQL Script**
2. Select `seed-data.sql`
3. Click **Execute** button
4. Wait for completion (should take 5-15 seconds)

#### Step 4: Verify Installation

1. In the left sidebar, click **Schemas**
2. Right-click and select **Refresh All**
3. You should see `ngo_dashboard` database
4. Expand it to see all tables

### Method 2: Using MySQL Command Line

#### Step 1: Open Command Line/Terminal

**Windows:**
```bash
# Open Command Prompt or PowerShell
# Navigate to MySQL bin directory (usually):
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
```

**Linux/Mac:**
```bash
# Open Terminal (MySQL usually already in PATH)
```

#### Step 2: Login to MySQL

```bash
mysql -u root -p
```

Enter your MySQL root password when prompted.

#### Step 3: Execute Schema Script

```sql
SOURCE /path/to/project/database/schema.sql;
```

**Example paths:**
- Windows: `SOURCE C:/projects/ngo-dashboard/database/schema.sql;`
- Linux/Mac: `SOURCE /home/user/projects/ngo-dashboard/database/schema.sql;`

Wait for completion. You should see multiple "Query OK" messages.

#### Step 4: Execute Seed Data Script

```sql
SOURCE /path/to/project/database/seed-data.sql;
```

#### Step 5: Verify

```sql
USE ngo_dashboard;
SHOW TABLES;
SELECT COUNT(*) FROM users;
```

You should see 25 tables and 5 users.

#### Step 6: Exit

```sql
EXIT;
```

### Method 3: Using phpMyAdmin

#### Step 1: Access phpMyAdmin

1. Open your browser and go to: `http://localhost/phpmyadmin`
2. Login with your MySQL credentials

#### Step 2: Import Schema

1. Click on **Import** tab in the top menu
2. Click **Choose File**
3. Select `schema.sql`
4. Scroll down and click **Go**
5. Wait for success message

#### Step 3: Import Seed Data

1. Click on `ngo_dashboard` database in the left sidebar
2. Click **Import** tab
3. Select `seed-data.sql`
4. Click **Go**

#### Step 4: Verify

1. Click on `ngo_dashboard` in the left sidebar
2. You should see 25 tables
3. Click on any table (e.g., `users`) and click **Browse** to see data

## ✅ Verification

### Quick Verification Queries

Run these queries to verify everything is set up correctly:

```sql
USE ngo_dashboard;

-- Check all tables are created
SELECT COUNT(*) AS table_count 
FROM information_schema.tables 
WHERE table_schema = 'ngo_dashboard';
-- Expected: 25

-- Check sample data
SELECT COUNT(*) AS role_count FROM roles;           -- Expected: 3
SELECT COUNT(*) AS user_count FROM users;           -- Expected: 5
SELECT COUNT(*) AS vertical_count FROM verticals;   -- Expected: 3
SELECT COUNT(*) AS donation_count FROM donations;   -- Expected: 5
SELECT COUNT(*) AS program_count FROM programs;     -- Expected: 5

-- Check views are created
SELECT COUNT(*) AS view_count 
FROM information_schema.views 
WHERE table_schema = 'ngo_dashboard';
-- Expected: 5

-- Check triggers are created
SELECT COUNT(*) AS trigger_count 
FROM information_schema.triggers 
WHERE trigger_schema = 'ngo_dashboard';
-- Expected: 3

-- Check stored procedures
SELECT COUNT(*) AS procedure_count 
FROM information_schema.routines 
WHERE routine_schema = 'ngo_dashboard';
-- Expected: 2
```

### Verify Foreign Keys

```sql
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'ngo_dashboard'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME;
```

You should see multiple foreign key relationships.

## 🔍 Sample Queries

### User Management

```sql
-- Get all active users with their roles and verticals
SELECT * FROM v_active_users;

-- Find users by role
SELECT u.email, u.first_name, u.last_name, r.name as role
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE r.name = 'Vertical Lead';
```

### Donation Analytics

```sql
-- View all donations with donor information
SELECT * FROM v_donation_summary;

-- Total donations by vertical
SELECT 
    v.name AS vertical_name,
    COUNT(d.id) AS donation_count,
    SUM(d.amount) AS total_amount
FROM donations d
LEFT JOIN verticals v ON d.vertical_id = v.id
WHERE d.payment_status = 'received'
GROUP BY v.id, v.name;

-- Top donors
SELECT 
    c.organization_name,
    CONCAT(c.first_name, ' ', c.last_name) AS donor_name,
    COUNT(d.id) AS donation_count,
    SUM(d.amount) AS total_donated
FROM donations d
JOIN contacts c ON d.donor_id = c.id
WHERE d.payment_status = 'received'
GROUP BY c.id
ORDER BY total_donated DESC
LIMIT 10;
```

### Program Monitoring

```sql
-- Program dashboard with budget and beneficiary tracking
SELECT * FROM v_program_dashboard;

-- Programs with KPI status
SELECT 
    p.name AS program_name,
    pk.kpi_name,
    pk.target_value,
    pk.current_value,
    pk.unit,
    pk.status,
    ROUND((pk.current_value / pk.target_value * 100), 2) AS achievement_percent
FROM program_kpis pk
JOIN programs p ON pk.program_id = p.id
WHERE p.status = 'active'
ORDER BY p.name, pk.kpi_name;
```

### Volunteer Management

```sql
-- Volunteer summary with insurance status
SELECT * FROM v_volunteer_summary;

-- Volunteers by tier
SELECT 
    tier,
    COUNT(*) AS volunteer_count,
    AVG(total_hours) AS avg_hours
FROM volunteers
WHERE status = 'active'
GROUP BY tier
ORDER BY tier;

-- Top volunteers by hours
SELECT 
    vol.volunteer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS name,
    vol.total_hours,
    vol.tier
FROM volunteers vol
JOIN contacts c ON vol.contact_id = c.id
WHERE vol.status = 'active'
ORDER BY vol.total_hours DESC
LIMIT 10;
```

### Financial Reports

```sql
-- Vertical financial summary
CALL sp_vertical_financial_summary(1);  -- For Education vertical

-- Overall financial summary
SELECT 
    'Donations' AS category,
    SUM(amount) AS total
FROM donations 
WHERE payment_status = 'received'
UNION ALL
SELECT 
    'Expenses',
    SUM(amount)
FROM expenses 
WHERE status = 'approved';

-- Monthly donation trend
SELECT 
    DATE_FORMAT(donation_date, '%Y-%m') AS month,
    COUNT(*) AS donation_count,
    SUM(amount) AS total_amount
FROM donations
WHERE payment_status = 'received'
GROUP BY DATE_FORMAT(donation_date, '%Y-%m')
ORDER BY month DESC;
```

### Staff & HR

```sql
-- Staff summary
SELECT * FROM v_staff_summary WHERE status = 'active';

-- Attendance summary for current month
SELECT 
    s.employee_id,
    CONCAT(u.first_name, ' ', u.last_name) AS name,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) AS present_days,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) AS absent_days,
    COUNT(CASE WHEN a.status = 'leave' THEN 1 END) AS leave_days
FROM staff s
JOIN users u ON s.user_id = u.id
LEFT JOIN attendance a ON s.id = a.staff_id 
    AND MONTH(a.attendance_date) = MONTH(CURRENT_DATE())
    AND YEAR(a.attendance_date) = YEAR(CURRENT_DATE())
WHERE s.status = 'active'
GROUP BY s.id, s.employee_id, u.first_name, u.last_name;
```

## 📚 Schema Details

### Key Features

#### 1. Role-Based Access Control (RBAC)

The `roles` table includes a JSON `permissions` field that defines module-level access:

```json
{
  "dashboard": "full",
  "users": "full",
  "verticals": "full",
  "donations": "full",
  "volunteers": "full",
  ...
}
```

Permission levels:
- `full` - Complete CRUD access
- `vertical` - Access only to assigned vertical
- `self` - Access only to own records
- `read` - Read-only access
- `none` - No access

#### 2. Automatic Triggers

**Volunteer Tier Calculation:**
Automatically updates volunteer tier based on hours:
- Tier 1: 0-49 hours
- Tier 2: 50-99 hours
- Tier 3: 100-199 hours
- Tier 4: 200+ hours

**Volunteer Hours Tracking:**
Automatically updates total hours when activities are logged.

**Program Budget Tracking:**
Automatically updates spent amount when expenses are approved.

#### 3. Audit Logging

All important actions are logged in `audit_logs` table with:
- User who performed the action
- Action type (CREATE, UPDATE, DELETE, etc.)
- Entity affected
- Old and new values (JSON)
- IP address and user agent
- Timestamp

#### 4. Safeguarding Access Control

Special logging for safeguarding records access:
- Every view/edit/export is logged
- Includes access reason
- IP address tracking
- Complete audit trail

### Important Indexes

The schema includes optimized indexes for:
- Foreign key relationships
- Frequently queried fields (email, status, dates)
- Full-text search on names and descriptions
- Composite indexes for common query patterns

### Data Types

- **Money:** `DECIMAL(15, 2)` for precise financial calculations
- **Dates:** `DATE` for dates, `TIMESTAMP` for date-times
- **Status Fields:** `ENUM` for predefined values
- **JSON:** For flexible data structures (permissions, skills, tags)
- **Text:** For long-form content (descriptions, notes)

## 🔒 Default Login Credentials

After loading seed data, you can use these test accounts:

| Email | Password | Role | Vertical |
|-------|----------|------|----------|
| admin@ngodashboard.org | Password123! | Super Admin | - |
| priya.edu@ngodashboard.org | Password123! | Vertical Lead | Education |
| amit.health@ngodashboard.org | Password123! | Vertical Lead | Health |
| neha.livelihood@ngodashboard.org | Password123! | Vertical Lead | Livelihood |
| rahul.staff@ngodashboard.org | Password123! | Staff | Education |

**Note:** These passwords are for development only. In production:
1. Use strong, unique passwords
2. Implement proper password hashing (bcrypt, argon2)
3. Enable two-factor authentication
4. Enforce password policies

## 🐛 Troubleshooting

### Common Issues

#### Error: "Access denied for user"

**Solution:**
```sql
-- Grant necessary privileges
GRANT ALL PRIVILEGES ON ngo_dashboard.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Error: "Database exists"

**Solution:**
The schema script includes `DROP DATABASE IF EXISTS`. If you want to keep existing data:
1. Remove the DROP DATABASE line from schema.sql
2. Or manually backup: `mysqldump -u root -p ngo_dashboard > backup.sql`

#### Error: "Foreign key constraint fails"

**Solution:**
This usually happens if you run seed-data.sql before schema.sql. Always run schema.sql first.

#### Error: "Unknown column in field list"

**Solution:**
Ensure you're running MySQL 8.0 or higher. Check version:
```sql
SELECT VERSION();
```

#### Triggers not working

**Solution:**
Ensure you have TRIGGER privilege:
```sql
GRANT TRIGGER ON ngo_dashboard.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Views showing empty results

**Solution:**
This is normal if you haven't loaded seed data yet. Run seed-data.sql.

### Performance Issues

If queries are slow:

1. **Check indexes:**
```sql
SHOW INDEX FROM table_name;
```

2. **Analyze queries:**
```sql
EXPLAIN SELECT * FROM ...;
```

3. **Optimize tables:**
```sql
OPTIMIZE TABLE table_name;
```

### Reset Database

To completely reset the database:

```sql
DROP DATABASE IF EXISTS ngo_dashboard;
```

Then run schema.sql and seed-data.sql again.

## 📞 Support

For issues or questions:
1. Check this README first
2. Review the SQL comments in schema.sql
3. Check MySQL error logs
4. Search MySQL documentation: https://dev.mysql.com/doc/

## 📝 Next Steps

After setting up the database:

1. **Configure application connection:**
   - Update database credentials in your app configuration
   - Set connection pool settings
   - Configure timezone settings

2. **Security:**
   - Create application-specific MySQL user (not root)
   - Grant only necessary privileges
   - Use environment variables for credentials
   - Enable SSL for database connections

3. **Backup:**
   - Set up automated backups
   - Test restore procedures
   - Document backup retention policy

4. **Monitoring:**
   - Enable slow query log
   - Monitor database size
   - Set up alerts for errors

## 🔄 Updates & Migrations

When schema changes are needed:
1. Create migration scripts (numbered sequentially)
2. Test on development environment first
3. Backup production before applying
4. Document all changes

Example migration file naming:
- `001_add_email_verification.sql`
- `002_add_program_tags.sql`
- `003_update_expense_categories.sql`

---

**Last Updated:** 2024
**Database Version:** 1.0
**MySQL Version Required:** 8.0+
