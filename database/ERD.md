# Entity Relationship Diagram (ERD)

## Core System ERD

```mermaid
erDiagram
    roles ||--o{ users : "has"
    verticals ||--o{ users : "assigned_to"
    verticals ||--o| users : "led_by"
    
    users ||--o{ staff : "is"
    users ||--o{ contacts : "creates"
    users ||--o{ programs : "manages"
    users ||--o{ donations : "receives"
    
    roles {
        int id PK
        varchar name UK
        text description
        json permissions
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    users {
        int id PK
        varchar email UK
        varchar password_hash
        varchar first_name
        varchar last_name
        varchar phone
        int role_id FK
        int vertical_id FK
        boolean is_active
        timestamp last_login
    }
    
    verticals {
        int id PK
        varchar name
        varchar code UK
        text description
        decimal budget
        int lead_user_id FK
        boolean is_active
    }
```

## Contact Management ERD

```mermaid
erDiagram
    contacts ||--o{ donations : "makes"
    contacts ||--o| volunteers : "is"
    contacts ||--o| vendors : "is"
    contacts ||--o| beneficiaries : "is"
    contacts ||--o{ communication_log : "has"
    
    verticals ||--o{ contacts : "assigned_to"
    users ||--o{ contacts : "manages"
    
    contacts {
        int id PK
        enum type
        enum category
        varchar first_name
        varchar last_name
        varchar organization_name
        varchar email
        varchar phone
        varchar pan_number
        json tags
        int vertical_id FK
        int assigned_to_user_id FK
        enum status
    }
    
    communication_log {
        bigint id PK
        int contact_id FK
        enum communication_type
        enum direction
        varchar subject
        text message
        enum status
        int created_by FK
        timestamp created_at
    }
```

## Donations & Allocations ERD

```mermaid
erDiagram
    contacts ||--o{ donations : "donates"
    donations ||--o{ donation_allocations : "split_into"
    verticals ||--o{ donations : "receives"
    programs ||--o{ donations : "receives"
    verticals ||--o{ donation_allocations : "allocated_to"
    programs ||--o{ donation_allocations : "allocated_to"
    users ||--o{ donations : "receives"
    
    donations {
        int id PK
        varchar donation_number UK
        int donor_id FK
        date donation_date
        decimal amount
        varchar currency
        enum payment_method
        enum payment_status
        enum donation_type
        varchar receipt_number UK
        int vertical_id FK
        int program_id FK
        int received_by FK
    }
    
    donation_allocations {
        int id PK
        int donation_id FK
        int vertical_id FK
        int program_id FK
        decimal amount
        decimal allocation_percentage
    }
```

## Programs & Impact ERD

```mermaid
erDiagram
    verticals ||--o{ programs : "owns"
    programs ||--o{ program_kpis : "measures"
    programs ||--o{ beneficiaries : "serves"
    programs ||--o{ expenses : "incurs"
    programs ||--o{ volunteer_activities : "has"
    users ||--o{ programs : "manages"
    contacts ||--o{ beneficiaries : "is"
    
    programs {
        int id PK
        varchar name
        varchar code UK
        text description
        int vertical_id FK
        date start_date
        date end_date
        decimal budget
        decimal spent_amount
        enum status
        int manager_user_id FK
        int beneficiary_target
        int beneficiary_reached
    }
    
    program_kpis {
        int id PK
        int program_id FK
        varchar kpi_name
        decimal target_value
        decimal current_value
        varchar unit
        enum measurement_frequency
        enum status
    }
    
    beneficiaries {
        int id PK
        int contact_id FK
        varchar beneficiary_id UK
        int vertical_id FK
        int program_id FK
        date enrollment_date
        int household_size
        enum category
        enum status
    }
```

## Volunteer Management ERD

```mermaid
erDiagram
    contacts ||--o| volunteers : "is"
    volunteers ||--o{ volunteer_activities : "performs"
    programs ||--o{ volunteer_activities : "has"
    verticals ||--o{ volunteer_activities : "has"
    users ||--o{ volunteer_activities : "supervises"
    users ||--o{ volunteer_activities : "verifies"
    
    volunteers {
        int id PK
        int contact_id FK UK
        varchar volunteer_id UK
        date join_date
        enum tier
        decimal total_hours
        json skills
        varchar insurance_policy_number
        date insurance_expiry
        enum police_verification_status
        boolean orientation_completed
        enum status
    }
    
    volunteer_activities {
        int id PK
        int volunteer_id FK
        date activity_date
        int program_id FK
        int vertical_id FK
        varchar activity_type
        decimal hours
        int supervisor_user_id FK
        boolean verified
        int verified_by FK
    }
```

## HR & Staff Management ERD

```mermaid
erDiagram
    users ||--o| staff : "is"
    staff ||--o{ attendance : "has"
    staff ||--o{ leave_records : "applies"
    staff ||--o| staff : "reports_to"
    users ||--o{ leave_records : "approves"
    
    staff {
        int id PK
        int user_id FK UK
        varchar employee_id UK
        date join_date
        enum employment_type
        varchar designation
        decimal salary
        varchar pan_number
        varchar aadhar_number
        int reporting_to FK
        enum status
    }
    
    attendance {
        int id PK
        int staff_id FK
        date attendance_date
        time check_in
        time check_out
        enum status
        decimal work_hours
        varchar location
    }
    
    leave_records {
        int id PK
        int staff_id FK
        enum leave_type
        date start_date
        date end_date
        decimal total_days
        text reason
        enum status
        int approved_by FK
    }
```

## Procurement & Finance ERD

```mermaid
erDiagram
    contacts ||--o| vendors : "is"
    vendors ||--o{ purchase_orders : "receives"
    purchase_orders ||--o{ purchase_order_items : "contains"
    verticals ||--o{ purchase_orders : "creates"
    programs ||--o{ purchase_orders : "funds"
    users ||--o{ purchase_orders : "creates"
    users ||--o{ purchase_orders : "approves"
    
    verticals ||--o{ expenses : "incurs"
    programs ||--o{ expenses : "incurs"
    vendors ||--o{ expenses : "bills"
    users ||--o{ expenses : "claims"
    users ||--o{ expenses : "approves"
    
    vendors {
        int id PK
        int contact_id FK UK
        varchar vendor_code UK
        varchar category
        decimal credit_limit
        decimal rating
        boolean blacklisted
        enum status
    }
    
    purchase_orders {
        int id PK
        varchar po_number UK
        int vendor_id FK
        date po_date
        int vertical_id FK
        int program_id FK
        decimal net_amount
        enum status
        int approved_by FK
        int created_by FK
    }
    
    purchase_order_items {
        int id PK
        int po_id FK
        text item_description
        decimal quantity
        decimal unit_price
        decimal total_price
        decimal received_quantity
    }
    
    expenses {
        int id PK
        varchar expense_number UK
        date expense_date
        varchar category
        decimal amount
        int vertical_id FK
        int program_id FK
        int vendor_id FK
        enum payment_method
        int claimed_by FK
        enum status
        int approved_by FK
    }
```

## Safeguarding & Audit ERD

```mermaid
erDiagram
    safeguarding_records ||--o{ safeguarding_access_log : "logs_access"
    users ||--o{ safeguarding_records : "reports"
    users ||--o{ safeguarding_records : "handles"
    verticals ||--o{ safeguarding_records : "relates_to"
    programs ||--o{ safeguarding_records : "relates_to"
    
    users ||--o{ audit_logs : "performs"
    users ||--o{ notifications : "receives"
    users ||--o{ documents : "uploads"
    
    safeguarding_records {
        int id PK
        varchar incident_number UK
        date incident_date
        date reported_date
        enum incident_type
        enum severity
        text description
        enum status
        int reported_by FK
        int assigned_to FK
        boolean confidential
    }
    
    safeguarding_access_log {
        int id PK
        int record_id FK
        int accessed_by FK
        enum access_type
        varchar ip_address
        text access_reason
        timestamp accessed_at
    }
    
    audit_logs {
        bigint id PK
        int user_id FK
        varchar action
        varchar entity_type
        int entity_id
        json old_values
        json new_values
        varchar ip_address
        timestamp created_at
    }
    
    notifications {
        bigint id PK
        int user_id FK
        varchar title
        text message
        enum type
        varchar entity_type
        int entity_id
        boolean is_read
    }
    
    documents {
        int id PK
        varchar entity_type
        int entity_id
        varchar document_type
        varchar file_path
        int uploaded_by FK
        boolean is_public
    }
```

## System Configuration ERD

```mermaid
erDiagram
    users ||--o{ settings : "updates"
    
    settings {
        int id PK
        varchar setting_key UK
        text setting_value
        enum setting_type
        text description
        boolean is_public
        int updated_by FK
    }
```

## Complete Database Overview

```mermaid
graph TB
    subgraph "Core System"
        A[roles]
        B[users]
        C[verticals]
    end
    
    subgraph "Contacts & Communications"
        D[contacts]
        E[communication_log]
    end
    
    subgraph "Donations"
        F[donations]
        G[donation_allocations]
    end
    
    subgraph "Programs & Impact"
        H[programs]
        I[program_kpis]
        J[beneficiaries]
    end
    
    subgraph "Volunteers"
        K[volunteers]
        L[volunteer_activities]
    end
    
    subgraph "HR & Staff"
        M[staff]
        N[attendance]
        O[leave_records]
    end
    
    subgraph "Procurement"
        P[vendors]
        Q[purchase_orders]
        R[purchase_order_items]
        S[expenses]
    end
    
    subgraph "Safeguarding"
        T[safeguarding_records]
        U[safeguarding_access_log]
    end
    
    subgraph "System & Audit"
        V[audit_logs]
        W[documents]
        X[notifications]
        Y[settings]
    end
    
    A --> B
    B --> C
    C --> D
    D --> F
    D --> K
    D --> P
    D --> J
    F --> G
    C --> H
    H --> I
    H --> J
    K --> L
    B --> M
    M --> N
    M --> O
    P --> Q
    Q --> R
    T --> U
    B --> V
    B --> W
    B --> X
    B --> Y
```

## Key Relationships Summary

### One-to-Many Relationships
- 1 role → many users
- 1 vertical → many users (assigned)
- 1 vertical → 1 user (lead)
- 1 user → many contacts (created)
- 1 contact → many donations
- 1 donation → many allocations
- 1 vertical → many programs
- 1 program → many KPIs
- 1 volunteer → many activities
- 1 staff → many attendance records
- 1 vendor → many purchase orders
- 1 PO → many PO items

### One-to-One Relationships
- 1 contact → 1 volunteer (contact can be a volunteer)
- 1 contact → 1 vendor (contact can be a vendor)
- 1 contact → 1 beneficiary (contact can be a beneficiary)
- 1 user → 1 staff (user can be staff)

### Many-to-Many Relationships (via junction tables)
- donations ←→ verticals (via donation_allocations)
- donations ←→ programs (via donation_allocations)
- volunteers ←→ programs (via volunteer_activities)
- programs ←→ contacts/beneficiaries

## Table Size Estimates (for 1 year of operation)

| Table | Estimated Rows | Growth Rate |
|-------|----------------|-------------|
| users | 50-100 | Slow |
| roles | 3-10 | Very Slow |
| verticals | 5-20 | Very Slow |
| contacts | 1,000-5,000 | Medium |
| donations | 500-2,000 | Medium |
| programs | 20-100 | Slow |
| volunteers | 100-500 | Medium |
| volunteer_activities | 5,000-20,000 | Fast |
| staff | 20-100 | Slow |
| attendance | 5,000-25,000 | Fast |
| audit_logs | 100,000-500,000 | Very Fast |
| notifications | 10,000-50,000 | Fast |
| safeguarding_records | 0-50 | Very Slow |

**Fast growing tables** (consider archival strategy):
- audit_logs (archive after 12 months)
- volunteer_activities (keep all)
- attendance (archive after 2 years)
- notifications (delete after read + 30 days)
- communication_log (archive after 2 years)
