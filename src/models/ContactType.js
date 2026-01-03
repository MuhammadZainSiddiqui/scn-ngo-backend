import { executeQuery } from '../config/database.js';

export const ContactType = {
  async findAll() {
    const query = 'SELECT * FROM contact_types ORDER BY name ASC';
    return executeQuery(query);
  },

  async findById(id) {
    const query = 'SELECT * FROM contact_types WHERE id = ?';
    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async create(typeData) {
    const query = 'INSERT INTO contact_types (name, description) VALUES (?, ?)';
    const result = await executeQuery(query, [typeData.name, typeData.description || null]);
    return { id: result.insertId, ...typeData };
  },

  async findByName(name) {
    const query = 'SELECT * FROM contact_types WHERE name = ?';
    const results = await executeQuery(query, [name]);
    return results[0] || null;
  }
};

export default ContactType;
