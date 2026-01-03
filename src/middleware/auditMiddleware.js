import AuditLog from '../models/AuditLog.js';

export const auditMiddleware = async (req, res, next) => {
  // We only log non-GET requests as they modify state
  // Or we log GET requests if they are for sensitive data like safeguarding
  const isSensitiveGet = req.method === 'GET' && req.originalUrl.includes('/api/safeguarding');
  const isModifyAction = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

  if (!isModifyAction && !isSensitiveGet) {
    return next();
  }

  // Intercept the finish event to log after the request is processed
  res.on('finish', async () => {
    // Only log successful or somewhat successful requests (not if they failed validation/auth before reaching here)
    if (res.statusCode >= 400 && res.statusCode !== 403 && res.statusCode !== 404) {
      return;
    }

    try {
      const urlParts = req.originalUrl.split('/');
      const apiIndex = urlParts.indexOf('api');
      let entityType = 'unknown';
      let entityId = null;

      if (apiIndex !== -1 && urlParts.length > apiIndex + 1) {
        entityType = urlParts[apiIndex + 1];
        if (urlParts.length > apiIndex + 2 && !isNaN(urlParts[apiIndex + 2])) {
          entityId = parseInt(urlParts[apiIndex + 2]);
        }
      }

      // Skip logging the audit logs themselves to avoid recursion
      if (entityType === 'audit-logs') {
        return;
      }

      let action = req.method;
      if (req.method === 'POST') action = 'CREATE';
      if (req.method === 'PUT' || req.method === 'PATCH') action = 'UPDATE';
      if (req.method === 'DELETE') action = 'DELETE';
      if (req.method === 'GET') action = 'VIEW';

      await AuditLog.create({
        user_id: req.user ? req.user.id : null,
        action,
        entity_type: entityType,
        entity_id: entityId,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        request_url: req.originalUrl,
        // For updates, we might want to capture more, but that's better done in controllers
        // where we have access to old and new values.
        // This middleware is for general tracking.
      });
    } catch (error) {
      console.error('Audit middleware logging failed:', error);
    }
  });

  next();
};

export default auditMiddleware;
