-- Fee Plans Table
CREATE TABLE IF NOT EXISTS fee_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  fee_type ENUM('membership', 'service', 'processing', 'administrative') NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  billing_frequency ENUM('monthly', 'quarterly', 'yearly', 'one_time') DEFAULT 'monthly',
  vertical_id INT,
  is_template BOOLEAN DEFAULT FALSE,
  template_category VARCHAR(100),
  billing_day INT DEFAULT 1,
  due_day INT DEFAULT 5,
  grace_period_days INT DEFAULT 7,
  late_fee_amount DECIMAL(15, 2) DEFAULT 0,
  created_by INT NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_fee_plans_vertical ON fee_plans(vertical_id);
CREATE INDEX idx_fee_plans_status ON fee_plans(status);
CREATE INDEX idx_fee_plans_template ON fee_plans(is_template, template_category);

-- Fees Table
CREATE TABLE IF NOT EXISTS fees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT NOT NULL,
  fee_plan_id INT,
  vertical_id INT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  original_amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  description VARCHAR(500) NOT NULL,
  due_date DATE NOT NULL,
  billing_period_start DATE,
  billing_period_end DATE,
  status ENUM('pending', 'paid', 'partial', 'overdue', 'waived', 'deleted') DEFAULT 'pending',
  total_paid DECIMAL(15, 2) DEFAULT 0,
  waived_amount DECIMAL(15, 2) DEFAULT 0,
  subsidy_applied DECIMAL(15, 2) DEFAULT 0,
  previous_amount DECIMAL(15, 2),
  amount_change_reason VARCHAR(500),
  status_change_notes VARCHAR(500),
  created_by INT NOT NULL,
  updated_by INT,
  deleted_by INT,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (fee_plan_id) REFERENCES fee_plans(id) ON DELETE SET NULL,
  FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_fees_contact ON fees(contact_id);
CREATE INDEX idx_fees_vertical ON fees(vertical_id);
CREATE INDEX idx_fees_status ON fees(status);
CREATE INDEX idx_fees_due_date ON fees(due_date);
CREATE INDEX idx_fees_created_at ON fees(created_at);

-- Fee Payments Table
CREATE TABLE IF NOT EXISTS fee_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fee_id INT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('cash', 'cheque', 'bank_transfer', 'online', 'upi', 'card') NOT NULL,
  reference VARCHAR(100),
  notes VARCHAR(500),
  processed_by INT NOT NULL,
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_fee_payments_fee ON fee_payments(fee_id);
CREATE INDEX idx_fee_payments_date ON fee_payments(payment_date);
CREATE INDEX idx_fee_payments_method ON fee_payments(payment_method);
CREATE INDEX idx_fee_payments_status ON fee_payments(status);

-- Fee Waivers Table
CREATE TABLE IF NOT EXISTS fee_waivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fee_id INT NOT NULL,
  contact_id INT NOT NULL,
  waiver_type ENUM('hardship', 'medical', 'administrative', 'other') NOT NULL,
  reason TEXT NOT NULL,
  requested_amount DECIMAL(15, 2) NOT NULL,
  notes VARCHAR(500),
  status ENUM('pending', 'approved', 'rejected', 'deleted') DEFAULT 'pending',
  reviewed_by INT,
  reviewed_at TIMESTAMP NULL,
  review_notes VARCHAR(500),
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_fee_waivers_fee ON fee_waivers(fee_id);
CREATE INDEX idx_fee_waivers_contact ON fee_waivers(contact_id);
CREATE INDEX idx_fee_waivers_status ON fee_waivers(status);
CREATE INDEX idx_fee_waivers_type ON fee_waivers(waiver_type);
CREATE INDEX idx_fee_waivers_created_at ON fee_waivers(created_at);

-- Subsidies Table
CREATE TABLE IF NOT EXISTS subsidies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT NOT NULL,
  vertical_id INT NOT NULL,
  program_id INT,
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  subsidy_type ENUM('needs_based', 'merit_based', 'emergency', 'program_specific') NOT NULL,
  description VARCHAR(500),
  eligibility_criteria VARCHAR(500),
  start_date DATE,
  end_date DATE,
  allocated_by INT NOT NULL,
  status ENUM('active', 'expired', 'suspended', 'deleted') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (vertical_id) REFERENCES verticals(id) ON DELETE RESTRICT,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
  FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_subsidies_contact ON subsidies(contact_id);
CREATE INDEX idx_subsidies_vertical ON subsidies(vertical_id);
CREATE INDEX idx_subsidies_program ON subsidies(program_id);
CREATE INDEX idx_subsidies_status ON subsidies(status);
CREATE INDEX idx_subsidies_type ON subsidies(subsidy_type);

-- Subsidy Allocations Table
CREATE TABLE IF NOT EXISTS subsidy_allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subsidy_id INT NOT NULL,
  fee_id INT NOT NULL,
  allocated_amount DECIMAL(15, 2) NOT NULL,
  allocated_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subsidy_id) REFERENCES subsidies(id) ON DELETE CASCADE,
  FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE,
  FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_subsidy_allocations_subsidy ON subsidy_allocations(subsidy_id);
CREATE INDEX idx_subsidy_allocations_fee ON subsidy_allocations(fee_id);

-- Add fee-related columns to audit_logs if they don't exist
ALTER TABLE audit_logs 
MODIFY COLUMN entity_type ENUM(
  'user', 'donation', 'allocation', 'program', 'volunteer', 
  'contact', 'staff', 'fee_plan', 'fee', 'fee_payment', 
  'fee_waiver', 'subsidy', 'subsidy_allocation'
) DEFAULT NULL;

-- Insert sample fee plans
INSERT INTO fee_plans (
  name, description, fee_type, amount, billing_frequency, 
  vertical_id, is_template, template_category, created_by
) VALUES
  ('Standard Membership', 'Annual membership fee with standard benefits', 'membership', 5000.00, 'yearly', NULL, TRUE, 'membership', 1),
  ('Premium Membership', 'Premium annual membership with extended benefits', 'membership', 10000.00, 'yearly', NULL, TRUE, 'membership', 1),
  ('Processing Fee', 'Standard processing fee for applications', 'processing', 500.00, 'one_time', NULL, TRUE, 'processing', 1),
  ('Administrative Fee', 'Administrative services fee', 'administrative', 1000.00, 'monthly', NULL, TRUE, 'administrative', 1);