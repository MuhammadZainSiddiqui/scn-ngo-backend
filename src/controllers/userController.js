import bcrypt from 'bcryptjs';
import { userModel, roleModel, verticalModel } from '../models/queryHelpers.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { asyncHandler, successResponse, errorResponse } from '../middleware/errorHandler.js';
import { registerValidation, paginationValidation, idParamValidation } from '../utils/validators.js';

export const userController = {
  getAllUsers: [
    authenticateToken,
    requireRole(1, 2),
    paginationValidation,
    asyncHandler(async (req, res) => {
      const { page = 1, limit = 10, status, roleId, search } = req.query;
      
      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        status,
        roleId,
        search,
      };
      
      const result = await userModel.findAll(options);
      
      successResponse(res, 200, result);
    }),
  ],
  
  getUserById: [
    authenticateToken,
    idParamValidation,
    asyncHandler(async (req, res) => {
      const user = await userModel.findById(req.params.id);
      
      if (!user) {
        return errorResponse(res, 404, 'User not found');
      }
      
      successResponse(res, 200, { user });
    }),
  ],
  
  createUser: [
    authenticateToken,
    requireRole(1),
    registerValidation,
    asyncHandler(async (req, res) => {
      const { email, password, first_name, last_name, role_id, vertical_id } = req.body;
      
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        return errorResponse(res, 409, 'Email already exists');
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const userData = {
        email,
        password: hashedPassword,
        first_name,
        last_name,
        role_id,
        vertical_id: vertical_id || req.user.verticalId,
      };
      
      const user = await userModel.create(userData);
      
      successResponse(res, 201, { user }, 'User created successfully');
    }),
  ],
  
  updateUser: [
    authenticateToken,
    requireRole(1, 2),
    idParamValidation,
    asyncHandler(async (req, res) => {
      const { first_name, last_name, role_id, vertical_id, status } = req.body;
      
      const existingUser = await userModel.findById(req.params.id);
      if (!existingUser) {
        return errorResponse(res, 404, 'User not found');
      }
      
      const updateData = {};
      if (first_name) updateData.first_name = first_name;
      if (last_name) updateData.last_name = last_name;
      
      if (req.user.roleId === 1) {
        if (role_id) updateData.role_id = role_id;
        if (vertical_id !== undefined) updateData.vertical_id = vertical_id;
        if (status) updateData.status = status;
      }
      
      const updatedUser = await userModel.update(req.params.id, updateData);
      
      successResponse(res, 200, { user: updatedUser }, 'User updated successfully');
    }),
  ],
  
  deleteUser: [
    authenticateToken,
    requireRole(1),
    idParamValidation,
    asyncHandler(async (req, res) => {
      const user = await userModel.findById(req.params.id);
      
      if (!user) {
        return errorResponse(res, 404, 'User not found');
      }
      
      await userModel.softDelete(req.params.id);
      
      successResponse(res, 200, null, 'User deactivated successfully');
    }),
  ],
  
  getRoles: [
    authenticateToken,
    asyncHandler(async (req, res) => {
      const roles = await roleModel.findAll();
      successResponse(res, 200, { roles });
    }),
  ],
  
  getVerticals: [
    authenticateToken,
    asyncHandler(async (req, res) => {
      const verticals = await verticalModel.findAll();
      successResponse(res, 200, { verticals });
    }),
  ],
};

export default userController;
