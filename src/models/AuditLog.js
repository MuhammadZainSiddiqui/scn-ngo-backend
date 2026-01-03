import { executeQuery } from '../config/database.js';

export const AuditLog = {
  async create(logData) {
    const query = `
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, 
        old_values, new_values, ip_address, user_agent, request_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      logData.user_id || null,
      logData.action,
      logData.entity_type,
      logData.entity_id || null,
      logData.old_values ? JSON.stringify(logData.old_values) : null,
      logData.new_values ? JSON.stringify(logData.new_values) : null,
      logData.ip_address || null,
      logData.user_agent || null,
      logData.request_url || null
    ];

    return executeQuery(query, params);
  }
};

export default AuditLog;
