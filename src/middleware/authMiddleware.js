import jwt from 'jsonwebtoken';
import { config } from '../config/environment.js';
import { executeQuery } from '../config/database.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
    });
  }
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const userQuery = 'SELECT id, email, role_id, vertical_id, status FROM users WHERE id = ? AND status = "active"';
    const users = await executeQuery(userQuery, [decoded.userId]);
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      roleId: decoded.roleId,
      verticalId: decoded.verticalId,
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token',
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const userQuery = 'SELECT id, email, role_id, vertical_id, status FROM users WHERE id = ? AND status = "active"';
    const users = await executeQuery(userQuery, [decoded.userId]);
    
    req.user = users.length > 0 ? {
      id: decoded.userId,
      email: decoded.email,
      roleId: decoded.roleId,
      verticalId: decoded.verticalId,
    } : null;
  } catch (error) {
    req.user = null;
  }
  
  next();
};

export const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

export default {
  authenticateToken,
  optionalAuth,
  generateToken,
  generateRefreshToken,
};
