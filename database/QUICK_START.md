# Quick Start Guide - NGO Dashboard Database

Get your database up and running in 5 minutes!

## ⚡ Super Quick Setup

### Step 1: Ensure MySQL is Running

```bash
# Check if MySQL is running
mysql --version

# If not installed, download from:
# https://dev.mysql.com/downloads/mysql/
```

### Step 2: Login to MySQL

```bash
mysql -u root -p
```

### Step 3: Run Setup Scripts

```sql
-- In MySQL prompt:
SOURCE /path/to/database/schema.sql;
SOURCE /path/to/database/seed-data.sql;
```

### Step 4: Verify Setup

```sql
USE ngo_dashboard;
SHOW TABLES;  -- Should show 25 tables
SELECT COUNT(*) FROM users;  -- Should return 5
```

### Step 5: Done! 🎉

Your database is ready with:
- ✅ 25 tables created
- ✅ 5 views configured
- ✅ 3 triggers active
- ✅ Sample data loaded
- ✅ 5 test users ready

## 🔐 Test Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@ngodashboard.org | Password123! |
| Vertical Lead (Education) | priya.edu@ngodashboard.org | Password123! |
| Vertical Lead (Health) | amit.health@ngodashboard.org | Password123! |
| Vertical Lead (Livelihood) | neha.livelihood@ngodashboard.org | Password123! |
| Staff | rahul.staff@ngodashboard.org | Password123! |

⚠️ **Change these passwords in production!**

## 🧪 Quick Test Queries

### View All Donations
```sql
USE ngo_dashboard;
SELECT * FROM v_donation_summary;
```

### See Active Programs
```sql
SELECT * FROM v_program_dashboard WHERE status = 'active';
```

### List All Volunteers
```sql
SELECT * FROM v_volunteer_summary;
```

### Check Financial Summary
```sql
CALL sp_vertical_financial_summary(1);  -- Education vertical
```

## 📊 What's Included?

### Sample Data Loaded:
- **3 Roles:** Super Admin, Vertical Lead, Staff
- **5 Users:** Different roles and access levels
- **3 Verticals:** Education, Health, Livelihood
- **10 Contacts:** Donors, volunteers, vendors
- **5 Donations:** ₹1,200,000 total
- **5 Programs:** With KPIs and tracking
- **5 Volunteers:** With activities logged
- **4 Staff:** With attendance records
- **2 Vendors:** With purchase orders

## 🚀 Next Steps

1. **Connect Your Application**
   - Update your app's database config
   - Use connection string: `mysql://user:pass@localhost/ngo_dashboard`

2. **Explore the Schema**
   - Read [README.md](README.md) for detailed setup
   - Check [SCHEMA_REFERENCE.md](SCHEMA_REFERENCE.md) for table details
   - View [ERD.md](ERD.md) for visual relationships

3. **Test Features**
   - Try creating a new donation
   - Add a volunteer activity
   - Generate reports using views

4. **Security Setup**
   - Create app-specific MySQL user
   - Change default passwords
   - Configure SSL connections

## 🛠️ Common Commands

### Backup Database
```bash
mysqldump -u root -p ngo_dashboard > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
mysql -u root -p ngo_dashboard < backup_20240103.sql
```

### Reset Database (⚠️ Deletes all data!)
```sql
DROP DATABASE IF EXISTS ngo_dashboard;
SOURCE /path/to/database/schema.sql;
SOURCE /path/to/database/seed-data.sql;
```

### Create App User
```sql
CREATE USER 'ngo_app'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON ngo_dashboard.* TO 'ngo_app'@'localhost';
FLUSH PRIVILEGES;
```

## 📱 Using MySQL Workbench (GUI Method)

1. **Open MySQL Workbench**
2. **Connect to your server**
3. **File → Open SQL Script → schema.sql**
4. **Click Execute (⚡)**
5. **File → Open SQL Script → seed-data.sql**
6. **Click Execute (⚡)**
7. **Refresh Schemas panel**
8. **Done!**

## 🐛 Troubleshooting

### "Access denied"
```sql
-- Grant permissions
GRANT ALL PRIVILEGES ON ngo_dashboard.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### "Database exists"
```sql
-- Drop and recreate
DROP DATABASE IF EXISTS ngo_dashboard;
-- Then run schema.sql again
```

### "Can't connect to MySQL"
```bash
# Windows: Start MySQL service
net start MySQL80

# Linux: Start MySQL service
sudo systemctl start mysql

# Mac: Start MySQL service
mysql.server start
```

### "Unknown column"
Make sure you run `schema.sql` BEFORE `seed-data.sql`

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| **README.md** | Complete setup guide with all methods |
| **SCHEMA_REFERENCE.md** | Quick reference for tables, columns, ENUMs |
| **ERD.md** | Visual diagrams of table relationships |
| **QUICK_START.md** | This file - fastest way to get started |
| **schema.sql** | Database structure (run first) |
| **seed-data.sql** | Sample test data (run second) |

## 🎯 Usage Examples

### Add a New Donation
```sql
INSERT INTO donations (
    donation_number, donor_id, donation_date, amount,
    payment_method, payment_status, received_by
) VALUES (
    'DON202400006', 1, CURDATE(), 25000.00,
    'online', 'received', 1
);
```

### Create a New Volunteer
```sql
-- First add to contacts
INSERT INTO contacts (type, first_name, last_name, email, phone, created_by)
VALUES ('volunteer', 'John', 'Doe', 'john@example.com', '+91-9876543210', 1);

-- Then add to volunteers
INSERT INTO volunteers (contact_id, volunteer_id, join_date, tier, created_by)
VALUES (LAST_INSERT_ID(), 'VOL2024006', CURDATE(), 'tier_1', 1);
```

### Log Volunteer Activity
```sql
INSERT INTO volunteer_activities (
    volunteer_id, activity_date, program_id, activity_type,
    hours, description, supervisor_user_id
) VALUES (
    1, CURDATE(), 1, 'Teaching', 8.00,
    'Conducted computer class', 2
);
```

### Add Program Expense
```sql
INSERT INTO expenses (
    expense_number, expense_date, category, amount,
    program_id, payment_method, claimed_by, status
) VALUES (
    'EXP202400006', CURDATE(), 'Training Material', 3000.00,
    1, 'cash', 2, 'pending'
);
```

## 🔍 Verification Checklist

After setup, verify these:

- [ ] MySQL server is running
- [ ] Database `ngo_dashboard` exists
- [ ] 25 tables created
- [ ] 5 views created
- [ ] 3 triggers created
- [ ] 2 stored procedures created
- [ ] Sample data loaded (5 users, 5 donations, etc.)
- [ ] Can login with test credentials
- [ ] Views return data (e.g., `SELECT * FROM v_active_users`)
- [ ] Triggers work (add volunteer activity, check total hours)

## 💡 Pro Tips

1. **Use Views**: Pre-built views make queries easier
   ```sql
   SELECT * FROM v_donation_summary;
   ```

2. **Let Triggers Do the Work**: Hours and tiers auto-calculate
   ```sql
   -- Just insert activity, tier updates automatically
   INSERT INTO volunteer_activities ...
   ```

3. **Leverage Stored Procedures**: Complex reports made simple
   ```sql
   CALL sp_vertical_financial_summary(1);
   ```

4. **Use Full-Text Search**: Fast contact searches
   ```sql
   SELECT * FROM contacts 
   WHERE MATCH(first_name, last_name, email) 
   AGAINST('John' IN NATURAL LANGUAGE MODE);
   ```

5. **Audit Everything**: Check audit_logs for all changes
   ```sql
   SELECT * FROM audit_logs WHERE user_id = 2 ORDER BY created_at DESC;
   ```

## 🌟 Key Features

- ✅ **RBAC**: Role-based access control with JSON permissions
- ✅ **Multi-Vertical**: Separate data by departments
- ✅ **Donation Tracking**: Complete donor management with 80G receipts
- ✅ **Program KPIs**: Track impact and progress
- ✅ **Volunteer Tiers**: Automatic tier calculation
- ✅ **HR Management**: Staff, attendance, leave tracking
- ✅ **Procurement**: PO and expense management
- ✅ **Safeguarding**: Incident tracking with access logs
- ✅ **Complete Audit**: Every action logged
- ✅ **Production Ready**: Optimized indexes and constraints

## 📞 Need Help?

- 📖 Read the full [README.md](README.md)
- 🔍 Check [SCHEMA_REFERENCE.md](SCHEMA_REFERENCE.md) for table details
- 📊 View [ERD.md](ERD.md) for relationship diagrams
- 🐛 See Troubleshooting section above

---

**Happy Coding! 🚀**

*Database setup time: ~5 minutes*  
*Lines of code: 900+ SQL statements*  
*Tables: 25 | Views: 5 | Triggers: 3*
