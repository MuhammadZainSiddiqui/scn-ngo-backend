-- ============================================
-- NGO Dashboard - Sample Seed Data
-- ============================================
-- Purpose: Provide realistic test data for development and testing
-- ============================================

USE ngo_dashboard;

-- Disable foreign key checks for data insertion
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 1. ROLES DATA
-- ============================================
INSERT INTO roles (id, name, description, permissions, is_active) VALUES
(1, 'Super Admin', 'Full system access with all permissions', 
 '{"dashboard": "full", "users": "full", "verticals": "full", "contacts": "full", "donations": "full", "volunteers": "full", "programs": "full", "hr": "full", "procurement": "full", "expenses": "full", "safeguarding": "full", "reports": "full", "settings": "full"}', 
 TRUE),
(2, 'Vertical Lead', 'Manages specific vertical with limited cross-vertical access', 
 '{"dashboard": "read", "users": "vertical", "verticals": "vertical", "contacts": "full", "donations": "vertical", "volunteers": "full", "programs": "vertical", "hr": "read", "procurement": "vertical", "expenses": "vertical", "safeguarding": "vertical", "reports": "vertical", "settings": "read"}', 
 TRUE),
(3, 'Staff', 'Basic access for regular staff members', 
 '{"dashboard": "read", "users": "read", "verticals": "read", "contacts": "read", "donations": "vertical", "volunteers": "read", "programs": "read", "hr": "self", "procurement": "read", "expenses": "self", "safeguarding": "none", "reports": "read", "settings": "none"}', 
 TRUE);

-- ============================================
-- 2. VERTICALS DATA
-- ============================================
INSERT INTO verticals (id, name, code, description, budget, is_active) VALUES
(1, 'Education', 'EDU', 'Programs focused on education, literacy, and skill development', 5000000.00, TRUE),
(2, 'Health & Nutrition', 'HLT', 'Healthcare services, nutrition programs, and wellness initiatives', 3500000.00, TRUE),
(3, 'Livelihood & Empowerment', 'LVL', 'Income generation, vocational training, and women empowerment', 2500000.00, TRUE);

-- ============================================
-- 3. USERS DATA
-- ============================================
-- Password for all users: 'Password123!' (in real scenario, these would be properly hashed)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role_id, vertical_id, is_active) VALUES
(1, 'admin@ngodashboard.org', '$2a$10$xQXHzqPvdYp1JB.XbE5yiO7J7LnVPZMH3KZ/CXxVxQXHzqPvdYp1J', 'Rajesh', 'Kumar', '+91-9876543210', 1, NULL, TRUE),
(2, 'priya.edu@ngodashboard.org', '$2a$10$xQXHzqPvdYp1JB.XbE5yiO7J7LnVPZMH3KZ/CXxVxQXHzqPvdYp1J', 'Priya', 'Sharma', '+91-9876543211', 2, 1, TRUE),
(3, 'amit.health@ngodashboard.org', '$2a$10$xQXHzqPvdYp1JB.XbE5yiO7J7LnVPZMH3KZ/CXxVxQXHzqPvdYp1J', 'Amit', 'Patel', '+91-9876543212', 2, 2, TRUE),
(4, 'neha.livelihood@ngodashboard.org', '$2a$10$xQXHzqPvdYp1JB.XbE5yiO7J7LnVPZMH3KZ/CXxVxQXHzqPvdYp1J', 'Neha', 'Gupta', '+91-9876543213', 2, 3, TRUE),
(5, 'rahul.staff@ngodashboard.org', '$2a$10$xQXHzqPvdYp1JB.XbE5yiO7J7LnVPZMH3KZ/CXxVxQXHzqPvdYp1J', 'Rahul', 'Singh', '+91-9876543214', 3, 1, TRUE);

-- Update vertical leads
UPDATE verticals SET lead_user_id = 2 WHERE id = 1;
UPDATE verticals SET lead_user_id = 3 WHERE id = 2;
UPDATE verticals SET lead_user_id = 4 WHERE id = 3;

-- ============================================
-- 4. CONTACTS DATA
-- ============================================
INSERT INTO contacts (id, type, category, title, first_name, last_name, organization_name, email, phone, address_line1, city, state, postal_code, country, pan_number, tax_exempt, vertical_id, status, created_by) VALUES
(1, 'donor', 'individual', 'Mr.', 'Vikram', 'Malhotra', NULL, 'vikram.malhotra@email.com', '+91-9876501001', '45 Golf Links Road', 'New Delhi', 'Delhi', '110001', 'India', 'ABCPM1234F', TRUE, NULL, 'active', 1),
(2, 'donor', 'corporate', NULL, NULL, NULL, 'TechCorp India Pvt Ltd', 'csr@techcorp.in', '+91-9876501002', 'Tower A, Cyber City', 'Bangalore', 'Karnataka', '560100', 'India', NULL, TRUE, NULL, 'active', 1),
(3, 'donor', 'foundation', NULL, NULL, NULL, 'Community Welfare Foundation', 'grants@cwf.org', '+91-9876501003', '12 Marine Drive', 'Mumbai', 'Maharashtra', '400001', 'India', NULL, TRUE, NULL, 'active', 1),
(4, 'volunteer', 'individual', 'Ms.', 'Anita', 'Desai', NULL, 'anita.desai@email.com', '+91-9876501004', '78 MG Road', 'Pune', 'Maharashtra', '411001', 'India', NULL, FALSE, 1, 'active', 2),
(5, 'volunteer', 'individual', 'Mr.', 'Suresh', 'Reddy', NULL, 'suresh.reddy@email.com', '+91-9876501005', '23 Anna Salai', 'Chennai', 'Tamil Nadu', '600002', 'India', NULL, FALSE, 2, 'active', 3),
(6, 'vendor', 'organization', NULL, NULL, NULL, 'Office Supplies Co', 'sales@officesupplies.com', '+91-9876501006', 'Plot 45, Industrial Area', 'Noida', 'Uttar Pradesh', '201301', 'India', NULL, FALSE, NULL, 'active', 1),
(7, 'vendor', 'organization', NULL, NULL, NULL, 'Fresh Foods Catering', 'orders@freshfoods.com', '+91-9876501007', '67 Food Street', 'Hyderabad', 'Telangana', '500001', 'India', NULL, FALSE, NULL, 'active', 1),
(8, 'partner', 'organization', NULL, NULL, NULL, 'State Education Board', 'partnership@statedu.gov.in', '+91-9876501008', 'Education Bhawan', 'Lucknow', 'Uttar Pradesh', '226001', 'India', NULL, FALSE, 1, 'active', 2),
(9, 'beneficiary', 'individual', 'Mrs.', 'Lakshmi', 'Devi', NULL, 'lakshmi.devi@email.com', '+91-9876501009', 'Gram Panchayat', 'Khargone', 'Madhya Pradesh', '451001', 'India', NULL, FALSE, 3, 'active', 4),
(10, 'volunteer', 'individual', 'Mr.', 'Arjun', 'Kapoor', NULL, 'arjun.kapoor@email.com', '+91-9876501010', '90 Park Street', 'Kolkata', 'West Bengal', '700016', 'India', NULL, FALSE, 3, 'active', 4);

-- ============================================
-- 5. PROGRAMS DATA
-- ============================================
INSERT INTO programs (id, name, code, description, vertical_id, start_date, end_date, budget, spent_amount, status, manager_user_id, location, beneficiary_target, beneficiary_reached, created_by) VALUES
(1, 'Digital Literacy for Rural Schools', 'EDU-DL-2024', 'Providing computer education and digital skills to students in rural schools', 1, '2024-01-15', '2024-12-31', 1500000.00, 450000.00, 'active', 2, 'Rural districts of Maharashtra', 500, 180, 2),
(2, 'Adult Literacy Campaign', 'EDU-AL-2024', 'Teaching basic reading and writing skills to adults', 1, '2024-02-01', '2024-11-30', 800000.00, 320000.00, 'active', 2, 'Madhya Pradesh villages', 300, 125, 2),
(3, 'Mobile Health Clinics', 'HLT-MHC-2024', 'Regular health checkups and basic treatment in remote areas', 2, '2024-01-01', '2024-12-31', 2000000.00, 750000.00, 'active', 3, 'Remote villages across 5 states', 1000, 420, 3),
(4, 'Women Entrepreneurship Program', 'LVL-WEP-2024', 'Training and seed funding for women entrepreneurs', 3, '2024-03-01', '2024-10-31', 1200000.00, 280000.00, 'active', 4, 'Urban slums in major cities', 100, 45, 4),
(5, 'Skill Development Center', 'LVL-SDC-2024', 'Vocational training in tailoring, beautician, and computer courses', 3, '2024-02-15', '2025-02-14', 900000.00, 180000.00, 'active', 4, 'District headquarters', 200, 85, 4);

-- ============================================
-- 6. PROGRAM KPIS DATA
-- ============================================
INSERT INTO program_kpis (program_id, kpi_name, description, target_value, current_value, unit, measurement_frequency, status) VALUES
(1, 'Students Trained', 'Number of students who completed the digital literacy course', 500, 180, 'students', 'monthly', 'on_track'),
(1, 'Schools Covered', 'Number of schools where program is implemented', 25, 12, 'schools', 'quarterly', 'on_track'),
(2, 'Adults Certified', 'Number of adults who passed the literacy test', 300, 125, 'adults', 'monthly', 'on_track'),
(3, 'Patients Treated', 'Total patients who received medical treatment', 1000, 420, 'patients', 'monthly', 'on_track'),
(3, 'Health Camps Organized', 'Number of health camps conducted', 48, 18, 'camps', 'weekly', 'on_track'),
(4, 'Women Entrepreneurs', 'Number of women who started their business', 100, 45, 'women', 'monthly', 'on_track'),
(4, 'Businesses Sustainable', 'Number of businesses running for 3+ months', 70, 28, 'businesses', 'quarterly', 'on_track'),
(5, 'Students Enrolled', 'Total students enrolled in vocational courses', 200, 85, 'students', 'monthly', 'on_track');

-- ============================================
-- 7. DONATIONS DATA
-- ============================================
INSERT INTO donations (id, donation_number, donor_id, donation_date, amount, currency, payment_method, payment_reference, payment_status, donation_type, campaign, purpose, tax_exemption_claimed, receipt_number, receipt_issued_date, vertical_id, program_id, received_by) VALUES
(1, 'DON202400001', 1, '2024-01-15', 100000.00, 'INR', 'bank_transfer', 'TXN123456789', 'received', 'one_time', 'Education for All', 'Support digital literacy program', TRUE, 'REC2024000001', '2024-01-16', 1, 1, 1),
(2, 'DON202400002', 2, '2024-02-01', 500000.00, 'INR', 'bank_transfer', 'CSR2024001', 'received', 'one_time', 'Corporate CSR', 'General support for health programs', TRUE, 'REC2024000002', '2024-02-02', 2, NULL, 1),
(3, 'DON202400003', 3, '2024-02-15', 250000.00, 'INR', 'cheque', 'CHQ789012', 'received', 'one_time', 'Foundation Grant', 'Women empowerment initiative', TRUE, 'REC2024000003', '2024-02-16', 3, 4, 1),
(4, 'DON202400004', 1, '2024-03-01', 50000.00, 'INR', 'online', 'RAZORPAY123', 'received', 'recurring', 'Monthly Giving', 'Unrestricted donation', TRUE, 'REC2024000004', '2024-03-02', NULL, NULL, 1),
(5, 'DON202400005', 2, '2024-03-20', 300000.00, 'INR', 'bank_transfer', 'CSR2024002', 'received', 'one_time', 'Corporate CSR', 'Mobile health clinic support', TRUE, 'REC2024000005', '2024-03-21', 2, 3, 1);

-- ============================================
-- 8. DONATION ALLOCATIONS DATA
-- ============================================
INSERT INTO donation_allocations (donation_id, vertical_id, program_id, amount, allocation_percentage) VALUES
(1, 1, 1, 100000.00, 100.00),
(2, 2, NULL, 500000.00, 100.00),
(3, 3, 4, 250000.00, 100.00),
(4, 1, NULL, 15000.00, 30.00),
(4, 2, NULL, 20000.00, 40.00),
(4, 3, NULL, 15000.00, 30.00),
(5, 2, 3, 300000.00, 100.00);

-- ============================================
-- 9. VOLUNTEERS DATA
-- ============================================
INSERT INTO volunteers (id, contact_id, volunteer_id, join_date, tier, total_hours, skills, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, blood_group, tshirt_size, insurance_policy_number, insurance_provider, insurance_expiry, orientation_completed, orientation_date, status, created_by) VALUES
(1, 4, 'VOL2024001', '2024-01-10', 'tier_2', 65.00, '["Teaching", "Computer Skills", "Content Creation"]', 'Ramesh Desai', '+91-9876601001', 'Father', 'O+', 'M', 'INS2024001', 'National Insurance Co', '2024-12-31', TRUE, '2024-01-10', 'active', 2),
(2, 5, 'VOL2024002', '2024-01-20', 'tier_3', 125.00, '["Medical Assistant", "First Aid", "Health Education"]', 'Manjula Reddy', '+91-9876601002', 'Mother', 'B+', 'L', 'INS2024002', 'National Insurance Co', '2024-12-31', TRUE, '2024-01-20', 'active', 3),
(3, 10, 'VOL2024003', '2024-02-01', 'tier_1', 28.00, '["Accounting", "Data Entry", "Documentation"]', 'Meena Kapoor', '+91-9876601003', 'Sister', 'A+', 'M', 'INS2024003', 'National Insurance Co', '2024-12-31', TRUE, '2024-02-01', 'active', 4),
(4, 4, 'VOL2024004', '2023-06-15', 'tier_4', 245.00, '["Project Management", "Training", "Coordination"]', 'Rajiv Kumar', '+91-9876601004', 'Spouse', 'AB+', 'L', 'INS2024004', 'National Insurance Co', '2024-12-31', TRUE, '2023-06-15', 'active', 2),
(5, 10, 'VOL2024005', '2024-02-20', 'tier_1', 18.00, '["Photography", "Social Media", "Event Management"]', 'Sunil Kapoor', '+91-9876601005', 'Father', 'O+', 'M', 'INS2024005', 'National Insurance Co', '2024-12-31', TRUE, '2024-02-20', 'active', 1);

-- ============================================
-- 10. VOLUNTEER ACTIVITIES DATA
-- ============================================
INSERT INTO volunteer_activities (volunteer_id, activity_date, program_id, vertical_id, activity_type, hours, description, supervisor_user_id, verified, verified_by, verified_at) VALUES
(1, '2024-03-01', 1, 1, 'Teaching Session', 8.00, 'Conducted computer basics class for 30 students', 2, TRUE, 2, '2024-03-02 10:00:00'),
(1, '2024-03-08', 1, 1, 'Teaching Session', 8.00, 'Taught MS Office applications', 2, TRUE, 2, '2024-03-09 10:00:00'),
(2, '2024-03-05', 3, 2, 'Health Camp', 10.00, 'Assisted doctors in mobile health clinic', 3, TRUE, 3, '2024-03-06 10:00:00'),
(2, '2024-03-12', 3, 2, 'Health Camp', 10.00, 'Health screening and basic checkups', 3, TRUE, 3, '2024-03-13 10:00:00'),
(3, '2024-03-10', NULL, 3, 'Administrative Work', 6.00, 'Data entry for livelihood program', 4, TRUE, 4, '2024-03-11 10:00:00'),
(4, '2024-03-02', 1, 1, 'Event Coordination', 12.00, 'Organized program inauguration event', 2, TRUE, 2, '2024-03-03 10:00:00'),
(5, '2024-03-15', 4, 3, 'Photography', 5.00, 'Photo documentation of women entrepreneur training', 4, TRUE, 4, '2024-03-16 10:00:00');

-- ============================================
-- 11. STAFF DATA
-- ============================================
INSERT INTO staff (id, user_id, employee_id, join_date, employment_type, designation, department, salary, pan_number, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, blood_group, date_of_birth, status, created_by) VALUES
(1, 2, 'EMP2023001', '2023-04-01', 'full_time', 'Education Vertical Lead', 'Education', 60000.00, 'ABCPS1234E', 'Mohan Sharma', '+91-9876701001', 'Father', 'A+', '1990-06-15', 'active', 1),
(2, 3, 'EMP2023002', '2023-04-01', 'full_time', 'Health Vertical Lead', 'Health & Nutrition', 60000.00, 'ABCPP1234F', 'Geeta Patel', '+91-9876701002', 'Mother', 'B+', '1988-08-20', 'active', 1),
(3, 4, 'EMP2023003', '2023-05-01', 'full_time', 'Livelihood Vertical Lead', 'Livelihood', 60000.00, 'ABCPG1234G', 'Rajesh Gupta', '+91-9876701003', 'Father', 'O+', '1992-03-10', 'active', 1),
(4, 5, 'EMP2023004', '2023-06-15', 'full_time', 'Program Officer', 'Education', 35000.00, 'ABCPSI234H', 'Kavita Singh', '+91-9876701004', 'Mother', 'AB+', '1995-11-25', 'active', 2);

-- ============================================
-- 12. VENDORS DATA
-- ============================================
INSERT INTO vendors (contact_id, vendor_code, category, payment_terms, credit_period, credit_limit, rating, status, created_by) VALUES
(6, 'VEN2024001', 'Stationery & Office Supplies', 'Net 30 days', 30, 50000.00, 4.50, 'active', 1),
(7, 'VEN2024002', 'Catering & Food Services', 'Advance Payment', 0, 0.00, 4.20, 'active', 1);

-- ============================================
-- 13. PURCHASE ORDERS DATA
-- ============================================
INSERT INTO purchase_orders (po_number, vendor_id, po_date, expected_delivery_date, vertical_id, program_id, total_amount, tax_amount, net_amount, status, approved_by, approved_at, created_by) VALUES
('PO202400001', 1, '2024-03-01', '2024-03-10', 1, 1, 50000.00, 9000.00, 59000.00, 'received', 1, '2024-03-01 15:00:00', 2),
('PO202400002', 2, '2024-03-15', '2024-03-20', 2, 3, 15000.00, 0.00, 15000.00, 'ordered', 1, '2024-03-15 14:00:00', 3);

-- ============================================
-- 14. PURCHASE ORDER ITEMS DATA
-- ============================================
INSERT INTO purchase_order_items (po_id, item_description, quantity, unit, unit_price, total_price, tax_rate, received_quantity) VALUES
(1, 'Laptop computers for digital literacy program', 10, 'pieces', 35000.00, 350000.00, 18.00, 10),
(1, 'Computer accessories kit', 10, 'sets', 2000.00, 20000.00, 18.00, 10),
(1, 'Educational software licenses', 10, 'licenses', 8000.00, 80000.00, 18.00, 10),
(2, 'Catering for health camp (100 people)', 1, 'event', 15000.00, 15000.00, 0.00, 0);

-- ============================================
-- 15. EXPENSES DATA
-- ============================================
INSERT INTO expenses (expense_number, expense_date, category, amount, vertical_id, program_id, payment_method, bill_number, description, claimed_by, status, approved_by, approved_at) VALUES
('EXP202400001', '2024-03-05', 'Travel', 2500.00, 1, 1, 'cash', 'BILL001', 'Travel to rural schools for program monitoring', 2, 'approved', 1, '2024-03-06 10:00:00'),
('EXP202400002', '2024-03-10', 'Office Supplies', 1200.00, NULL, NULL, 'card', 'BILL002', 'Stationery for office use', 5, 'approved', 2, '2024-03-11 10:00:00'),
('EXP202400003', '2024-03-15', 'Utilities', 3500.00, NULL, NULL, 'bank_transfer', 'BILL003', 'Electricity bill for office', 1, 'approved', 1, '2024-03-16 10:00:00'),
('EXP202400004', '2024-03-20', 'Training Material', 5000.00, 3, 4, 'cash', 'BILL004', 'Training materials for women entrepreneur program', 4, 'approved', 1, '2024-03-21 10:00:00'),
('EXP202400005', '2024-03-22', 'Travel', 1800.00, 2, 3, 'upi', 'BILL005', 'Travel to health camp location', 3, 'pending', NULL, NULL);

-- ============================================
-- 16. BENEFICIARIES DATA
-- ============================================
INSERT INTO beneficiaries (contact_id, beneficiary_id, vertical_id, program_id, enrollment_date, household_size, category, guardian_name, guardian_phone, status, created_by) VALUES
(9, 'BEN2024001', 3, 4, '2024-03-01', 4, 'below_poverty_line', 'Ramesh Devi', '+91-9876801001', 'active', 4);

-- ============================================
-- 17. SAFEGUARDING RECORDS DATA (Sample)
-- ============================================
INSERT INTO safeguarding_records (incident_number, title, incident_date, reported_date, incident_type, severity, location, description, immediate_action_taken, status, reported_by, vertical_id, confidential, external_authority_notified) VALUES
('INC-2024-0001', 'Inappropriate behavior at Program Site', '2024-02-15', '2024-02-15', 'misconduct', 'medium', 'Program Site - Village XYZ', 'Inappropriate behavior observed during program activity', 'Person removed from activity immediately, investigation initiated', 'under_investigation', 1, 1, TRUE, FALSE);

-- ============================================
-- 18. SAFEGUARDING ACCESS LOG DATA
-- ============================================
INSERT INTO safeguarding_access_log (record_id, accessed_by, access_type, ip_address, access_reason) VALUES
(1, 1, 'view', '192.168.1.100', 'Initial investigation review'),
(1, 1, 'edit', '192.168.1.100', 'Updated investigation status');

-- ============================================
-- 19. AUDIT LOGS DATA (Sample)
-- ============================================
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address) VALUES
(1, 'LOGIN', 'users', 1, '{"login_time": "2024-03-25 09:00:00"}', '192.168.1.100'),
(2, 'CREATE', 'donations', 1, '{"amount": 100000, "donor_id": 1}', '192.168.1.101'),
(3, 'UPDATE', 'programs', 3, '{"beneficiary_reached": 420}', '192.168.1.102'),
(4, 'CREATE', 'volunteers', 3, '{"volunteer_id": "VOL2024003"}', '192.168.1.103'),
(5, 'CREATE', 'expenses', 2, '{"amount": 1200, "category": "Office Supplies"}', '192.168.1.104');

-- ============================================
-- 20. DOCUMENTS DATA (Sample)
-- ============================================
INSERT INTO documents (entity_type, entity_id, document_type, file_name, file_path, file_size, mime_type, description, uploaded_by, is_public) VALUES
('donations', 1, 'Payment Receipt', 'payment_receipt_don_001.pdf', '/uploads/donations/2024/01/payment_receipt_don_001.pdf', 245678, 'application/pdf', 'Bank transfer receipt for donation DON202400001', 1, FALSE),
('volunteers', 1, 'ID Proof', 'volunteer_aadhar_001.pdf', '/uploads/volunteers/2024/01/volunteer_aadhar_001.pdf', 189234, 'application/pdf', 'Aadhar card copy for volunteer verification', 2, FALSE),
('staff', 1, 'Resume', 'staff_resume_001.pdf', '/uploads/staff/2023/04/staff_resume_001.pdf', 567890, 'application/pdf', 'Resume of employee EMP2023001', 1, FALSE);

-- ============================================
-- 21. NOTIFICATIONS DATA (Sample)
-- ============================================
INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id, is_read) VALUES
(2, 'New Donation Received', 'A donation of ₹100,000 has been received for your vertical', 'success', 'donations', 1, TRUE),
(3, 'Program KPI Update Required', 'Please update the KPIs for Mobile Health Clinics program', 'warning', 'programs', 3, FALSE),
(4, 'New Volunteer Registration', 'A new volunteer has registered for livelihood programs', 'info', 'volunteers', 3, FALSE),
(1, 'Expense Approval Pending', 'Travel expense EXP202400005 is pending your approval', 'warning', 'expenses', 5, FALSE),
(2, 'Purchase Order Delivered', 'Purchase order PO202400001 has been delivered', 'success', 'purchase_orders', 1, TRUE);

-- ============================================
-- 22. COMMUNICATION LOG DATA (Sample)
-- ============================================
INSERT INTO communication_log (contact_id, communication_type, direction, subject, message, status, created_by) VALUES
(1, 'email', 'outbound', 'Thank You for Your Generous Donation', 'Dear Mr. Malhotra, Thank you for your generous donation of ₹100,000...', 'sent', 1),
(2, 'email', 'outbound', 'Corporate Partnership Proposal', 'Dear TechCorp Team, We would like to present our programs for your CSR consideration...', 'delivered', 1),
(4, 'phone', 'outbound', 'Volunteer Activity Confirmation', 'Called to confirm volunteer availability for next week teaching session', 'responded', 2),
(5, 'whatsapp', 'outbound', 'Health Camp Schedule', 'Shared schedule and location details for upcoming health camp', 'delivered', 3);

-- ============================================
-- 23. ATTENDANCE DATA (Sample - Last 5 days for one staff member)
-- ============================================
INSERT INTO attendance (staff_id, attendance_date, check_in, check_out, status, work_hours, location) VALUES
(4, '2024-03-18', '09:15:00', '18:00:00', 'present', 8.75, 'Office'),
(4, '2024-03-19', '09:00:00', '18:15:00', 'present', 9.25, 'Office'),
(4, '2024-03-20', '09:30:00', '14:00:00', 'half_day', 4.50, 'Field'),
(4, '2024-03-21', '09:00:00', '18:00:00', 'present', 9.00, 'Office'),
(4, '2024-03-22', '09:10:00', '18:05:00', 'present', 8.92, 'Office');

-- ============================================
-- 24. LEAVE RECORDS DATA (Sample)
-- ============================================
INSERT INTO leave_records (staff_id, leave_type, start_date, end_date, total_days, reason, status, approved_by, approved_at) VALUES
(4, 'casual', '2024-03-25', '2024-03-25', 1.0, 'Personal work', 'approved', 2, '2024-03-20 10:00:00'),
(1, 'earned', '2024-04-10', '2024-04-15', 6.0, 'Family vacation', 'approved', 1, '2024-03-15 14:00:00');

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify the data was inserted correctly

-- SELECT COUNT(*) as role_count FROM roles;
-- SELECT COUNT(*) as user_count FROM users;
-- SELECT COUNT(*) as vertical_count FROM verticals;
-- SELECT COUNT(*) as contact_count FROM contacts;
-- SELECT COUNT(*) as donation_count FROM donations;
-- SELECT COUNT(*) as program_count FROM programs;
-- SELECT COUNT(*) as volunteer_count FROM volunteers;
-- SELECT COUNT(*) as staff_count FROM staff;

-- View donation summary
-- SELECT * FROM v_donation_summary;

-- View active users
-- SELECT * FROM v_active_users;

-- View program dashboard
-- SELECT * FROM v_program_dashboard;

-- ============================================
-- SEED DATA COMPLETE
-- ============================================
-- Summary:
-- - 3 Roles (Super Admin, Vertical Lead, Staff)
-- - 5 Users (1 Super Admin, 3 Vertical Leads, 1 Staff)
-- - 3 Verticals (Education, Health, Livelihood)
-- - 10 Contacts (3 Donors, 3 Volunteers, 2 Vendors, 1 Partner, 1 Beneficiary)
-- - 5 Donations with allocations
-- - 5 Programs with KPIs
-- - 5 Volunteers with activities
-- - 4 Staff members with attendance and leave records
-- - 2 Vendors with purchase orders
-- - 5 Expenses
-- - Sample data for all supporting tables
-- ============================================
