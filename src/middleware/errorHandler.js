import { config } from '../config/environment.js';

export class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;
  
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
  });
  
  if (err.code === 'ER_DUP_ENTRY') {
    error = new AppError('Duplicate entry', 409, 'DUPLICATE_ENTRY');
  }
  
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    error = new AppError('Referenced record not found', 400, 'INVALID_REFERENCE');
  }
  
  if (err.code === 'ER_DATA_TOO_LONG') {
    error = new AppError('Data too long for field', 400, 'DATA_TOO_LONG');
  }
  
  if (err.name === 'ValidationError') {
    error = new AppError(err.message, 400, 'VALIDATION_ERROR');
  }
  
  if (err.name === 'CastError') {
    error = new AppError('Invalid ID format', 400, 'INVALID_ID');
  }
  
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  const code = error.code || 'INTERNAL_ERROR';
  
  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(config.env === 'development' && {
      stack: error.stack,
      error: {
        message: err.message,
        status: err.statusCode,
      },
    }),
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    code: 'NOT_FOUND',
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const errorResponse = (res, statusCode, message, code = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    code,
  });
};

export const successResponse = (res, statusCode, data = {}, message = null) => {
  res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    ...data,
  });
};

export default {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  errorResponse,
  successResponse,
};
