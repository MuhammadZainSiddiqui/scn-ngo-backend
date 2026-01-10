import bcrypt from 'bcryptjs';
import { userModel, roleModel, verticalModel } from '../models/queryHelpers.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { asyncHandler, successResponse, errorResponse } from '../middleware/errorHandler.js';
import { 
  validateUserInput, 
  validatePasswordStrength, 
  validateEmailUniqueness, 
  validateRoleExists, 
  idParamValidation,
  paginationValidation
} from '../utils/validators.js';

export const userController = {
  getAllUsers: [
    paginationValidation,
    asyncHandler(async (req, res) => {
      const { page = 1, limit = 10, status, role_id, vertical_id, search, sort = 'created_at', order = 'desc' } = req.query;
      
      const isAdmin = req.user.roleId === 1;
      const isVerticalLead = req.user.roleId === 2;
      
      if (isVerticalLead && !vertical_id) {
        if (req.user.verticalId) {
          req.query.vertical_id = req.user.verticalId;
        }
      }
      
      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        status,
        roleId: role_id ? parseInt(role_id, 10) : undefined,
        verticalId: vertical_id ? parseInt(vertical_id, 10) : undefined,
        search,
        sort,
        order,
      };
      
      const result = await userModel.findAll(options);
      
      result.data = result.data.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      successResponse(res, 200, result);
    }),
  ],
  
  getUserById: [
    idParamValidation,
    asyncHandler(async (req, res) => {
      const userId = parseInt(req.params.id, 10);
      const requestingUserId = req.user.id;
      const requestingUserRole = req.user.roleId;
      const requestingUserVertical = req.user.verticalId;
      
      const user = await userModel.findById(userId);
      
      if (!user) {
        return errorResponse(res, 404, 'User not found');
      }
      
      if (requestingUserRole !== 1 && 
          requestingUserId !== userId && 
          requestingUserVertical !== user.vertical_id) {
        return errorResponse(res, 403, 'Access denied to this user');
      }
      
      const { password, ...safeUser } = user;
      
      successResponse(res, 200, { user: safeUser });
    }),
  ],
  
  getCurrentUser: [
    asyncHandler(async (req, res) => {
      const user = await userModel.findById(req.user.id);
      
      if (!user) {
        return errorResponse(res, 404, 'User not found');
      }
      
      const { password, ...safeUser } = user;
      
      successResponse(res, 200, { user: safeUser });
    }),
  ],
  
  createUser: [
    requireRole(1),
    validateUserInput,
    asyncHandler(async (req, res) => {
      const { firstName, lastName, email, password, role_id, vertical_id } = req.body;
      
      const existingUser = await userModel.checkEmailExists(email);
      if (existingUser) {
        return errorResponse(res, 409, 'Email already exists');
      }
      
      const roleExists = await roleModel.findById(role_id);
      if (!roleExists) {
        return errorResponse(res, 400, 'Invalid role_id');
      }
      
      if (vertical_id) {
        const verticalExists = await verticalModel.findById(vertical_id);
        if (!verticalExists) {
          return errorResponse(res, 400, 'Invalid vertical_id');
        }
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const userData = {
        email,
        password: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        role_id,
        vertical_id: vertical_id || null,
        created_by: req.user.id,
      };
      
      const result = await userModel.create(userData);
      
      const newUser = await userModel.findById(result.id);
      const { password: newPassword, ...safeUser } = newUser;
      
      successResponse(res, 201, { user: safeUser }, 'User created successfully');
    }),
  ],
  
  updateUser: [
    requireRole(1, 2),
    idParamValidation,
    asyncHandler(async (req, res) => {
      const userId = parseInt(req.params.id, 10);
      const { firstName, lastName, email, vertical_id } = req.body;
      
      if (req.user.roleId === 2 && userId !== req.user.id) {
        return errorResponse(res, 403, 'Vertical Leads can only update their own profile');
      }
      
      const existingUser = await userModel.findById(userId);
      if (!existingUser) {
        return errorResponse(res, 404, 'User not found');
      }
      
      if (req.user.roleId === 2 && existingUser.vertical_id !== req.user.verticalId) {
        return errorResponse(res, 403, 'Access denied to this user');
      }
      
      const updateData = {};
      if (firstName !== undefined) updateData.first_name = firstName;
      if (lastName !== undefined) updateData.last_name = lastName;
      if (email !== undefined) updateData.email = email;
      if (vertical_id !== undefined) updateData.vertical_id = vertical_id;
      
      if (!Object.keys(updateData).length) {
        return errorResponse(res, 400, 'No valid fields to update');
      }
      
      if (email && email !== existingUser.email) {
        const emailExists = await userModel.checkEmailExists(email, userId);
        if (emailExists) {
          return errorResponse(res, 409, 'Email already exists');
        }
      }
      
      if (vertical_id) {
        const verticalExists = await verticalModel.findById(vertical_id);
        if (!verticalExists) {
          return errorResponse(res, 400, 'Invalid vertical_id');
        }
      }
      
      const updatedUser = await userModel.update(userId, updateData, req.user.id);
      const { password, ...safeUser } = updatedUser;
      
      successResponse(res, 200, { user: safeUser }, 'User updated successfully');
    }),
  ],
  
  updateUserRole: [
    requireRole(1),
    idParamValidation,
    validateRoleExists,
    asyncHandler(async (req, res) => {
      const { role_id } = req.body;
      
      const roleExists = await roleModel.findById(role_id);
      if (!roleExists) {
        return errorResponse(res, 400, 'Invalid role_id');
      }
      
      const user = await userModel.findById(req.params.id);
      if (!user) {
        return errorResponse(res, 404, 'User not found');
      }
      
      const updatedUser = await userModel.updateRole(req.params.id, role_id, req.user.id);
      const { password, ...safeUser } = updatedUser;
      
      successResponse(res, 200, { user: safeUser }, 'User role updated successfully');
    }),
  ],
  
  updateUserStatus: [
    requireRole(1),
    idParamValidation,
    asyncHandler(async (req, res) => {
      const { status } = req.body;
      
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return errorResponse(res, 400, 'Invalid status. Must be active, inactive, or suspended');
      }
      
      const user = await userModel.findById(req.params.id);
      if (!user) {
        return errorResponse(res, 404, 'User not found');
      }
      
      const updatedUser = await userModel.updateStatus(req.params.id, status, req.user.id);
      const { password, ...safeUser } = updatedUser;
      
      successResponse(res, 200, { user: safeUser }, 'User status updated successfully');
    }),
  ],
  
  changePassword: [
    idParamValidation,
    validatePasswordStrength,
    asyncHandler(async (req, res) => {
      const userId = parseInt(req.params.id, 10);
      const { oldPassword, newPassword } = req.body;
      
      if (userId !== req.user.id) {
        return errorResponse(res, 403, 'You can only change your own password');
      }
      
      const user = await userModel.findById(userId);
      if (!user) {
        return errorResponse(res, 404, 'User not found');
      }
      
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
        return errorResponse(res, 401, 'Current password is incorrect');
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await userModel.updatePassword(userId, hashedPassword, req.user.id);
      
      successResponse(res, 200, null, 'Password changed successfully');
    }),
  ],
  
  deleteUser: [
    requireRole(1),
    idParamValidation,
    asyncHandler(async (req, res) => {
      const user = await userModel.findById(req.params.id);
      
      if (!user) {
        return errorResponse(res, 404, 'User not found');
      }
      
      await userModel.softDelete(req.params.id, req.user.id);
      
      successResponse(res, 200, null, 'User deactivated successfully');
    }),
  ],
  
  searchUsers: [
    paginationValidation,
    asyncHandler(async (req, res) => {
      const { q, page = 1, limit = 10 } = req.query;
      
      if (!q) {
        return errorResponse(res, 400, 'Search query (q) is required');
      }
      
      const result = await userModel.searchUsers(q, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
      
      result.data = result.data.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      successResponse(res, 200, result);
    }),
  ],
  
  getUsersByRole: [
    paginationValidation,
    asyncHandler(async (req, res) => {
      const { roleId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      const roleExists = await roleModel.findById(parseInt(roleId, 10));
      if (!roleExists) {
        return errorResponse(res, 404, 'Role not found');
      }
      
      const result = await userModel.getByRole(parseInt(roleId, 10), {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
      
      result.data = result.data.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      successResponse(res, 200, result);
    }),
  ],
  
  getUsersByVertical: [
    paginationValidation,
    asyncHandler(async (req, res) => {
      const { verticalId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      const verticalExists = await verticalModel.findById(parseInt(verticalId, 10));
      if (!verticalExists) {
        return errorResponse(res, 404, 'Vertical not found');
      }
      
      const isAdmin = req.user.roleId === 1;
      if (!isAdmin && req.user.verticalId !== parseInt(verticalId, 10)) {
        return errorResponse(res, 403, 'Access denied to this vertical');
      }
      
      const result = await userModel.getByVertical(parseInt(verticalId, 10), {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
      
      result.data = result.data.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      successResponse(res, 200, result);
    }),
  ],
  
  getUserStats: [
    requireRole(1),
    asyncHandler(async (req, res) => {
      const stats = await userModel.getUserStats();
      
      const roles = await roleModel.findAll();
      const verticals = await verticalModel.findAll();
      
      const roleNames = {};
      roles.forEach(role => {
        roleNames[role.id] = role.name;
      });
      
      const verticalNames = {};
      verticals.forEach(vertical => {
        verticalNames[vertical.id] = vertical.name;
      });
      
      const enrichedStats = {
        ...stats,
        roleNames,
        verticalNames,
      };
      
      successResponse(res, 200, enrichedStats);
    }),
  ],
  
  getRoles: [
    asyncHandler(async (req, res) => {
      const roles = await roleModel.findAll();
      successResponse(res, 200, { roles });
    }),
  ],
  
  getRoleById: [
    idParamValidation,
    asyncHandler(async (req, res) => {
      const role = await roleModel.findById(req.params.id);
      
      if (!role) {
        return errorResponse(res, 404, 'Role not found');
      }
      
      successResponse(res, 200, { role });
    }),
  ],
  
  createRole: [
    requireRole(1),
    asyncHandler(async (req, res) => {
      const { name, description, permissions } = req.body;
      
      if (!name || !description || !permissions) {
        return errorResponse(res, 400, 'name, description, and permissions are required');
      }
      
      const existingRole = await roleModel.findByName(name);
      if (existingRole) {
        return errorResponse(res, 409, 'Role with this name already exists');
      }
      
      const result = await roleModel.create({ name, description, permissions }, req.user.id);
      
      const newRole = await roleModel.findById(result.id);
      successResponse(res, 201, { role: newRole }, 'Role created successfully');
    }),
  ],
  
  updateRole: [
    requireRole(1),
    idParamValidation,
    asyncHandler(async (req, res) => {
      const { name, description, permissions } = req.body;
      
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (permissions !== undefined) updateData.permissions = permissions;
      
      if (!Object.keys(updateData).length) {
        return errorResponse(res, 400, 'No valid fields to update');
      }
      
      const existingRole = await roleModel.findById(req.params.id);
      if (!existingRole) {
        return errorResponse(res, 404, 'Role not found');
      }
      
      if (name && name !== existingRole.name) {
        const roleWithName = await roleModel.findByName(name);
        if (roleWithName) {
          return errorResponse(res, 409, 'Role with this name already exists');
        }
      }
      
      const updatedRole = await roleModel.update(req.params.id, updateData, req.user.id);
      
      successResponse(res, 200, { role: updatedRole }, 'Role updated successfully');
    }),
  ],
  
  getVerticals: [
    asyncHandler(async (req, res) => {
      const verticals = await verticalModel.findAll();
      successResponse(res, 200, { verticals });
    }),
  ],
  
  seedDefaultRoles: [
    requireRole(1),
    asyncHandler(async (req, res) => {
      const count = await roleModel.seedDefaultRoles();
      successResponse(res, 200, { count }, `Seeded ${count} default roles`);
    }),
  ],
};

export default userController;
