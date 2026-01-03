import createApp from './app.js';
import { config, validateEnvironment } from './config/environment.js';
import { initializePool, verifyConnection, closePool } from './config/database.js';

const startServer = async () => {
  console.log('🚀 Starting NGO Dashboard Backend Server...');
  console.log(`📍 Environment: ${config.env}`);
  
  if (!validateEnvironment()) {
    console.log('⚠️  Some environment variables are missing. Using defaults.');
  }
  
  try {
    console.log('🔌 Initializing database connection...');
    initializePool();
    
    const isConnected = await verifyConnection();
    if (!isConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }
    
    const app = createApp();
    
    const server = app.listen(config.port, () => {
      console.log(`✅ Server is running on port ${config.port}`);
      console.log(`🌐 API available at http://localhost:${config.port}/api`);
      console.log('📋 Available endpoints:');
      console.log('   - POST /api/auth/login');
      console.log('   - POST /api/auth/register');
      console.log('   - GET  /api/auth/profile');
      console.log('   - GET  /api/users');
      console.log('   - GET  /api/health');
    });
    
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      
      server.close(async () => {
        console.log('📴 HTTP server closed');
        
        await closePool();
        console.log('🔌 Database connections closed');
        
        process.exit(0);
      });
      
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
    
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
