import bcrypt from 'bcryptjs';
import { authenticateToken, generateToken, generateRefreshToken } from '../middleware/authMiddleware.js';
import { userModel, roleModel, verticalModel } from '../models/queryHelpers.js';
import { asyncHandler, errorResponse, successResponse } from '../middleware/errorHandler.js';
import { loginValidation, registerValidation } from '../utils/validators.js';

export const authController = {
  login: [
    loginValidation,
    asyncHandler(async (req, res) => {
      const { email, password } = req.body;
      
      const user = await userModel.findByEmail(email);
      if (!user) {
        return errorResponse(res, 401, 'Invalid credentials');
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return errorResponse(res, 401, 'Invalid credentials');
      }
      
      if (user.status !== 'active') {
        return errorResponse(res, 403, 'Account is not active');
      }
      
      const role = await roleModel.findById(user.role_id);
      const vertical = user.vertical_id ? await verticalModel.findById(user.vertical_id) : null;
      
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        roleId: user.role_id,
        verticalId: user.vertical_id,
      };
      
      const token = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);
      
      successResponse(res, 200, {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: role ? { id: role.id, name: role.name } : null,
          vertical: vertical ? { id: vertical.id, name: vertical.name } : null,
        },
      }, 'Login successful');
    }),
  ],
  
  register: [
    registerValidation,
    asyncHandler(async (req, res) => {
      const { email, password, first_name, last_name, role_id, vertical_id } = req.body;
      
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        return errorResponse(res, 409, 'Email already registered');
      }
      
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const userData = {
        email,
        password: hashedPassword,
        first_name,
        last_name,
        role_id: role_id || 3,
        vertical_id: vertical_id || null,
      };
      
      const user = await userModel.create(userData);
      
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        roleId: user.role_id,
        verticalId: user.vertical_id,
      };
      
      const token = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);
      
      successResponse(res, 201, {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      }, 'Registration successful');
    }),
  ],
  
  getProfile: [
    authenticateToken,
    asyncHandler(async (req, res) => {
      const user = await userModel.findById(req.user.id);
      
      if (!user) {
        return errorResponse(res, 404, 'User not found');
      }
      
      successResponse(res, 200, {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: {
            id: user.role_id,
            name: user.role_name,
          },
          vertical: user.vertical_id ? {
            id: user.vertical_id,
            name: user.vertical_name,
          } : null,
          created_at: user.created_at,
        },
      });
    }),
  ],
  
  refreshToken: asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return errorResponse(res, 400, 'Refresh token required');
    }
    
    try {
      const jwt = await import('jsonwebtoken');
      const { config } = await import('../config/environment.js');
      
      const decoded = jwt.default.verify(refreshToken, config.jwt.secret);
      
      const user = await userModel.findById(decoded.userId);
      if (!user || user.status !== 'active') {
        return errorResponse(res, 401, 'Invalid refresh token');
      }
      
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        roleId: user.role_id,
        verticalId: user.vertical_id,
      };
      
      const newToken = generateToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);
      
      successResponse(res, 200, {
        token: newToken,
        refreshToken: newRefreshToken,
      }, 'Token refreshed');
    } catch (error) {
      return errorResponse(res, 401, 'Invalid or expired refresh token');
    }
  }),
};

export default authController;
