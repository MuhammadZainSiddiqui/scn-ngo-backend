# HR & Staff Management API Documentation

Complete HR & Staff Management API for the NGO Dashboard with staff directory, employment information, burnout monitoring, and HR reporting.

## Base URL
```
/api/staff
```

## Authentication
All endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

## Roles & Permissions

### Role-Based Access Control

| Role | Read | Write | Delete | Notes |
|------|-------|--------|--------|-------|
| Super Admin (1) | ✓ | ✓ | ✓ | Full access to all verticals |
| HR Lead (4) | ✓ | ✓ | ✓ | Full access to staff in their vertical |
| Vertical Lead (2) | ✓ | ✗ | ✗ | Read-only access to staff in their vertical |
| Staff (3) | ✓* | ✓** | ✗ | Limited to own profile |

* Staff can only read their own profile
** Staff can only update limited personal fields (bank details, emergency contact, address, etc.)

### Vertical Isolation
- Super Admin (1): Access to all verticals
- All other roles: Limited to their assigned vertical only

---

## Endpoints

### 1. Get All Staff
```http
GET /api/staff
```

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10, max: 100)
- `status` (optional) - Filter by status: `active`, `on_leave`, `resigned`, `terminated`
- `employment_type` (optional) - Filter by type: `full_time`, `part_time`, `contract`, `intern`
- `department` (optional) - Filter by department name
- `vertical_id` (optional) - Filter by vertical ID
- `search` (optional) - Search by name, email, position, department, or employee ID
- `burnout_level` (optional) - Filter by burnout level: `low`, `medium`, `high`
- `sort` (optional) - Sort field (default: `s.created_at`)
- `order` (optional) - Sort order: `asc` or `desc` (default: `desc`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 5,
      "employee_id": "EMP2025001",
      "join_date": "2024-01-15",
      "employment_type": "full_time",
      "designation": "Program Manager",
      "department": "Programs",
      "salary": 75000.00,
      "status": "active",
      "burnout_level": "low",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "role_name": "Staff",
      "vertical_name": "Education"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  },
  "message": "Staff retrieved successfully"
}
```

---

### 2. Get Staff by ID
```http
GET /api/staff/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 5,
    "employee_id": "EMP2025001",
    "join_date": "2024-01-15",
    "employment_type": "full_time",
    "designation": "Program Manager",
    "department": "Programs",
    "salary": 75000.00,
    "bank_name": "HDFC Bank",
    "bank_account_number": "1234567890",
    "bank_ifsc": "HDFC0001234",
    "pan_number": "ABCDE1234F",
    "emergency_contact_name": "Jane Doe",
    "emergency_contact_phone": "9876543210",
    "blood_group": "O+",
    "date_of_birth": "1985-06-15",
    "permanent_address": "123 Main St, City",
    "current_address": "456 Work St, City",
    "status": "active",
    "burnout_level": "low",
    "pending_leaves": 1,
    "approved_leaves_next_30_days": 2,
    "avg_work_hours_last_30_days": 8.5
  },
  "message": "Staff retrieved successfully"
}
```

---

### 3. Create Staff Record
```http
POST /api/staff
```

**Required:** HR Lead or Super Admin role

**Request Body:**
```json
{
  "user_id": 5,
  "employee_id": "EMP2025001",
  "join_date": "2024-01-15",
  "employment_type": "full_time",
  "designation": "Program Manager",
  "department": "Programs",
  "reporting_to": 2,
  "salary": 75000.00,
  "bank_name": "HDFC Bank",
  "bank_account_number": "1234567890",
  "bank_ifsc": "HDFC0001234",
  "pan_number": "ABCDE1234F",
  "aadhar_number": "123456789012",
  "uan_number": "123456789012",
  "esic_number": "1234567890",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "9876543210",
  "emergency_contact_relation": "Spouse",
  "blood_group": "O+",
  "date_of_birth": "1985-06-15",
  "permanent_address": "123 Main St, City",
  "current_address": "456 Work St, City",
  "burnout_level": "low",
  "notes": "Experienced in education programs"
}
```

**Note:** `employee_id` is auto-generated if not provided (format: `EMP<YYYY><NNN>`)

---

### 4. Update Staff Information
```http
PUT /api/staff/:id
```

**Request Body:** (All fields optional)
```json
{
  "employment_type": "full_time",
  "designation": "Senior Program Manager",
  "department": "Programs",
  "reporting_to": 3,
  "salary": 85000.00,
  "bank_name": "Updated Bank",
  "bank_account_number": "0987654321",
  "bank_ifsc": "UPDATED1234",
  "emergency_contact_name": "Updated Contact",
  "burnout_level": "medium"
}
```

**Permission Notes:**
- HR Lead & Super Admin: Can update all fields
- Staff: Can only update personal fields (bank details, emergency contact, address, blood group, DOB)

---

### 5. Update Staff Status
```http
PUT /api/staff/:id/status
```

**Required:** HR Lead or Super Admin role

**Request Body:**
```json
{
  "status": "resigned",
  "resignation_date": "2024-12-31",
  "relieving_date": "2025-01-31"
}
```

**Status Options:**
- `active` - Currently employed
- `on_leave` - On approved leave
- `resigned` - Has resigned
- `terminated` - Employment terminated

---

### 6. Update Burnout Level
```http
PUT /api/staff/:id/burnout
```

**Required:** HR Lead or Super Admin role

**Request Body:**
```json
{
  "burnout_level": "high"
}
```

**Burnout Levels:**
- `low` - Low burnout risk
- `medium` - Moderate burnout risk
- `high` - High burnout risk (requires intervention)

---

### 7. Calculate Burnout Risk
```http
GET /api/staff/:id/calculate-burnout
```

Automatically calculates burnout risk based on:
- Leave usage (last 90 days)
- Average daily work hours (last 30 days)
- Overtime frequency (days with >10 hours)

**Response:**
```json
{
  "success": true,
  "data": {
    "staff_id": 1,
    "burnout_level": "medium",
    "risk_score": 3,
    "factors": {
      "leaves_90_days": 6,
      "avg_daily_hours": 9.5,
      "overtime_days": 6
    }
  },
  "message": "Burnout risk calculated successfully"
}
```

---

### 8. Search Staff
```http
GET /api/staff/search?search=<term>
```

Searches across: first name, last name, email, designation, department, employee ID

---

### 9. Get Staff Directory
```http
GET /api/staff/directory
```

**Query Parameters:**
- `department` (optional) - Filter by department
- `vertical_id` (optional) - Filter by vertical ID
- `status` (optional) - Filter by status (default: `active`)

Returns a condensed view of staff for directory listing.

---

### 10. Get Staff by Department
```http
GET /api/staff/department/:department
```

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10)

---

### 11. Get Staff Statistics
```http
GET /api/staff/statistics
```

**Query Parameters:**
- `vertical_id` (optional) - Filter by vertical ID

**Response:**
```json
{
  "success": true,
  "data": {
    "total_staff": 45,
    "active_staff": 42,
    "inactive_staff": 3,
    "high_burnout_risk": 5,
    "by_status": [
      { "status": "active", "count": 42 },
      { "status": "on_leave", "count": 2 },
      { "status": "resigned", "count": 1 }
    ],
    "by_employment_type": [
      { "employment_type": "full_time", "count": 35 },
      { "employment_type": "part_time", "count": 5 },
      { "employment_type": "contract", "count": 3 },
      { "employment_type": "intern", "count": 2 }
    ],
    "by_department": [
      { "department": "Programs", "count": 15, "avg_salary": 75000 },
      { "department": "Finance", "count": 8, "avg_salary": 60000 }
    ],
    "by_burnout_level": [
      { "burnout_level": "low", "count": 35 },
      { "burnout_level": "medium", "count": 5 },
      { "burnout_level": "high", "count": 5 }
    ]
  },
  "message": "Staff statistics retrieved successfully"
}
```

---

### 12. Get Staff with Expiring Contracts
```http
GET /api/staff/expiring-contracts
```

**Query Parameters:**
- `days` (optional) - Threshold in days (default: 30)

Returns staff whose contracts expire within the specified days.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "employee_id": "EMP2025001",
      "designation": "Program Manager",
      "department": "Programs",
      "join_date": "2024-01-15",
      "employment_type": "full_time",
      "contract_expiry_date": "2025-02-15",
      "days_until_expiry": 15
    }
  ],
  "message": "Staff with contracts expiring in 30 days retrieved successfully"
}
```

---

### 13. Get Burnout Report
```http
GET /api/staff/burnout-report
```

**Query Parameters:**
- `vertical_id` (optional) - Filter by vertical ID
- `burnout_level` (optional) - Filter by burnout level

Returns comprehensive burnout analysis for staff.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "employee_id": "EMP2025001",
      "designation": "Program Manager",
      "department": "Programs",
      "join_date": "2024-01-15",
      "burnout_level": "high",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "leaves_taken_90_days": 8,
      "pending_leaves": 2,
      "avg_daily_hours": 10.5
    }
  ],
  "message": "Burnout report retrieved successfully"
}
```

---

### 14. Delete/Deactivate Staff
```http
DELETE /api/staff/:id
```

**Required:** HR Lead or Super Admin role

Performs a soft delete by setting status to `resigned` and `relieving_date` to current date.

---

## Burnout Risk Calculation Algorithm

The burnout risk is calculated based on three factors:

| Factor | Threshold | Score Contribution |
|---------|-----------|-------------------|
| Leave usage (90 days) | > 5 leaves | +2 points |
| Average daily hours (30 days) | > 9 hours | +2 points |
| Overtime days (30 days) | > 5 days with 10+ hours | +2 points |

**Risk Levels:**
- **Low (0-1 points)**: Healthy work-life balance
- **Medium (2-3 points)**: Moderate risk, monitor closely
- **High (4-6 points)**: High risk, intervention recommended

---

## Audit Logging

All staff operations are logged to the `audit_logs` table:
- CREATE: New staff record creation
- UPDATE: Staff information updates
- UPDATE_STATUS: Status changes
- UPDATE_BURNOUT: Burnout level changes
- DELETE: Staff deactivation

Audit log includes:
- User who performed the action
- Timestamp
- Old and new values
- IP address and user agent

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**
- `UNAUTHORIZED` - Authentication required or invalid
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `BAD_REQUEST` - Invalid input data
- `CONFLICT` - Duplicate entry or constraint violation
- `INTERNAL_SERVER_ERROR` - Server error
- `HR_ROLE_REQUIRED` - HR Lead or Super Admin role required
- `VERTICAL_ACCESS_DENIED` - Cannot access other vertical's data

---

## Database Schema

### Staff Table
```sql
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
    uan_number VARCHAR(20),
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
    burnout_level ENUM('low', 'medium', 'high') DEFAULT 'low',
    notes TEXT,
    status ENUM('active', 'on_leave', 'resigned', 'terminated') DEFAULT 'active',
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reporting_to) REFERENCES staff(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_employee_id (employee_id),
    INDEX idx_user (user_id),
    INDEX idx_reporting_to (reporting_to),
    INDEX idx_status (status),
    INDEX idx_burnout_level (burnout_level)
);
```

### Staff Contracts Table
```sql
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
);
```

---

## Example Usage

### Create a new staff member
```bash
curl -X POST http://localhost:5000/api/staff \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 10,
    "join_date": "2024-01-15",
    "employment_type": "full_time",
    "designation": "Field Coordinator",
    "department": "Field Operations",
    "salary": 55000
  }'
```

### Get staff statistics
```bash
curl http://localhost:5000/api/staff/statistics \
  -H "Authorization: Bearer <token>"
```

### Search staff
```bash
curl "http://localhost:5000/api/staff/search?search=John" \
  -H "Authorization: Bearer <token>"
```

### Get burnout report
```bash
curl http://localhost:5000/api/staff/burnout-report \
  -H "Authorization: Bearer <token>"
```

---

## Notes

1. **Employee ID Generation**: If not provided, employee IDs are auto-generated using the format `EMP<YYYY><NNN>` (e.g., `EMP2025001`)

2. **Soft Delete**: Staff records are never permanently deleted; they are marked as `resigned` with a relieving date.

3. **Vertical Isolation**: Non-admin users can only access staff within their assigned vertical.

4. **Audit Trail**: All modifications are logged for accountability.

5. **Burnout Calculation**: The algorithm considers leave patterns, work hours, and overtime to assess burnout risk.

6. **Contract Tracking**: The system supports contract expiry tracking to alert HR about renewals.

7. **Self-Service**: Staff members can update their personal information (bank details, emergency contacts, addresses) through the update endpoint.

---

## Future Enhancements

- Leave request and approval workflow
- Performance review cycles
- Training and certification tracking
- Salary revision history
- Document management (contracts, offer letters, etc.)
- Attendance management integration
- Payroll processing
- Exit interview forms
- Org chart visualization
