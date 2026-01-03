import { executeQuery } from '../config/database.js';
import { generateAccessToken, generateRefreshToken as signRefreshToken, verifyJwtToken } from '../config/jwt.js';

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token;
};

export const verifyToken = async (req, res, next) => {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
    });
  }

  try {
    const decoded = verifyJwtToken(token);

    if (decoded?.tokenType && decoded.tokenType !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type',
      });
    }

    const userQuery =
      'SELECT id, email, role_id, vertical_id, status FROM users WHERE id = ? AND status = "active"';
    const users = await executeQuery(userQuery, [decoded.userId]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    const user = users[0];

    req.user = {
      id: user.id,
      email: user.email,
      roleId: user.role_id,
      verticalId: user.vertical_id,
      role_id: user.role_id,
      vertical_id: user.vertical_id,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }

    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({
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

export const authenticateToken = verifyToken;

export const optionalAuth = async (req, res, next) => {
  const token = extractBearerToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyJwtToken(token);

    if (decoded?.tokenType && decoded.tokenType !== 'access') {
      req.user = null;
      return next();
    }

    const userQuery =
      'SELECT id, email, role_id, vertical_id, status FROM users WHERE id = ? AND status = "active"';
    const users = await executeQuery(userQuery, [decoded.userId]);

    req.user = users.length
      ? {
          id: users[0].id,
          email: users[0].email,
          roleId: users[0].role_id,
          verticalId: users[0].vertical_id,
          role_id: users[0].role_id,
          vertical_id: users[0].vertical_id,
        }
      : null;
  } catch {
    req.user = null;
  }

  next();
};

export const generateToken = (payload) => {
  return generateAccessToken(payload);
};

export const generateRefreshToken = (payload) => {
  return signRefreshToken(payload);
};

export default {
  verifyToken,
  authenticateToken,
  optionalAuth,
  generateToken,
  generateRefreshToken,
};
