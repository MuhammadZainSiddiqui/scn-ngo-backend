import { executeQuery } from './src/config/database.js';

async function migrate() {
  try {
    console.log('Starting migration...');
    
    // Create contact_types table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS contact_types (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('contact_types table created/verified.');

    // Seed contact types
    const types = ['Donor', 'Volunteer', 'Vendor', 'Partner', 'Staff', 'Beneficiary'];
    for (const type of types) {
      await executeQuery('INSERT IGNORE INTO contact_types (name) VALUES (?)', [type]);
    }
    console.log('contact_types seeded.');

    // Check if contact_type_id column exists in contacts
    const columns = await executeQuery('SHOW COLUMNS FROM contacts LIKE "contact_type_id"');
    if (columns.length === 0) {
      await executeQuery('ALTER TABLE contacts ADD COLUMN contact_type_id INT UNSIGNED AFTER id');
      console.log('contact_type_id column added to contacts.');
      
      // Map existing types to IDs
      const typesMap = {
        'donor': 'Donor',
        'volunteer': 'Volunteer',
        'vendor': 'Vendor',
        'partner': 'Partner',
        'beneficiary': 'Beneficiary'
      };

      for (const [oldType, newTypeName] of Object.entries(typesMap)) {
        await executeQuery(`
          UPDATE contacts SET contact_type_id = (SELECT id FROM contact_types WHERE name = ?) WHERE type = ?
        `, [newTypeName, oldType]);
      }
      console.log('Existing contacts migrated to contact_type_id.');

      await executeQuery('ALTER TABLE contacts ADD CONSTRAINT fk_contacts_type FOREIGN KEY (contact_type_id) REFERENCES contact_types(id)');
      console.log('Foreign key constraint added.');
    } else {
      console.log('contact_type_id column already exists.');
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
