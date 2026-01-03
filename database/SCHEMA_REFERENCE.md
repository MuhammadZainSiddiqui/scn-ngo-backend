# Database Schema Quick Reference

## Table Relationships Diagram (Text Format)

```
roles (1) ----< (∞) users (∞) >---- (1) verticals
                      |                      |
                      +------ (lead_user_id) +
                      |
    +-----------------+-----------------+
    |                 |                 |
    v                 v                 v
contacts          programs          staff
    |                 |                 |
    +--< donations    +--< program_kpis |
    |                 |                 |
    +--< volunteers   +--< beneficiaries|
    |                 |                 |
    +--< vendors      +--< expenses     +--< attendance
                      |                 |
                      |                 +--< leave_records
                      |
                      +--< purchase_orders
                      |
                      +--< volunteer_activities
```

## Tables at a Glance

### Core System Tables

| Table | Primary Key | Key Foreign Keys | Description |
|-------|-------------|------------------|-------------|
| `roles` | id | - | User roles (Super Admin, Vertical Lead, Staff) |
| `users` | id | role_id, vertical_id | System users with authentication |
| `verticals` | id | lead_user_id | Organizational departments/verticals |

### Contact & Communication

| Table | Primary Key | Key Foreign Keys | Description |
|-------|-------------|------------------|-------------|
| `contacts` | id | vertical_id, assigned_to_user_id | All contacts (donors, volunteers, vendors, etc.) |
| `communication_log` | id | contact_id, created_by | Track all communications |

### Donations & Fundraising

| Table | Primary Key | Key Foreign Keys | Description |
|-------|-------------|------------------|-------------|
| `donations` | id | donor_id, vertical_id, program_id | Donation records |
| `donation_allocations` | id | donation_id, vertical_id, program_id | How donations are split |

### Programs & Impact

| Table | Primary Key | Key Foreign Keys | Description |
|-------|-------------|------------------|-------------|
| `programs` | id | vertical_id, manager_user_id | Programs and projects |
| `program_kpis` | id | program_id | Key performance indicators |
| `beneficiaries` | id | contact_id, vertical_id, program_id | Program beneficiaries |

### Volunteer Management

| Table | Primary Key | Key Foreign Keys | Description |
|-------|-------------|------------------|-------------|
| `volunteers` | id | contact_id | Volunteer master data |
| `volunteer_activities` | id | volunteer_id, program_id, vertical_id | Activity/hours tracking |

### HR & Staff Management

| Table | Primary Key | Key Foreign Keys | Description |
|-------|-------------|------------------|-------------|
| `staff` | id | user_id, reporting_to | Employee records |
| `attendance` | id | staff_id | Daily attendance |
| `leave_records` | id | staff_id, approved_by | Leave applications |

### Procurement & Finance

| Table | Primary Key | Key Foreign Keys | Description |
|-------|-------------|------------------|-------------|
| `vendors` | id | contact_id | Vendor master |
| `purchase_orders` | id | vendor_id, vertical_id, program_id | Purchase orders |
| `purchase_order_items` | id | po_id | PO line items |
| `expenses` | id | vertical_id, program_id, vendor_id | Expense tracking |

### Safeguarding & Compliance

| Table | Primary Key | Key Foreign Keys | Description |
|-------|-------------|------------------|-------------|
| `safeguarding_records` | id | reported_by, assigned_to, vertical_id | Incident records (RESTRICTED) |
| `safeguarding_access_log` | id | record_id, accessed_by | Access audit trail |

### System & Audit

| Table | Primary Key | Key Foreign Keys | Description |
|-------|-------------|------------------|-------------|
| `audit_logs` | id | user_id | Complete system audit trail |
| `documents` | id | uploaded_by | File attachments for all entities |
| `notifications` | id | user_id | User notifications |
| `settings` | id | updated_by | Application settings |

## Views

| View Name | Description | Key Columns |
|-----------|-------------|-------------|
| `v_active_users` | Active users with role and vertical | email, role_name, vertical_name |
| `v_donation_summary` | Donations with donor info | donation_number, amount, donor_name |
| `v_program_dashboard` | Program metrics | name, budget, utilization%, beneficiary% |
| `v_volunteer_summary` | Volunteers with insurance status | volunteer_id, name, tier, insurance_status |
| `v_staff_summary` | Staff with basic info | employee_id, name, designation, status |

## Triggers

| Trigger Name | Event | Table | Description |
|--------------|-------|-------|-------------|
| `update_volunteer_tier` | BEFORE UPDATE | volunteers | Auto-calculate tier based on hours |
| `add_volunteer_hours` | AFTER INSERT | volunteer_activities | Update total hours |
| `update_program_spend` | AFTER UPDATE | expenses | Update program spent amount |

## Stored Procedures

| Procedure Name | Parameters | Description |
|----------------|------------|-------------|
| `sp_vertical_financial_summary` | p_vertical_id INT | Get financial summary for a vertical |
| `sp_generate_receipt_number` | OUT receipt_num VARCHAR(50) | Generate unique receipt number |

## ENUM Values Reference

### Contact Type
- `donor`, `volunteer`, `vendor`, `partner`, `beneficiary`, `other`

### Contact Category
- `individual`, `organization`, `corporate`, `foundation`, `government`

### Program Status
- `planning`, `active`, `on_hold`, `completed`, `cancelled`

### Donation Type
- `one_time`, `recurring`, `pledge`

### Payment Method
- `cash`, `cheque`, `bank_transfer`, `online`, `upi`, `card`, `other`

### Payment Status
- `pending`, `received`, `failed`, `refunded`

### Volunteer Tier
- `tier_1` (0-49 hours)
- `tier_2` (50-99 hours)
- `tier_3` (100-199 hours)
- `tier_4` (200+ hours)

### Employment Type
- `full_time`, `part_time`, `contract`, `intern`

### Leave Type
- `casual`, `sick`, `earned`, `maternity`, `paternity`, `unpaid`, `compensatory`

### Attendance Status
- `present`, `absent`, `half_day`, `leave`, `holiday`, `week_off`

### PO Status
- `draft`, `pending_approval`, `approved`, `rejected`, `ordered`, `partially_received`, `received`, `cancelled`

### Expense Status
- `pending`, `approved`, `rejected`, `reimbursed`

### Safeguarding Incident Type
- `abuse`, `exploitation`, `harassment`, `discrimination`, `misconduct`, `other`

### Safeguarding Severity
- `low`, `medium`, `high`, `critical`

### Safeguarding Status
- `reported`, `under_investigation`, `resolved`, `closed`, `escalated`

## Common Query Patterns

### Get User Permissions
```sql
SELECT r.permissions 
FROM users u 
JOIN roles r ON u.role_id = r.id 
WHERE u.id = ?;
```

### Check Vertical Access
```sql
SELECT vertical_id 
FROM users 
WHERE id = ? AND is_active = TRUE;
```

### Total Donations by Vertical
```sql
SELECT v.name, SUM(d.amount) 
FROM donations d 
JOIN verticals v ON d.vertical_id = v.id 
WHERE d.payment_status = 'received' 
GROUP BY v.id;
```

### Volunteer Hours by Program
```sql
SELECT p.name, SUM(va.hours) 
FROM volunteer_activities va 
JOIN programs p ON va.program_id = p.id 
WHERE va.verified = TRUE 
GROUP BY p.id;
```

### Program Budget Utilization
```sql
SELECT 
    name, 
    budget, 
    spent_amount, 
    ROUND(spent_amount/budget*100, 2) AS utilization_percent 
FROM programs 
WHERE status = 'active';
```

### Staff Attendance Rate
```sql
SELECT 
    s.employee_id,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / COUNT(*) AS attendance_rate
FROM staff s
JOIN attendance a ON s.id = a.staff_id
WHERE MONTH(a.attendance_date) = MONTH(CURRENT_DATE())
GROUP BY s.id;
```

## Indexing Strategy

### Primary Indexes (Foreign Keys)
All foreign key columns are automatically indexed.

### Secondary Indexes
- Email addresses (users.email, contacts.email)
- Status fields (users.is_active, contacts.status, etc.)
- Date fields (donation_date, join_date, etc.)
- Codes/Numbers (donation_number, volunteer_id, employee_id)

### Composite Indexes
- attendance(staff_id, attendance_date) - UNIQUE
- For date range queries

### Full-Text Indexes
- contacts(first_name, last_name, organization_name, email)
- programs(name, description)

## JSON Field Structures

### roles.permissions
```json
{
  "dashboard": "full|read|none",
  "users": "full|vertical|read|none",
  "verticals": "full|vertical|read|none",
  "contacts": "full|vertical|read|none",
  "donations": "full|vertical|read|none",
  "volunteers": "full|vertical|read|none",
  "programs": "full|vertical|read|none",
  "hr": "full|read|self|none",
  "procurement": "full|vertical|read|none",
  "expenses": "full|vertical|self|read|none",
  "safeguarding": "full|vertical|read|none",
  "reports": "full|vertical|read|none",
  "settings": "full|read|none"
}
```

### contacts.tags
```json
["major_donor", "monthly_giver", "corporate", "volunteer"]
```

### volunteers.skills
```json
["Teaching", "Medical", "IT", "Project Management"]
```

### volunteers.availability
```json
{
  "days": ["monday", "wednesday", "friday"],
  "times": "evenings",
  "frequency": "weekly"
}
```

### audit_logs.old_values / new_values
```json
{
  "field_name": "old_value",
  "another_field": "another_old_value"
}
```

## Security Considerations

1. **Password Hashing**: Use bcrypt or argon2 for password_hash field
2. **Safeguarding Access**: Always log access to safeguarding_records
3. **Audit Logging**: Log all CREATE, UPDATE, DELETE operations
4. **Vertical Isolation**: Filter queries by user's vertical_id for non-admin users
5. **API Security**: Validate user permissions from roles.permissions JSON
6. **Sensitive Data**: Encrypt before storing: pan_number, aadhar_number, bank details
7. **File Uploads**: Validate file types and scan for malware before storing in documents table

## Backup Strategy

### What to Backup
- **Full Database**: Daily backup of entire ngo_dashboard database
- **Incremental**: Transaction logs every hour
- **Before Major Changes**: Manual backup before schema changes

### Retention Policy
- Daily backups: Keep 7 days
- Weekly backups: Keep 4 weeks
- Monthly backups: Keep 12 months
- Yearly backups: Keep indefinitely

### Critical Tables (Priority Backup)
1. donations, donation_allocations
2. programs, program_kpis
3. contacts
4. safeguarding_records
5. users, staff
6. audit_logs

## Performance Tips

1. **Use Views**: Leverage pre-defined views for common queries
2. **Limit Results**: Always use LIMIT for large tables
3. **Index Usage**: Ensure WHERE clauses use indexed columns
4. **Avoid SELECT ***: Specify only needed columns
5. **Batch Operations**: Use bulk inserts for multiple records
6. **Connection Pooling**: Reuse database connections
7. **Query Cache**: Enable for frequently-run read queries
8. **Partitioning**: Consider partitioning audit_logs by date for better performance

## Maintenance Tasks

### Daily
- Check error logs
- Monitor disk space
- Verify backup completion

### Weekly
- Review slow query log
- Check index usage statistics
- Analyze table growth

### Monthly
- Optimize tables: `OPTIMIZE TABLE table_name;`
- Update table statistics: `ANALYZE TABLE table_name;`
- Review and archive old audit logs (keep last 12 months active)

### Quarterly
- Review and update indexes based on query patterns
- Test backup restoration
- Review user access and permissions
