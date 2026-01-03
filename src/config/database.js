import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const databaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ngo_dashboard',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

let pool = null;

export const initializePool = () => {
  if (!pool) {
    pool = mysql.createPool(databaseConfig);
  }
  return pool;
};

export const getPool = () => {
  if (!pool) {
    return initializePool();
  }
  return pool;
};

export const verifyConnection = async () => {
  const pool = getPool();
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connection established successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

export const executeQuery = async (query, params = []) => {
  const pool = getPool();
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Query execution error:', error.message);
    throw error;
  }
};

export const executeTransaction = async (callback) => {
  const pool = getPool();
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database pool closed');
  }
};

export default {
  initializePool,
  getPool,
  verifyConnection,
  executeQuery,
  executeTransaction,
  closePool,
};
