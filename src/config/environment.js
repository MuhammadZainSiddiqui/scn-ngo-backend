import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'ngo_dashboard',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760,
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  },
};

export const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET',
];

export const validateEnvironment = () => {
  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('Please set these in your .env file');
    return false;
  }
  
  return true;
};

export default config;
