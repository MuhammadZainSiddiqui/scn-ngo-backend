import express from 'express';
import cors from 'cors';
import { config } from './config/environment.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const createApp = () => {
  const app = express();
  
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
  
  app.use('/api', routes);
  
  app.get('/api', (req, res) => {
    res.json({
      success: true,
      message: 'NGO Dashboard API',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        health: '/api/health',
      },
    });
  });
  
  app.use(notFoundHandler);
  app.use(errorHandler);
  
  return app;
};

export default createApp;
