import jwt from 'jsonwebtoken';

const getJwtSecret = () => {
  return process.env.JWT_SECRET || 'default-secret-change-in-production';
};

export const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '24h';
export const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const signToken = (payload, { expiresIn }) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

export const generateAccessToken = (payload) => {
  return signToken({ ...payload, tokenType: 'access' }, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};

export const generateRefreshToken = (payload) => {
  return signToken({ ...payload, tokenType: 'refresh' }, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};

export const verifyJwtToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

export default {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
  signToken,
  generateAccessToken,
  generateRefreshToken,
  verifyJwtToken,
};
