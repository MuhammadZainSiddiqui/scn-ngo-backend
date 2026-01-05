# Exceptions & Escalations Management API

## Overview
Complete exception tracking, severity management, status workflow, assignment tracking, and escalation reporting system for the NGO Dashboard.

## Database Tables

### 1. exceptions
Main table for tracking all exceptions with full lifecycle management.

**Key Fields:**
- `exception_number` - Auto-generated unique ID (EXC-YYYY-XXX)
- `title`, `description` - Exception details
- `category` - Category (financial, operational, compliance, technical)
- `severity` - low, medium, high, critical
- `status` - open, in_progress, resolved, closed
- `vertical_id`, `program_id` - Vertical and program association
- `created_by`, `assigned_to` - User assignment tracking
- `priority` - Priority flag for important exceptions
- `due_date` - Auto-calculated based on severity SLA
- `resolution_notes`, `resolved_at`, `resolved_by` - Resolution tracking
- `closed_at`, `closed_by` - Closure tracking
- `escalation_level` - Current escalation level (0-3)
- `escalation_count` - Total escalations
- `sla_breach` - SLA breach flag

### 2. exception_comments
Comments on exceptions with internal/external visibility.

**Key Fields:**
- `exception_id` - Foreign key to exceptions
- `user_id` - Comment author
- `comment` - Comment text
- `is_internal` - Internal flag (not visible to external stakeholders)

### 3. exception_attachments
File attachments for exceptions.

**Key Fields:**
- `exception_id` - Foreign key to exceptions
- `file_name`, `file_path` - File details
- `file_size`, `file_type` - File metadata
- `uploaded_by` - Upload user
- `description` - Attachment description

### 4. exception_escalations
Escalation history tracking.

**Key Fields:**
- `exception_id` - Foreign key to exceptions
- `escalated_from_user_id`, `escalated_to_user_id` - Assignment changes
- `escalated_by` - User who escalated
- `escalation_level` - Level (1-3)
- `reason` - Escalation reason
- `status` - pending, acknowledged, resolved
- `escalated_at`, `resolved_at` - Timestamps

### 5. exception_history
Complete change history with old/new values.

**Key Fields:**
- `exception_id` - Foreign key to exceptions
- `action` - create, update, assign, reassign, resolve, close, escalate, comment, attach
- `performed_by` - User who performed action
- `old_values`, `new_values` - JSON snapshots
- `description` - Action description

### 6. exception_sla_rules
SLA rules by severity.

**Default SLA Settings:**
- **low**: 48h response, 168h (7 days) resolution, escalate after 144h to Vertical Lead
- **medium**: 24h response, 72h (3 days) resolution, escalate after 48h to Vertical Lead
- **high**: 8h response, 24h resolution, escalate after 12h to Super Admin
- **critical**: 2h response, 8h resolution, escalate after 4h to Super Admin

## API Endpoints

### Base URL: `/api/exceptions`

### GET `/`
Get all exceptions with filtering and pagination.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `sort` - Sort field (default: e.created_at)
- `order` - Sort direction: asc/desc (default: desc)
- `status` - Filter by status (open, in_progress, resolved, closed)
- `severity` - Filter by severity (low, medium, high, critical)
- `vertical_id` - Filter by vertical
- `assigned_to` - Filter by assigned user
- `created_by` - Filter by creator
- `priority` - Filter by priority (true/false)
- `category` - Filter by category
- `start_date` - Start date for range filter
- `end_date` - End date for range filter
- `search` - Search term (title, description, number, tags)
- `overdue_only` - Show only overdue (true/false)
- `sla_breach_only` - Show only SLA breaches (true/false)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### GET `/search`
Search exceptions by title, description, exception number, or tags.

**Query Parameters:**
- `search` - Search term (required)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

### GET `/overdue`
Get all overdue exceptions (due_date < NOW() and status in open/in_progress).

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

### GET `/statistics`
Get exception statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "open": 25,
    "in_progress": 30,
    "resolved": 80,
    "closed": 15,
    "overdue": 5,
    "sla_breach": 3,
    "priority": 10,
    "escalated": 8,
    "avg_resolution_hours": 24.5,
    "by_status": [...],
    "by_severity": [...],
    "by_category": [...]
  }
}
```

### GET `/escalation-report`
Get escalation report with summary.

**Query Parameters:**
- `vertical_id` - Filter by vertical
- `severity` - Filter by severity
- `start_date` - Start date filter
- `end_date` - End date filter

**Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 8,
  "summary": {
    "total_escalated": 8,
    "by_severity": {...},
    "by_level": {...}
  }
}
```

### GET `/severity/:severity`
Get exceptions filtered by severity level.

**Parameters:**
- `severity` - low, medium, high, or critical

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `vertical_id` - Filter by vertical

### GET `/status/:status`
Get exceptions filtered by status.

**Parameters:**
- `status` - open, in_progress, resolved, or closed

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `vertical_id` - Filter by vertical

### GET `/assigned/:user_id`
Get exceptions assigned to a specific user.

**Parameters:**
- `user_id` - User ID

**Access Control:**
- Users can only view their own assigned exceptions unless Super Admin

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

### GET `/workload/:user_id`
Get workload summary for a user.

**Parameters:**
- `user_id` - User ID

**Access Control:**
- Users can only view their own workload unless Super Admin

**Response:**
```json
{
  "success": true,
  "data": {
    "total_assigned": 15,
    "open": 5,
    "in_progress": 8,
    "resolved": 2,
    "priority": 3,
    "overdue": 1,
    "avg_age_days": 5.2
  }
}
```

### GET `/vertical/:vertical_id`
Get exception summary for a vertical.

**Parameters:**
- `vertical_id` - Vertical ID

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "open": 10,
    "in_progress": 12,
    "resolved": 18,
    "closed": 5,
    "critical": 2,
    "high": 5,
    "priority": 8,
    "overdue": 2,
    "avg_resolution_hours": 18.3
  }
}
```

### GET `/:id`
Get single exception by ID with full details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "exception_number": "EXC-2024-001",
    "title": "...",
    "description": "...",
    "severity": "high",
    "status": "in_progress",
    "vertical_id": 1,
    "vertical_name": "Education",
    "created_by": 5,
    "created_by_first_name": "John",
    "created_by_last_name": "Doe",
    "assigned_to": 10,
    "assigned_to_first_name": "Jane",
    "assigned_to_last_name": "Smith",
    "age_days": 2,
    "days_until_due": 3,
    "comments_count": 5,
    "attachments_count": 2,
    "escalations_count": 0
  }
}
```

### GET `/:id/comments`
Get all comments for an exception.

**Query Parameters:**
- `internal_only` - Show only internal comments (true/false)

### GET `/:id/history`
Get complete change history for an exception.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "action": "create",
      "performed_by": 5,
      "first_name": "John",
      "last_name": "Doe",
      "old_values": null,
      "new_values": {"exception_number": "EXC-2024-001"},
      "description": "Exception created",
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    ...
  ]
}
```

### GET `/:id/escalations`
Get escalation history for an exception.

### POST `/`
Create a new exception.

**Request Body:**
```json
{
  "title": "Payment Gateway Integration Failed",
  "description": "The payment gateway integration is failing intermittently...",
  "category": "technical",
  "severity": "high",
  "vertical_id": 1,
  "program_id": 5,
  "assigned_to": 10,
  "priority": true,
  "due_date": "2024-01-20T18:00:00.000Z",
  "tags": "urgent,finance,payment",
  "notes": "Additional notes..."
}
```

**Validation:**
- `title` - Required, max 255 characters
- `description` - Required, min 10 characters
- `severity` - Optional, default: medium (low, medium, high, critical)
- `vertical_id` - Required (auto-set to user's vertical for non-admin)
- `assigned_to` - Optional

**Response:**
```json
{
  "success": true,
  "data": {...},
  "message": "Exception created successfully"
}
```

**Automatic Behavior:**
- Exception number auto-generated (EXC-YYYY-XXX)
- Due date auto-calculated based on severity SLA if not provided
- Status set to 'open'
- History record created
- Audit log entry created

### PUT `/:id`
Update exception details.

**Request Body:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "category": "financial",
  "severity": "critical",
  "priority": false,
  "due_date": "2024-01-25T18:00:00.000Z",
  "tags": "urgent,finance",
  "notes": "Updated notes"
}
```

**Access Control:**
- Super Admin and Vertical Lead: Full access
- Staff: Can only update exceptions assigned to them

**Automatic Behavior:**
- History record created
- Audit log entry created

### PUT `/:id/status`
Update exception status with workflow validation.

**Request Body:**
```json
{
  "status": "in_progress"
}
```

**Valid Status Transitions:**
- `open` → `in_progress`, `resolved`, `closed`
- `in_progress` → `resolved`, `closed`, `open`
- `resolved` → `closed`, `open`
- `closed` → `open`

**Access Control:**
- Super Admin and Vertical Lead: Full access
- Staff: Can only update their assigned exceptions

### PUT `/:id/assign`
Assign exception to a user.

**Request Body:**
```json
{
  "assigned_to": 15
}
```

**Automatic Behavior:**
- Status changes to 'in_progress'
- assigned_date set to current timestamp
- History record created
- Audit log entry created

### PUT `/:id/reassign`
Reassign exception to a different user.

**Request Body:**
```json
{
  "assigned_to": 20
}
```

**Access Control:**
- Only Super Admin and Vertical Lead can reassign

**Automatic Behavior:**
- assigned_date updated
- History record created
- Audit log entry created

### PUT `/:id/resolve`
Mark exception as resolved.

**Request Body:**
```json
{
  "resolution_notes": "Fixed the payment gateway integration issue..."
}
```

**Validation:**
- `resolution_notes` - Required, min 5 characters

**Access Control:**
- Super Admin and Vertical Lead: Can resolve any exception
- Staff: Can only resolve exceptions assigned to them

**Automatic Behavior:**
- Status changes to 'resolved'
- resolved_at set to current timestamp
- resolved_by set to current user
- History record created
- Audit log entry created

### PUT `/:id/close`
Close an exception.

**Validation:**
- Exception must be in 'resolved' status

**Access Control:**
- Only Super Admin and Vertical Lead can close exceptions

**Automatic Behavior:**
- Status changes to 'closed'
- closed_at set to current timestamp
- closed_by set to current user
- History record created
- Audit log entry created

### PUT `/:id/escalate`
Escalate an exception.

**Request Body:**
```json
{
  "reason": "Exception not resolved within SLA timeframe...",
  "escalated_to_user_id": 5,
  "escalation_level": 2
}
```

**Validation:**
- `reason` - Required, min 5 characters
- `escalation_level` - Optional, max 3

**Access Control:**
- Only Super Admin and Vertical Lead can escalate

**Automatic Behavior:**
- escalation_level incremented
- escalation_count incremented
- last_escalated_at set to current timestamp
- assigned_to updated if escalated_to_user_id provided
- Escalation record created in exception_escalations
- History record created
- Audit log entry created

### POST `/:id/comments`
Add comment to exception.

**Request Body:**
```json
{
  "comment": "Working on this issue...",
  "is_internal": false
}
```

**Validation:**
- `comment` - Required, 1-2000 characters
- `is_internal` - Optional, default: false

### DELETE `/:id`
Delete an exception.

**Access Control:**
- Only Super Admin can delete exceptions

## Business Logic Rules

### Status Workflow
1. Status cannot go backwards (enforced transitions)
2. Only valid transitions allowed
3. Closing requires resolved status first

### Assignment Rules
1. Any user can be assigned when creating
2. Assignment changes status to 'in_progress'
3. Reassignment requires admin/lead role
4. Staff can only update their assigned exceptions

### Resolution Rules
1. Resolution requires notes (minimum 5 characters)
2. Cannot resolve already resolved/closed exceptions
3. Sets resolved_at and resolved_by

### Escalation Rules
1. Maximum escalation level is 3
2. Only admin/lead can escalate
3. Creates escalation record with reason
4. Updates escalation level and count
5. Can optionally assign to different user

### SLA Rules
1. Due date auto-calculated based on severity SLA if not provided
2. SLA breach flagged when due_date passes
3. Different response and resolution times per severity
4. Auto-escalation configured per severity level

## Access Control

### Super Admin (Role ID: 1)
- Full access to all verticals
- Can create, update, assign, resolve, close, escalate exceptions
- Can delete exceptions
- Can view all exceptions, comments, history, escalations

### Vertical Lead (Role ID: 2)
- Full access to own vertical
- Can create, update, assign, resolve, close, escalate exceptions
- Read-only access to other verticals
- Cannot delete exceptions

### Staff (Role ID: 3)
- Can create exceptions in their vertical
- Can view exceptions in their vertical
- Can update and resolve exceptions assigned to them
- Cannot reassign, close, escalate, or delete exceptions
- Can view their own workload

### HR Lead (Role ID: 4)
- Same access as Vertical Lead for exceptions

## Database Migration

Run the migration to create tables:

```bash
mysql -u root -p ngo_dashboard < database/migrations/add_exceptions_escalations_tables.sql
```

This creates:
- 6 tables (exceptions, exception_comments, exception_attachments, exception_escalations, exception_history, exception_sla_rules)
- 1 stored procedure (sp_generate_exception_number)
- Default SLA rules for each severity level

## Example API Calls

### Create Exception
```bash
curl -X POST http://localhost:5000/api/exceptions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Server Outage",
    "description": "Main application server is down...",
    "severity": "critical",
    "priority": true
  }'
```

### Get Overdue Exceptions
```bash
curl -X GET "http://localhost:5000/api/exceptions/overdue?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Statistics
```bash
curl -X GET "http://localhost:5000/api/exceptions/statistics?vertical_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Resolve Exception
```bash
curl -X PUT http://localhost:5000/api/exceptions/1/resolve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution_notes": "Fixed the server issue by restarting the service..."
  }'
```

### Escalate Exception
```bash
curl -X PUT http://localhost:5000/api/exceptions/1/escalate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Exception not resolved within 24 hours despite high severity",
    "escalation_level": 2,
    "escalated_to_user_id": 5
  }'
```

## Notes

1. All timestamps are in UTC
2. Pagination applies to list endpoints
3. Vertical isolation enforced for all operations (except Super Admin)
4. Audit logging enabled for all CRUD operations
5. History tracking for all state changes
6. SLA tracking and breach monitoring
7. Auto-escalation configured via SLA rules (can be triggered via cron job)
