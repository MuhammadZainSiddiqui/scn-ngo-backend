import { body } from 'express-validator';

import { executeQuery } from '../config/database.js';
import { generateAccessToken, generateRefreshToken, verifyJwtToken } from '../config/jwt.js';
import { verifyToken as verifyTokenMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler, errorResponse, successResponse } from '../middleware/errorHandler.js';
import { roleModel, userModel, verticalModel } from '../models/queryHelpers.js';
import { handleValidationErrors, loginValidation, registerValidation } from '../utils/validators.js';
import { comparePassword, formatUserResponse, getUserWithoutPassword, hashPassword } from '../utils/helpers.js';

const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
};

const loginAttempts = new Map();

const getRateLimitKey = (req, email) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  return `${ip}:${String(email || '').toLowerCase()}`;
};

const checkLoginRateLimit = (key) => {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry) return { blocked: false };

  if (entry.blockedUntil && now < entry.blockedUntil) {
    return { blocked: true, retryAfterMs: entry.blockedUntil - now };
  }

  if (now - entry.firstAttemptAt > LOGIN_RATE_LIMIT.windowMs) {
    loginAttempts.delete(key);
    return { blocked: false };
  }

  return { blocked: false };
};

const recordFailedLoginAttempt = (key) => {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now - entry.firstAttemptAt > LOGIN_RATE_LIMIT.windowMs) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now, blockedUntil: null });
    return { blocked: false, remaining: LOGIN_RATE_LIMIT.maxAttempts - 1 };
  }

  const count = entry.count + 1;
  const blocked = count >= LOGIN_RATE_LIMIT.maxAttempts;
  const blockedUntil = blocked ? now + LOGIN_RATE_LIMIT.blockMs : null;

  loginAttempts.set(key, { ...entry, count, blockedUntil });

  return {
    blocked,
    remaining: Math.max(0, LOGIN_RATE_LIMIT.maxAttempts - count),
    retryAfterMs: blockedUntil ? blockedUntil - now : null,
  };
};

const clearLoginAttempts = (key) => {
  loginAttempts.delete(key);
};

const logAuditEvent = async ({ req, userId, action, entityType = 'auth', entityId = null, oldValues = null, newValues = null }) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.get('user-agent') || null;
    const requestUrl = req.originalUrl || req.url;

    await executeQuery(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, request_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        userId || null,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ip,
        userAgent,
        requestUrl,
      ],
    );
  } catch (error) {
    console.error('Audit log write failed:', error.message);
  }
};

export const authController = {
  register: [
    registerValidation,
    asyncHandler(async (req, res) => {
      const { email, password, first_name, last_name, role_id, vertical_id } = req.body;

      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        await logAuditEvent({
          req,
          userId: existingUser.id,
          action: 'REGISTER_FAILED',
          entityType: 'users',
          entityId: existingUser.id,
          newValues: { reason: 'EMAIL_EXISTS', email },
        });
        return errorResponse(res, 409, 'Email already registered');
      }

      const passwordHash = await hashPassword(password, 10);

      const userData = {
        email,
        password: passwordHash,
        first_name,
        last_name,
        role_id: role_id || 3,
        vertical_id: vertical_id || null,
      };

      const user = await userModel.create(userData);

      await logAuditEvent({
        req,
        userId: user.id,
        action: 'REGISTER',
        entityType: 'users',
        entityId: user.id,
        newValues: { email: user.email, role_id: user.role_id, vertical_id: user.vertical_id },
      });

      successResponse(
        res,
        201,
        {
          user: formatUserResponse(getUserWithoutPassword(user)),
        },
        'Registration successful',
      );
    }),
  ],

  login: [
    loginValidation,
    asyncHandler(async (req, res) => {
      const { email, password } = req.body;

      const rateLimitKey = getRateLimitKey(req, email);
      const limitState = checkLoginRateLimit(rateLimitKey);

      if (limitState.blocked) {
        await logAuditEvent({
          req,
          userId: null,
          action: 'LOGIN_RATE_LIMITED',
          entityType: 'auth',
          entityId: null,
          newValues: { email },
        });

        return res.status(429).json({
          success: false,
          message: 'Too many login attempts. Please try again later.',
          retryAfterMs: limitState.retryAfterMs,
        });
      }

      const user = await userModel.findByEmail(email);
      if (!user) {
        recordFailedLoginAttempt(rateLimitKey);
        await logAuditEvent({
          req,
          userId: null,
          action: 'LOGIN_FAILED',
          entityType: 'auth',
          entityId: null,
          newValues: { reason: 'USER_NOT_FOUND', email },
        });
        return errorResponse(res, 401, 'Invalid credentials');
      }

      const storedHash = user.password || user.password_hash;
      const isPasswordValid = storedHash ? await comparePassword(password, storedHash) : false;

      if (!isPasswordValid) {
        const attempt = recordFailedLoginAttempt(rateLimitKey);
        await logAuditEvent({
          req,
          userId: user.id,
          action: 'LOGIN_FAILED',
          entityType: 'users',
          entityId: user.id,
          newValues: { reason: 'INVALID_PASSWORD', email, remaining: attempt.remaining },
        });

        if (attempt.blocked) {
          return res.status(429).json({
            success: false,
            message: 'Too many login attempts. Please try again later.',
            retryAfterMs: attempt.retryAfterMs,
          });
        }

        return errorResponse(res, 401, 'Invalid credentials');
      }

      if (user.status && user.status !== 'active') {
        await logAuditEvent({
          req,
          userId: user.id,
          action: 'LOGIN_FAILED',
          entityType: 'users',
          entityId: user.id,
          newValues: { reason: 'USER_INACTIVE', email },
        });
        return errorResponse(res, 403, 'Account is not active');
      }

      clearLoginAttempts(rateLimitKey);

      const role = await roleModel.findById(user.role_id);
      const vertical = user.vertical_id ? await verticalModel.findById(user.vertical_id) : null;

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        roleId: user.role_id,
        verticalId: user.vertical_id,
      };

      const token = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      await logAuditEvent({
        req,
        userId: user.id,
        action: 'LOGIN',
        entityType: 'users',
        entityId: user.id,
        newValues: { email: user.email },
      });

      successResponse(
        res,
        200,
        {
          token,
          refreshToken,
          user: {
            ...formatUserResponse(user, {
              role: role ? { id: role.id, name: role.name } : null,
            }),
            vertical_id: user.vertical_id,
            vertical: vertical ? { id: vertical.id, name: vertical.name } : null,
            first_name: user.first_name,
            last_name: user.last_name,
          },
        },
        'Login successful',
      );
    }),
  ],

  refreshToken: [
    body('refreshToken').notEmpty().withMessage('Refresh token required'),
    handleValidationErrors,
    asyncHandler(async (req, res) => {
      const { refreshToken } = req.body;

      try {
        const decoded = verifyJwtToken(refreshToken);

        if (decoded?.tokenType && decoded.tokenType !== 'refresh') {
          await logAuditEvent({
            req,
            userId: decoded?.userId,
            action: 'TOKEN_REFRESH_FAILED',
            entityType: 'auth',
            entityId: decoded?.userId,
            newValues: { reason: 'INVALID_TOKEN_TYPE' },
          });
          return errorResponse(res, 401, 'Invalid or expired refresh token');
        }

        const user = await userModel.findById(decoded.userId);
        if (!user || (user.status && user.status !== 'active')) {
          await logAuditEvent({
            req,
            userId: decoded?.userId,
            action: 'TOKEN_REFRESH_FAILED',
            entityType: 'users',
            entityId: decoded?.userId,
            newValues: { reason: 'USER_NOT_FOUND_OR_INACTIVE' },
          });
          return errorResponse(res, 401, 'Invalid or expired refresh token');
        }

        const tokenPayload = {
          userId: user.id,
          email: user.email,
          roleId: user.role_id,
          verticalId: user.vertical_id,
        };

        const newToken = generateAccessToken(tokenPayload);

        await logAuditEvent({
          req,
          userId: user.id,
          action: 'TOKEN_REFRESH',
          entityType: 'auth',
          entityId: user.id,
        });

        successResponse(res, 200, { token: newToken }, 'Token refreshed');
      } catch (error) {
        await logAuditEvent({
          req,
          userId: null,
          action: 'TOKEN_REFRESH_FAILED',
          entityType: 'auth',
          entityId: null,
          newValues: { reason: error.name || 'UNKNOWN' },
        });

        return errorResponse(res, 401, 'Invalid or expired refresh token');
      }
    }),
  ],

  logout: [
    verifyTokenMiddleware,
    asyncHandler(async (req, res) => {
      await logAuditEvent({
        req,
        userId: req.user?.id,
        action: 'LOGOUT',
        entityType: 'users',
        entityId: req.user?.id,
      });

      successResponse(res, 200, null, 'Logout successful');
    }),
  ],

  verifyToken: [
    verifyTokenMiddleware,
    asyncHandler(async (req, res) => {
      const user = await userModel.findById(req.user.id);

      if (!user) {
        await logAuditEvent({
          req,
          userId: req.user.id,
          action: 'VERIFY_TOKEN_FAILED',
          entityType: 'users',
          entityId: req.user.id,
          newValues: { reason: 'USER_NOT_FOUND' },
        });
        return errorResponse(res, 404, 'User not found');
      }

      await logAuditEvent({
        req,
        userId: req.user.id,
        action: 'VERIFY_TOKEN',
        entityType: 'auth',
        entityId: req.user.id,
      });

      successResponse(res, 200, {
        valid: true,
        user: formatUserResponse(getUserWithoutPassword(user)),
      });
    }),
  ],

  getProfile: [
    verifyTokenMiddleware,
    asyncHandler(async (req, res) => {
      const user = await userModel.findById(req.user.id);

      if (!user) {
        return errorResponse(res, 404, 'User not found');
      }

      successResponse(res, 200, {
        user: {
          ...formatUserResponse(getUserWithoutPassword(user)),
          role: user.role_id
            ? {
              id: user.role_id,
              name: user.role_name,
            }
            : null,
          vertical: user.vertical_id
            ? {
              id: user.vertical_id,
              name: user.vertical_name,
            }
            : null,
          created_at: user.created_at,
        },
      });
    }),
  ],
};

export default authController;
