import { body, param, query, validationResult } from 'express-validator';
import { userModel, roleModel } from '../models/queryHelpers.js';

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
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Donor ID is required and must be a positive integer'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
  body('currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR', 'GBP'])
    .withMessage('Invalid currency'),
  body('payment_method')
    .isIn(['cash', 'cheque', 'bank_transfer', 'online', 'upi', 'card', 'other'])
    .withMessage('Invalid payment method'),
  body('payment_reference')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Payment reference cannot exceed 100 characters'),
  body('donation_type')
    .optional()
    .isIn(['one_time', 'recurring', 'pledge'])
    .withMessage('Invalid donation type'),
  body('frequency')
    .optional()
    .isIn(['monthly', 'quarterly', 'yearly'])
    .withMessage('Invalid frequency'),
  body('campaign')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Campaign cannot exceed 255 characters'),
  body('purpose')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Purpose cannot exceed 1000 characters'),
  body('anonymous')
    .optional()
    .isBoolean()
    .withMessage('Anonymous must be a boolean'),
  body('vertical_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer'),
  body('program_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Program ID must be a positive integer'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body('donation_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid donation date format'),
  handleValidationErrors,
];

export const updateDonationValidation = [
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
  body('currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR', 'GBP'])
    .withMessage('Invalid currency'),
  body('payment_method')
    .optional()
    .isIn(['cash', 'cheque', 'bank_transfer', 'online', 'upi', 'card', 'other'])
    .withMessage('Invalid payment method'),
  body('payment_reference')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Payment reference cannot exceed 100 characters'),
  body('donation_type')
    .optional()
    .isIn(['one_time', 'recurring', 'pledge'])
    .withMessage('Invalid donation type'),
  body('frequency')
    .optional()
    .isIn(['monthly', 'quarterly', 'yearly'])
    .withMessage('Invalid frequency'),
  body('campaign')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Campaign cannot exceed 255 characters'),
  body('purpose')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Purpose cannot exceed 1000 characters'),
  body('anonymous')
    .optional()
    .isBoolean()
    .withMessage('Anonymous must be a boolean'),
  body('vertical_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer'),
  body('program_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Program ID must be a positive integer'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  handleValidationErrors,
];

export const allocationValidation = [
  body('donation_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Donation ID is required and must be a positive integer'),
  body('vertical_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer'),
  body('program_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Program ID must be a positive integer'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
  body('allocation_percentage')
    .optional()
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('Allocation percentage must be between 0.01 and 100')
    .toFloat(),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  body().custom((value, { req }) => {
    if (!req.body.vertical_id && !req.body.program_id) {
      throw new Error('Either vertical_id or program_id must be provided');
    }
    return true;
  }),
  handleValidationErrors,
];

export const updateAllocationValidation = [
  body('vertical_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer'),
  body('program_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Program ID must be a positive integer'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
  body('allocation_percentage')
    .optional()
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('Allocation percentage must be between 0.01 and 100')
    .toFloat(),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  handleValidationErrors,
];

export const reallocateValidation = [
  body('new_vertical_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('New vertical ID is required and must be a positive integer'),
  body('new_program_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('New program ID must be a positive integer'),
  handleValidationErrors,
];

export const confirmDonationValidation = [
  body('allocations')
    .optional()
    .isArray()
    .withMessage('Allocations must be an array'),
  body('allocations.*.vertical_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer'),
  body('allocations.*.program_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Program ID must be a positive integer'),
  body('allocations.*.amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Allocation amount must be positive'),
  body('generate_receipt')
    .optional()
    .isBoolean()
    .withMessage('Generate receipt must be a boolean'),
  handleValidationErrors,
];

export const searchValidation = [
  query('search')
    .trim()
    .notEmpty()
    .withMessage('Search term is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search term must be between 2 and 100 characters'),
  handleValidationErrors,
];

export const validateAmount = (amount) => {
  if (typeof amount !== 'number' || amount <= 0) {
    return false;
  }
  // Check for reasonable precision (2 decimal places for currency)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return false;
  }
  return true;
};

export const validateReceiptGeneration = (donation) => {
  if (!donation) {
    return { isValid: false, error: 'Donation not found' };
  }
  
  if (donation.payment_status !== 'received') {
    return { isValid: false, error: 'Can only issue receipt for confirmed donations' };
  }
  
  if (donation.receipt_number) {
    return { isValid: false, error: 'Receipt already issued for this donation' };
  }
  
  return { isValid: true };
};

export const validateDonationInput = (data) => {
  const errors = [];

  if (!data.donor_id) {
    errors.push({ field: 'donor_id', message: 'Donor ID is required' });
  }

  if (!data.amount || !validateAmount(data.amount)) {
    errors.push({ field: 'amount', message: 'Valid positive amount is required' });
  }

  if (!data.payment_method) {
    errors.push({ field: 'payment_method', message: 'Payment method is required' });
  }

  if (data.donation_date && new Date(data.donation_date) > new Date()) {
    errors.push({ field: 'donation_date', message: 'Donation date cannot be in the future' });
  }

  if (data.currency && !['INR', 'USD', 'EUR', 'GBP'].includes(data.currency)) {
    errors.push({ field: 'currency', message: 'Invalid currency' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateAllocationInput = (data) => {
  const errors = [];

  if (!data.donation_id) {
    errors.push({ field: 'donation_id', message: 'Donation ID is required' });
  }

  if (!data.amount || !validateAmount(data.amount)) {
    errors.push({ field: 'amount', message: 'Valid positive amount is required' });
  }

  if (!data.vertical_id && !data.program_id) {
    errors.push({ field: 'allocation', message: 'Either vertical_id or program_id must be provided' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const programStatusValidation = body('status')
  .optional()
  .isIn(['planning', 'active', 'completed', 'on_hold', 'cancelled', 'suspended'])
  .withMessage('Invalid program status');

export const createProgramValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Program name is required')
    .isLength({ max: 255 })
    .withMessage('Name cannot exceed 255 characters'),
  body('code')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Code cannot exceed 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('vertical_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer')
    .toInt(),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be a non-negative number')
    .toFloat(),
  body('spent_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Spent amount must be a non-negative number')
    .toFloat(),
  programStatusValidation,
  body('manager_user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Manager user ID must be a positive integer')
    .toInt(),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location cannot exceed 255 characters'),
  body('beneficiary_target')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Beneficiary target must be a non-negative integer')
    .toInt(),
  body('beneficiary_reached')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Beneficiary reached must be a non-negative integer')
    .toInt(),
  body().custom((_, { req }) => {
    if (req.body.start_date && req.body.end_date) {
      const start = new Date(req.body.start_date);
      const end = new Date(req.body.end_date);
      if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end < start) {
        throw new Error('end_date cannot be before start_date');
      }
    }

    if (req.user?.roleId === 1 && !req.body.vertical_id) {
      throw new Error('vertical_id is required');
    }

    return true;
  }),
  handleValidationErrors,
];

export const updateProgramValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Program name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Name cannot exceed 255 characters'),
  body('code')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Code cannot exceed 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('vertical_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer')
    .toInt(),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be a non-negative number')
    .toFloat(),
  body('spent_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Spent amount must be a non-negative number')
    .toFloat(),
  programStatusValidation,
  body('manager_user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Manager user ID must be a positive integer')
    .toInt(),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location cannot exceed 255 characters'),
  body('beneficiary_target')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Beneficiary target must be a non-negative integer')
    .toInt(),
  body('beneficiary_reached')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Beneficiary reached must be a non-negative integer')
    .toInt(),
  body().custom((_, { req }) => {
    if (req.body.start_date && req.body.end_date) {
      const start = new Date(req.body.start_date);
      const end = new Date(req.body.end_date);
      if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end < start) {
        throw new Error('end_date cannot be before start_date');
      }
    }
    return true;
  }),
  handleValidationErrors,
];

export const updateProgramStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['planning', 'active', 'completed', 'on_hold', 'cancelled', 'suspended'])
    .withMessage('Invalid program status'),
  handleValidationErrors,
];

// Backwards compatibility for any existing references
export const programValidation = createProgramValidation;

export const createKpiValidation = [
  body('program_id')
    .notEmpty()
    .withMessage('program_id is required')
    .isInt({ min: 1 })
    .withMessage('program_id must be a positive integer')
    .toInt(),
  body('kpi_name')
    .trim()
    .notEmpty()
    .withMessage('kpi_name is required')
    .isLength({ max: 255 })
    .withMessage('kpi_name cannot exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('target_value')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('target_value must be a non-negative number')
    .toFloat(),
  body('current_value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('current_value must be a non-negative number')
    .toFloat(),
  body('unit')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('unit cannot exceed 50 characters'),
  body('measurement_frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one_time'])
    .withMessage('Invalid measurement_frequency'),
  body('status')
    .optional()
    .isIn(['on_track', 'at_risk', 'behind', 'achieved'])
    .withMessage('Invalid KPI status'),
  handleValidationErrors,
];

export const updateKpiValidation = [
  body('kpi_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('kpi_name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('kpi_name cannot exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('target_value')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('target_value must be a non-negative number')
    .toFloat(),
  body('current_value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('current_value must be a non-negative number')
    .toFloat(),
  body('unit')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('unit cannot exceed 50 characters'),
  body('measurement_frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one_time'])
    .withMessage('Invalid measurement_frequency'),
  body('status')
    .optional()
    .isIn(['on_track', 'at_risk', 'behind', 'achieved'])
    .withMessage('Invalid KPI status'),
  handleValidationErrors,
];

export const updateKpiProgressValidation = [
  body('current_value')
    .notEmpty()
    .withMessage('current_value is required')
    .isFloat({ min: 0 })
    .withMessage('current_value must be a non-negative number')
    .toFloat(),
  body('status')
    .optional()
    .isIn(['on_track', 'at_risk', 'behind', 'achieved'])
    .withMessage('Invalid KPI status'),
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

// Volunteers Management API validations
export const createVolunteerValidation = [
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name cannot exceed 100 characters'),
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name cannot exceed 100 characters'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone must be between 7 and 20 characters'),
  body('tier')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tier cannot exceed 50 characters'),
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['active', 'inactive', 'on_hold'])
    .withMessage('Status must be active, inactive, or on_hold'),
  body('vertical_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer'),
  body('insurance_provider')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Insurance provider cannot exceed 100 characters'),
  body('insurance_policy_number')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Insurance policy number cannot exceed 100 characters'),
  body('insurance_expiry_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Insurance expiry date must be a valid ISO8601 date'),
  body('emergency_contact_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name cannot exceed 100 characters'),
  body('emergency_contact_phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage('Emergency contact phone must be between 7 and 20 characters'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  handleValidationErrors,
];

export const updateVolunteerValidation = [
  body('first_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('First name cannot exceed 100 characters'),
  body('last_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Last name cannot exceed 100 characters'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone must be between 7 and 20 characters'),
  body('tier')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tier cannot exceed 50 characters'),
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['active', 'inactive', 'on_hold'])
    .withMessage('Status must be active, inactive, or on_hold'),
  body('vertical_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer'),
  body('insurance_provider')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Insurance provider cannot exceed 100 characters'),
  body('insurance_policy_number')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Insurance policy number cannot exceed 100 characters'),
  body('insurance_expiry_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Insurance expiry date must be a valid ISO8601 date'),
  body('emergency_contact_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name cannot exceed 100 characters'),
  body('emergency_contact_phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage('Emergency contact phone must be between 7 and 20 characters'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  handleValidationErrors,
];

export const volunteerHoursLogValidation = [
  body('program_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Program ID is required and must be a positive integer')
    .toInt(),
  body('work_date')
    .notEmpty()
    .isISO8601()
    .withMessage('Work date is required and must be a valid ISO8601 date'),
  body('hours')
    .notEmpty()
    .isFloat({ min: 0.25, max: 24 })
    .withMessage('Hours must be between 0.25 and 24')
    .toFloat(),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  handleValidationErrors,
];

export const volunteerInsuranceUpdateValidation = [
  body('insurance_provider')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Insurance provider cannot exceed 100 characters'),
  body('insurance_policy_number')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Insurance policy number cannot exceed 100 characters'),
  body('insurance_expiry_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Insurance expiry date must be a valid ISO8601 date'),
  body().custom((value, { req }) => {
    const { insurance_provider, insurance_policy_number, insurance_expiry_date } = req.body;
    if (!insurance_provider && !insurance_policy_number && !insurance_expiry_date) {
      throw new Error('At least one insurance field must be provided');
    }
    return true;
  }),
  handleValidationErrors,
];

export const volunteerAssignmentValidation = [
  body('volunteer_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Volunteer ID must be a positive integer')
    .toInt(),
  body('program_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Program ID is required and must be a positive integer')
    .toInt(),
  body('start_date')
    .notEmpty()
    .isISO8601()
    .withMessage('Start date is required and must be a valid ISO8601 date'),
  body('end_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('End date must be a valid ISO8601 date'),
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['active', 'completed', 'inactive'])
    .withMessage('Status must be active, completed, or inactive'),
  body().custom((value, { req }) => {
    if (req.body.start_date && req.body.end_date) {
      const start = new Date(req.body.start_date);
      const end = new Date(req.body.end_date);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
        throw new Error('End date cannot be before start date');
      }
    }
    return true;
  }),
  handleValidationErrors,
];

export const assignmentUpdateValidation = [
  body('start_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Start date must be a valid ISO8601 date'),
  body('end_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('End date must be a valid ISO8601 date'),
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['active', 'completed', 'inactive'])
    .withMessage('Status must be active, completed, or inactive'),
  body().custom((value, { req }) => {
    if (req.body.start_date && req.body.end_date) {
      const start = new Date(req.body.start_date);
      const end = new Date(req.body.end_date);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
        throw new Error('End date cannot be before start date');
      }
    }
    return true;
  }),
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

// New Staff Management API validations
export const createStaffValidation = [
  body('user_id')
    .isInt({ min: 1 })
    .withMessage('User ID is required and must be a positive integer')
    .toInt(),
  body('employee_id')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Employee ID cannot exceed 50 characters'),
  body('join_date')
    .isISO8601()
    .withMessage('Join date must be a valid date'),
  body('employment_type')
    .optional()
    .isIn(['full_time', 'part_time', 'contract', 'intern'])
    .withMessage('Employment type must be full_time, part_time, contract, or intern'),
  body('designation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation cannot exceed 100 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department cannot exceed 100 characters'),
  body('reporting_to')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Reporting to must be a valid staff ID')
    .toInt(),
  body('salary')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Salary must be a non-negative number')
    .toFloat(),
  body('bank_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Bank name cannot exceed 255 characters'),
  body('bank_account_number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Bank account number cannot exceed 50 characters'),
  body('bank_ifsc')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Bank IFSC cannot exceed 20 characters'),
  body('pan_number')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('PAN number cannot exceed 20 characters'),
  body('aadhar_number')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Aadhar number cannot exceed 20 characters'),
  body('uan_number')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('UAN number cannot exceed 20 characters'),
  body('esic_number')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('ESIC number cannot exceed 20 characters'),
  body('emergency_contact_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Emergency contact name cannot exceed 255 characters'),
  body('emergency_contact_phone')
    .optional()
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage('Emergency contact phone must be between 7 and 20 characters'),
  body('emergency_contact_relation')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Emergency contact relation cannot exceed 50 characters'),
  body('blood_group')
    .optional()
    .trim()
    .isLength({ max: 5 })
    .withMessage('Blood group cannot exceed 5 characters'),
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  body('permanent_address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Permanent address cannot exceed 500 characters'),
  body('current_address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Current address cannot exceed 500 characters'),
  body('burnout_level')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Burnout level must be low, medium, or high'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  handleValidationErrors,
];

export const updateStaffValidation = [
  body('employment_type')
    .optional()
    .isIn(['full_time', 'part_time', 'contract', 'intern'])
    .withMessage('Employment type must be full_time, part_time, contract, or intern'),
  body('designation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation cannot exceed 100 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department cannot exceed 100 characters'),
  body('reporting_to')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Reporting to must be a valid staff ID')
    .toInt(),
  body('salary')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Salary must be a non-negative number')
    .toFloat(),
  body('bank_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Bank name cannot exceed 255 characters'),
  body('bank_account_number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Bank account number cannot exceed 50 characters'),
  body('bank_ifsc')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Bank IFSC cannot exceed 20 characters'),
  body('pan_number')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('PAN number cannot exceed 20 characters'),
  body('aadhar_number')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Aadhar number cannot exceed 20 characters'),
  body('uan_number')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('UAN number cannot exceed 20 characters'),
  body('esic_number')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('ESIC number cannot exceed 20 characters'),
  body('emergency_contact_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Emergency contact name cannot exceed 255 characters'),
  body('emergency_contact_phone')
    .optional()
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage('Emergency contact phone must be between 7 and 20 characters'),
  body('emergency_contact_relation')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Emergency contact relation cannot exceed 50 characters'),
  body('blood_group')
    .optional()
    .trim()
    .isLength({ max: 5 })
    .withMessage('Blood group cannot exceed 5 characters'),
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  body('permanent_address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Permanent address cannot exceed 500 characters'),
  body('current_address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Current address cannot exceed 500 characters'),
  body('burnout_level')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Burnout level must be low, medium, or high'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  handleValidationErrors,
];

export const updateStaffStatusValidation = [
  body('status')
    .isIn(['active', 'on_leave', 'resigned', 'terminated'])
    .withMessage('Status must be active, on_leave, resigned, or terminated'),
  body('resignation_date')
    .optional()
    .isISO8601()
    .withMessage('Resignation date must be a valid date'),
  body('relieving_date')
    .optional()
    .isISO8601()
    .withMessage('Relieving date must be a valid date'),
  handleValidationErrors,
];

export const updateBurnoutLevelValidation = [
  body('burnout_level')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Burnout level must be low, medium, or high'),
  handleValidationErrors,
];

export const contactValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name cannot exceed 100 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name cannot exceed 100 characters'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Please provide a valid phone number'),
  body('contact_type_id')
    .notEmpty()
    .withMessage('Contact type ID is required')
    .isInt({ min: 1 })
    .withMessage('Contact type ID must be a positive integer'),
  body('vertical_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer'),
  body('address')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Address must be a string'),
  body('city')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('City must be a string'),
  body('state')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('State must be a string'),
  body('country')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Country must be a string'),
  body('notes')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Notes must be a string'),
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

export const validateUserInput = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name cannot exceed 100 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name cannot exceed 100 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .custom(async (email, { req }) => {
      const existingUser = await userModel.findByEmail(email);
      if (existingUser && (!req.params.id || existingUser.id !== parseInt(req.params.id, 10))) {
        throw new Error('Email already exists');
      }
      return true;
    }),
  body('password')
    .if((value, { req }) => req.method === 'POST')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('role_id')
    .isInt({ min: 1 })
    .withMessage('Role ID must be a valid integer')
    .custom(async (roleId) => {
      const role = await roleModel.findById(roleId);
      if (!role) {
        throw new Error('Invalid role_id');
      }
      return true;
    }),
  body('vertical_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a valid integer'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be active, inactive, or suspended'),
  handleValidationErrors,
];

export const validatePasswordStrength = [
  body('oldPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain uppercase, lowercase, number, and special character'),
  handleValidationErrors,
];

export const validateEmailUniqueness = async (email, excludeId = null) => {
  return await userModel.checkEmailExists(email, excludeId);
};

export const validateRoleExists = [
  body('role_id')
    .isInt({ min: 1 })
    .withMessage('Role ID must be a valid integer')
    .custom(async (roleId) => {
      const role = await roleModel.findById(roleId);
      if (!role) {
        throw new Error('Invalid role_id');
      }
      return true;
    }),
  handleValidationErrors,
];

export default {
  handleValidationErrors,
  registerValidation,
  loginValidation,
  paginationValidation,
  idParamValidation,
  donationValidation,
  updateDonationValidation,
  allocationValidation,
  updateAllocationValidation,
  reallocateValidation,
  confirmDonationValidation,
  searchValidation,

  programValidation,
  createProgramValidation,
  updateProgramValidation,
  updateProgramStatusValidation,

  createKpiValidation,
  updateKpiValidation,
  updateKpiProgressValidation,

  volunteerValidation,
  createVolunteerValidation,
  updateVolunteerValidation,
  volunteerHoursLogValidation,
  volunteerInsuranceUpdateValidation,
  volunteerAssignmentValidation,
  assignmentUpdateValidation,

  staffValidation,
  createStaffValidation,
  updateStaffValidation,
  updateStaffStatusValidation,
  updateBurnoutLevelValidation,

  contactValidation,
  validateEmail,
  validatePassword,
  validateUser,
  sanitizeUserData,
  validateUserInput,
  validatePasswordStrength,
  validateEmailUniqueness,
  validateRoleExists,
  validateAmount,
  validateReceiptGeneration,
  validateDonationInput,
  validateAllocationInput,
};

// Fee Plan Validations
export const createFeePlanValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Fee plan name is required')
    .isLength({ max: 255 })
    .withMessage('Name cannot exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('fee_type')
    .isIn(['membership', 'service', 'processing', 'administrative'])
    .withMessage('Invalid fee type'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
  body('billing_frequency')
    .optional()
    .isIn(['monthly', 'quarterly', 'yearly', 'one_time'])
    .withMessage('Invalid billing frequency'),
  body('vertical_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer')
    .toInt(),
  body('is_template')
    .optional()
    .isBoolean()
    .withMessage('Is template must be a boolean'),
  body('template_category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Template category cannot exceed 100 characters'),
  body('billing_day')
    .optional()
    .isInt({ min: 1, max: 31 })
    .withMessage('Billing day must be between 1 and 31')
    .toInt(),
  body('due_day')
    .optional()
    .isInt({ min: 1, max: 31 })
    .withMessage('Due day must be between 1 and 31')
    .toInt(),
  body('grace_period_days')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Grace period days must be non-negative')
    .toInt(),
  body('late_fee_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Late fee amount must be non-negative')
    .toFloat(),
  handleValidationErrors,
];

export const updateFeePlanValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Name cannot exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('fee_type')
    .optional()
    .isIn(['membership', 'service', 'processing', 'administrative'])
    .withMessage('Invalid fee type'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
  body('billing_frequency')
    .optional()
    .isIn(['monthly', 'quarterly', 'yearly', 'one_time'])
    .withMessage('Invalid billing frequency'),
  body('vertical_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer')
    .toInt(),
  handleValidationErrors,
];

// Fee Validations
export const createFeeValidation = [
  body('contact_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Contact ID is required and must be a positive integer'),
  body('fee_plan_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Fee plan ID must be a positive integer'),
  body('vertical_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Vertical ID is required and must be a positive integer'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
  body('currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR', 'GBP'])
    .withMessage('Invalid currency'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('due_date')
    .notEmpty()
    .isISO8601()
    .withMessage('Valid due date is required'),
  body('billing_period_start')
    .optional()
    .isISO8601()
    .withMessage('Invalid billing period start date format'),
  body('billing_period_end')
    .optional()
    .isISO8601()
    .withMessage('Invalid billing period end date format'),
  handleValidationErrors,
];

export const updateFeeStatusValidation = [
  body('status')
    .isIn(['pending', 'paid', 'overdue', 'waived'])
    .withMessage('Invalid fee status'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  handleValidationErrors,
];

export const updateFeeAmountValidation = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),
  handleValidationErrors,
];

// Payment Validations
export const recordPaymentValidation = [
  body('fee_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Fee ID is required and must be a positive integer'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be a positive number')
    .toFloat(),
  body('payment_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid payment date format'),
  body('payment_method')
    .isIn(['cash', 'cheque', 'bank_transfer', 'online', 'upi', 'card'])
    .withMessage('Invalid payment method'),
  body('reference')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Reference cannot exceed 100 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  handleValidationErrors,
];

// Waiver Validations
export const createWaiverValidation = [
  body('fee_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Fee ID is required and must be a positive integer'),
  body('waiver_type')
    .isIn(['hardship', 'medical', 'administrative', 'other'])
    .withMessage('Invalid waiver type'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ max: 1000 })
    .withMessage('Reason cannot exceed 1000 characters'),
  body('requested_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Requested amount must be non-negative')
    .toFloat(),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  handleValidationErrors,
];

export const reviewWaiverValidation = [
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Review notes cannot exceed 500 characters'),
  handleValidationErrors,
];

// Subsidy Validations
export const createSubsidyValidation = [
  body('contact_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Contact ID is required and must be a positive integer'),
  body('vertical_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Vertical ID is required and must be a positive integer'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
  body('currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR', 'GBP'])
    .withMessage('Invalid currency'),
  body('subsidy_type')
    .isIn(['needs_based', 'merit_based', 'emergency', 'program_specific'])
    .withMessage('Invalid subsidy type'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('eligibility_criteria')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Eligibility criteria cannot exceed 500 characters'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('end_date')
    .optional()
    .custom((value, { req }) => {
      if (value && req.body.start_date) {
        const start = new Date(req.body.start_date);
        const end = new Date(value);
        if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end < start) {
          throw new Error('End date cannot be before start date');
        }
      }
      return true;
    }),
  handleValidationErrors,
];

export const updateSubsidyValidation = [
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
  body('subsidy_type')
    .optional()
    .isIn(['needs_based', 'merit_based', 'emergency', 'program_specific'])
    .withMessage('Invalid subsidy type'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('end_date')
    .optional()
    .custom((value, { req }) => {
      if (value && req.body.start_date) {
        const start = new Date(req.body.start_date);
        const end = new Date(value);
        if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end < start) {
          throw new Error('End date cannot be before start date');
        }
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['active', 'expired', 'suspended'])
    .withMessage('Invalid subsidy status'),
  handleValidationErrors,
];

export const allocateSubsidyValidation = [
  body('feeId')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Fee ID is required and must be a positive integer'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Allocation amount must be a positive number')
    .toFloat(),
  handleValidationErrors,
];

// ============================================
// VENDOR VALIDATORS
// ============================================

export const createVendorValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Vendor name is required')
    .isLength({ max: 255 })
    .withMessage('Vendor name cannot exceed 255 characters'),
  body('type')
    .optional()
    .isIn(['goods', 'services', 'both'])
    .withMessage('Vendor type must be goods, services, or both'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters'),
  body('contact_person')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Contact person cannot exceed 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone must be between 7 and 20 characters'),
  body('alternate_phone')
    .optional()
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage('Alternate phone must be between 7 and 20 characters'),
  body('address_line1')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address line 1 cannot exceed 255 characters'),
  body('address_line2')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address line 2 cannot exceed 255 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),
  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters'),
  body('postal_code')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Postal code cannot exceed 20 characters'),
  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country cannot exceed 100 characters'),
  body('gstin')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('GSTIN cannot exceed 20 characters'),
  body('pan_number')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('PAN number cannot exceed 20 characters'),
  body('payment_terms')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Payment terms cannot exceed 100 characters'),
  body('credit_limit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a non-negative number')
    .toFloat(),
  body('bank_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Bank name cannot exceed 100 characters'),
  body('bank_account_number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Bank account number cannot exceed 50 characters'),
  body('bank_ifsc')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Bank IFSC cannot exceed 20 characters'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'blacklisted'])
    .withMessage('Status must be active, inactive, or blacklisted'),
  body('vertical_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  handleValidationErrors,
];

export const updateVendorValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Vendor name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Vendor name cannot exceed 255 characters'),
  body('type')
    .optional()
    .isIn(['goods', 'services', 'both'])
    .withMessage('Vendor type must be goods, services, or both'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters'),
  body('contact_person')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Contact person cannot exceed 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone must be between 7 and 20 characters'),
  body('alternate_phone')
    .optional()
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage('Alternate phone must be between 7 and 20 characters'),
  body('address_line1')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address line 1 cannot exceed 255 characters'),
  body('address_line2')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address line 2 cannot exceed 255 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),
  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters'),
  body('postal_code')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Postal code cannot exceed 20 characters'),
  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country cannot exceed 100 characters'),
  body('gstin')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('GSTIN cannot exceed 20 characters'),
  body('pan_number')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('PAN number cannot exceed 20 characters'),
  body('payment_terms')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Payment terms cannot exceed 100 characters'),
  body('credit_limit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a non-negative number')
    .toFloat(),
  body('bank_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Bank name cannot exceed 100 characters'),
  body('bank_account_number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Bank account number cannot exceed 50 characters'),
  body('bank_ifsc')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Bank IFSC cannot exceed 20 characters'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'blacklisted'])
    .withMessage('Status must be active, inactive, or blacklisted'),
  body('rating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
    .toFloat(),
  body('vertical_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vertical ID must be a positive integer'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  handleValidationErrors,
];

export const updateVendorStatusValidation = [
  body('status')
    .notEmpty()
    .isIn(['active', 'inactive', 'blacklisted'])
    .withMessage('Status must be active, inactive, or blacklisted'),
  handleValidationErrors,
];

// ============================================
// REQUISITION VALIDATORS
// ============================================

export const createRequisitionValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Requisition title is required')
    .isLength({ max: 255 })
    .withMessage('Title cannot exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('purpose')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Purpose cannot exceed 2000 characters'),
  body('vertical_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Vertical ID is required and must be a positive integer'),
  body('program_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Program ID must be a positive integer'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department cannot exceed 100 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  handleValidationErrors,
];

export const updateRequisitionValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title cannot exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('purpose')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Purpose cannot exceed 2000 characters'),
  body('program_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Program ID must be a positive integer'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department cannot exceed 100 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  handleValidationErrors,
];

export const addRequisitionItemValidation = [
  body('item_name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ max: 255 })
    .withMessage('Item name cannot exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('quantity')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Quantity is required and must be a positive integer')
    .toInt(),
  body('unit')
    .trim()
    .notEmpty()
    .withMessage('Unit is required')
    .isLength({ max: 50 })
    .withMessage('Unit cannot exceed 50 characters'),
  body('estimated_unit_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated unit cost must be a non-negative number')
    .toFloat(),
  body('actual_unit_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Actual unit cost must be a non-negative number')
    .toFloat(),
  body('received_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Received quantity must be a non-negative integer')
    .toInt(),
  body('item_code')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Item code cannot exceed 50 characters'),
  body('inventory_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Inventory ID must be a positive integer'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters'),
  body('specifications')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Specifications cannot exceed 2000 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  handleValidationErrors,
];

export const updateRequisitionItemValidation = [
  body('item_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Item name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Item name cannot exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer')
    .toInt(),
  body('unit')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Unit cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Unit cannot exceed 50 characters'),
  body('estimated_unit_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated unit cost must be a non-negative number')
    .toFloat(),
  body('actual_unit_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Actual unit cost must be a non-negative number')
    .toFloat(),
  body('received_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Received quantity must be a non-negative integer')
    .toInt(),
  body('item_code')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Item code cannot exceed 50 characters'),
  body('inventory_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Inventory ID must be a positive integer'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters'),
  body('specifications')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Specifications cannot exceed 2000 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  handleValidationErrors,
];

export const approveRequisitionValidation = [
  handleValidationErrors,
];

export const rejectRequisitionValidation = [
  body('rejection_reason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ max: 1000 })
    .withMessage('Rejection reason cannot exceed 1000 characters'),
  handleValidationErrors,
];

export const orderRequisitionValidation = [
  body('vendor_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Vendor ID is required and must be a positive integer'),
  body('po_number')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('PO number cannot exceed 100 characters'),
  handleValidationErrors,
];

// ============================================
// INVENTORY VALIDATORS
// ============================================

export const createInventoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ max: 255 })
    .withMessage('Item name cannot exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters'),
  body('subcategory')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Subcategory cannot exceed 100 characters'),
  body('unit')
    .trim()
    .notEmpty()
    .withMessage('Unit is required')
    .isLength({ max: 50 })
    .withMessage('Unit cannot exceed 50 characters'),
  body('current_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current quantity must be a non-negative integer')
    .toInt(),
  body('minimum_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum quantity must be a non-negative integer')
    .toInt(),
  body('maximum_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum quantity must be a non-negative integer')
    .toInt(),
  body('reorder_quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Reorder quantity must be a positive integer')
    .toInt(),
  body('unit_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit cost must be a non-negative number')
    .toFloat(),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
  body('vendor_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vendor ID must be a positive integer'),
  body('vertical_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Vertical ID is required and must be a positive integer'),
  handleValidationErrors,
];

export const updateInventoryValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Item name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Item name cannot exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters'),
  body('subcategory')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Subcategory cannot exceed 100 characters'),
  body('unit')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Unit cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Unit cannot exceed 50 characters'),
  body('minimum_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum quantity must be a non-negative integer')
    .toInt(),
  body('maximum_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum quantity must be a non-negative integer')
    .toInt(),
  body('reorder_quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Reorder quantity must be a positive integer')
    .toInt(),
  body('unit_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit cost must be a non-negative number')
    .toFloat(),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
  body('vendor_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Vendor ID must be a positive integer'),
  handleValidationErrors,
];

export const updateInventoryQuantityValidation = [
  body('quantity')
    .notEmpty()
    .isInt({ min: 0 })
    .withMessage('Quantity is required and must be a non-negative integer')
    .toInt(),
  body('unit_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit cost must be a non-negative number')
    .toFloat(),
  handleValidationErrors,
];

export const createStockTransactionValidation = [
  body('inventory_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Inventory ID is required and must be a positive integer'),
  body('transaction_type')
    .notEmpty()
    .isIn(['in', 'out', 'adjustment', 'transfer'])
    .withMessage('Transaction type must be in, out, adjustment, or transfer'),
  body('quantity')
    .notEmpty()
    .isInt()
    .withMessage('Quantity is required and must be an integer')
    .toInt(),
  body('unit_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit cost must be a non-negative number')
    .toFloat(),
  body('reference_type')
    .notEmpty()
    .isIn(['requisition', 'manual', 'donation', 'adjustment', 'transfer'])
    .withMessage('Reference type is required'),
  body('reference_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Reference ID is required and must be a positive integer'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),
  body('vertical_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Vertical ID is required and must be a positive integer'),
  handleValidationErrors,
];
