import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, verifyJwtToken } from '../config/jwt.js';

export const generatePagination = (page = 1, limit = 10) => {
  const limitNum = parseInt(limit, 10) || 10;
  const pageNum = parseInt(page, 10) || 1;
  const offset = (pageNum - 1) * limitNum;

  return {
    limit: limitNum,
    offset,
    page: pageNum,
    totalPages: null,
  };
};

export const buildWhereClause = (filters, allowedFilters = []) => {
  const conditions = [];
  const values = [];

  Object.entries(filters).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      (allowedFilters.length === 0 || allowedFilters.includes(key))
    ) {
      if (typeof value === 'string' && value.includes('%')) {
        conditions.push(`${key} LIKE ?`);
        values.push(value);
      } else if (typeof value === 'object') {
        conditions.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        conditions.push(`${key} = ?`);
        values.push(value);
      }
    }
  });

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
};

export const buildSortClause = (sort = 'id', order = 'desc', allowedSortFields = []) => {
  const orderDir = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  if (allowedSortFields.length > 0 && !allowedSortFields.includes(sort)) {
    sort = 'id';
  }

  return `ORDER BY ${sort} ${orderDir}`;
};

export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const retry = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt < maxRetries) {
        await sleep(delay * attempt);
      }
    }
  }

  throw lastError;
};

export const delay = (ms) => sleep(ms);

export const parseJSON = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

export const generateReceiptNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `RCPT-${year}${month}-${random}`;
};

export const maskSensitiveData = (data, fields = ['password', 'token', 'secret']) => {
  const masked = { ...data };
  fields.forEach((field) => {
    if (masked[field]) {
      masked[field] = '********';
    }
  });
  return masked;
};

export const getFileExtension = (filename) => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

export const isValidFileExtension = (
  filename,
  allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
) => {
  const ext = getFileExtension(filename).toLowerCase();
  return allowedExtensions.includes(ext);
};

export const generateToken = (payload, type = 'access') => {
  return type === 'refresh' ? generateRefreshToken(payload) : generateAccessToken(payload);
};

export const verifyToken = (token, type = 'access') => {
  const decoded = verifyJwtToken(token);

  if (decoded?.tokenType && decoded.tokenType !== type) {
    const error = new Error('Invalid token type');
    error.name = 'JsonWebTokenError';
    throw error;
  }

  return decoded;
};

export const hashPassword = async (password, saltRounds = 10) => {
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

export const getUserWithoutPassword = (user) => {
  if (!user) return null;

  const { password, password_hash, passwordHash, ...safeUser } = user;
  return safeUser;
};

export const formatUserResponse = (user, { role = null } = {}) => {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name ?? user.firstName,
    lastName: user.last_name ?? user.lastName,
    role: role || (user.role_id || user.role_name ? {
      id: user.role_id,
      name: user.role_name,
    } : null),
    role_id: user.role_id ?? user.roleId,
    vertical_id: user.vertical_id ?? user.verticalId,
  };
};

export const formatContactResponse = (contact) => {
  if (!contact) return null;

  return {
    id: contact.id,
    firstName: contact.first_name,
    lastName: contact.last_name,
    email: contact.email,
    phone: contact.phone,
    contact_type_id: contact.contact_type_id,
    contact_type_name: contact.contact_type_name,
    vertical_id: contact.vertical_id,
    vertical_name: contact.vertical_name,
    address: contact.address_line1,
    city: contact.city,
    state: contact.state,
    country: contact.country,
    notes: contact.notes,
    status: contact.status,
    created_at: contact.created_at,
    updated_at: contact.updated_at,
  };
};

export default {
  generatePagination,
  buildWhereClause,
  buildSortClause,
  formatCurrency,
  calculateAge,
  sanitizeString,
  sleep,
  retry,
  delay,
  parseJSON,
  isValidEmail,
  isValidPhone,
  generateReceiptNumber,
  maskSensitiveData,
  getFileExtension,
  isValidFileExtension,
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  getUserWithoutPassword,
  formatUserResponse,
  formatContactResponse,
};
