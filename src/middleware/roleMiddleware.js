import { executeQuery } from '../config/database.js';

const rolePermissions = {
  1: { // Super Admin
    users: { read: true, write: true, delete: true },
    donations: { read: true, write: true, delete: true },
    programs: { read: true, write: true, delete: true },
    volunteers: { read: true, write: true, delete: true },
    staff: { read: true, write: true, delete: true },
    reports: { read: true, export: true },
    settings: { read: true, write: true },
    safeguarding: { read: true, write: true },
  },
  2: { // Vertical Lead
    users: { read: true, write: false, delete: false },
    donations: { read: true, write: true, delete: false },
    programs: { read: true, write: true, delete: false },
    volunteers: { read: true, write: true, delete: false },
    staff: { read: true, write: false, delete: false },
    reports: { read: true, export: true },
    settings: { read: false, write: false },
    safeguarding: { read: true, write: false },
  },
  3: { // Staff
    users: { read: true, write: false, delete: false },
    donations: { read: true, write: false, delete: false },
    programs: { read: true, write: false, delete: false },
    volunteers: { read: true, write: false, delete: false },
    staff: { read: false, write: false, delete: false },
    reports: { read: true, export: false },
    settings: { read: false, write: false },
    safeguarding: { read: false, write: false },
  },
};

export const requirePermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }
    
    const roleId = req.user.roleId;
    const permissions = rolePermissions[roleId];
    
    if (!permissions) {
      return res.status(403).json({
        success: false,
        message: 'Invalid role configuration',
      });
    }
    
    const resourcePermissions = permissions[resource];
    
    if (!resourcePermissions) {
      return res.status(403).json({
        success: false,
        message: `Access to ${resource} is not permitted`,
      });
    }
    
    if (!resourcePermissions[action]) {
      return res.status(403).json({
        success: false,
        message: `Action '${action}' on ${resource} is not permitted`,
      });
    }
    
    next();
  };
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }
    
    if (!allowedRoles.includes(req.user.roleId)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }
    
    next();
  };
};

export const requireVerticalAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }
  
  if (req.user.roleId === 1) {
    return next();
  }
  
  const requestedVerticalId = req.params.verticalId || req.body.vertical_id;
  
  if (requestedVerticalId && requestedVerticalId !== req.user.verticalId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this vertical',
    });
  }
  
  req.verticalId = req.user.verticalId;
  next();
};

export const checkOwnership = (resourceType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }
    
    if (req.user.roleId === 1) {
      return next();
    }
    
    const resourceId = req.params.id || req.params[`${resourceType}Id`];
    
    try {
      const tableMap = {
        user: 'users',
        donation: 'donations',
        program: 'programs',
        volunteer: 'volunteers',
        staff: 'staff',
      };
      
      const table = tableMap[resourceType];
      if (!table) {
        return next();
      }
      
      const query = `SELECT vertical_id FROM ${table} WHERE id = ?`;
      const results = await executeQuery(query, [resourceId]);
      
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: `${resourceType} not found`,
        });
      }
      
      if (results[0].vertical_id !== req.user.verticalId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource',
        });
      }
      
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
      });
    }
  };
};

export default {
  requirePermission,
  requireRole,
  requireVerticalAccess,
  checkOwnership,
};
