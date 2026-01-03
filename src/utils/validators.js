import { body, param, query, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('role_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Role must be a valid integer'),
  body('vertical_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vertical must be a valid integer'),
  handleValidationErrors,
];

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('sort')
    .optional()
    .isString()
    .withMessage('Sort must be a string'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
  handleValidationErrors,
];

export const idParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer')
    .toInt(),
  handleValidationErrors,
];

export const donationValidation = [
  body('donor_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Donor ID must be a positive integer'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
  body('currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR', 'GBP'])
    .withMessage('Invalid currency'),
  body('donation_type')
    .isIn(['one-time', 'recurring', 'pledge'])
    .withMessage('Invalid donation type'),
  body('program_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Program ID must be a positive integer'),
  body('vertical_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  handleValidationErrors,
];

export const programValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Program name is required')
    .isLength({ max: 200 })
    .withMessage('Name cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('vertical_id')
    .isInt({ min: 1 })
    .withMessage('Vertical ID is required'),
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  handleValidationErrors,
];

export const volunteerValidation = [
  body('contact_id')
    .isInt({ min: 1 })
    .withMessage('Contact ID is required'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('availability')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Availability cannot exceed 100 characters'),
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),
  handleValidationErrors,
];

export const staffValidation = [
  body('contact_id')
    .isInt({ min: 1 })
    .withMessage('Contact ID is required'),
  body('employee_id')
    .trim()
    .notEmpty()
    .withMessage('Employee ID is required')
    .isLength({ max: 50 })
    .withMessage('Employee ID cannot exceed 50 characters'),
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required')
    .isLength({ max: 100 })
    .withMessage('Department cannot exceed 100 characters'),
  body('designation')
    .trim()
    .notEmpty()
    .withMessage('Designation is required')
    .isLength({ max: 100 })
    .withMessage('Designation cannot exceed 100 characters'),
  body('joining_date')
    .isISO8601()
    .withMessage('Valid joining date is required'),
  body('vertical_id')
    .isInt({ min: 1 })
    .withMessage('Vertical ID is required'),
  handleValidationErrors,
];

export const contactValidation = [
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('type')
    .isIn(['donor', 'volunteer', 'vendor', 'partner', 'beneficiary'])
    .withMessage('Invalid contact type'),
  body('vertical_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer'),
  handleValidationErrors,
];

export const validateEmail = (email) => {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  if (typeof password !== 'string') return false;
  if (password.length < 8) return false;
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);
};

export const validateUser = (user) => {
  const errors = [];

  if (!validateEmail(user?.email)) {
    errors.push({ field: 'email', message: 'Please provide a valid email' });
  }

  if (!validatePassword(user?.password)) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters and contain uppercase, lowercase, and number',
    });
  }

  if (!user?.first_name) {
    errors.push({ field: 'first_name', message: 'First name is required' });
  }

  if (!user?.last_name) {
    errors.push({ field: 'last_name', message: 'Last name is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const sanitizeUserData = (user) => {
  if (!user) return null;

  const { password, password_hash, passwordHash, ...safeUser } = user;
  return safeUser;
};

export default {
  handleValidationErrors,
  registerValidation,
  loginValidation,
  paginationValidation,
  idParamValidation,
  donationValidation,
  programValidation,
  volunteerValidation,
  staffValidation,
  contactValidation,
  validateEmail,
  validatePassword,
  validateUser,
  sanitizeUserData,
};
