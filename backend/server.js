// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import setupSwagger, { swaggerSpec } from './config/swagger.js';
import { csrfProtection, handleCSRFError, provideCSRFToken } from './middlewares/csrfMiddleware.js';
import { apiLimiter, authLimiter, orderLimiter, feedbackLimiter } from './middlewares/rateLimitMiddleware.js';
import { connectDB } from './config/database.js';
import { initSchedulers } from './config/scheduler.js';
import { initializeWebSocket } from './config/websocket.js';
import logger from './config/logger.js';
import { checkRequiredEnv } from './config/checkEnv.js';
import mongoose from 'mongoose';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import { addSecurityHeaders } from './middlewares/securityMiddleware.js';
// import setupIndexes from './models/indexSetup.js';

// Debug MongoDB connection
mongoose.set('debug', false); // Disable verbose query logs even in development

// Check required environment variables
checkRequiredEnv();

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import menuItemRoutes from './routes/menuItemRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import tableRoutes from './routes/tableRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import managerRoutes from './routes/managerRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
// import promotionRoutes from './routes/promotionRoutes.js'; // Commenting out missing import
import inventoryRoutes from './routes/inventoryRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

// Import payment reconciliation job
import { schedulePaymentReconciliation } from './jobs/paymentReconciliationJob.js';

const app = express();
const isDevelopment = process.env.NODE_ENV === 'development';

// Apply global middlewares
app.use(express.json({ 
  limit: '10mb',
  type: ['application/json', 'application/csp-report', 'application/reports+json']
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Configure CORS for proper cookie handling
const corsOrigin = process.env.CORS_ORIGIN || (isDevelopment ? 'http://localhost:3000' : '*');
console.log(`Configuring CORS with origin: ${corsOrigin}`);

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 600 // 10 minutes
}));

// Add CORS preflight handler for all routes
app.options('*', cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 600 // 10 minutes
}));

app.use(helmet({
  // Disable contentSecurityPolicy as we'll configure it manually
  contentSecurityPolicy: false
}));
app.use(morgan('dev'));
app.use(mongoSanitize());

// CSP Configuration
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    connectSrc: ["'self'", 'https://api.your-domain.com'],
    frameSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    formAction: ["'self'"],  // Restrict form submissions
    frameAncestors: ["'none'"],  // Prevent clickjacking
    sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
    upgradeInsecureRequests: isDevelopment ? null : '',  // Force HTTPS in production
    reportUri: '/api/csp-report',
    reportTo: 'csp-endpoint'
  }
};

// CSP Reporting configuration
app.use((req, res, next) => {
  // Set Report-To header with dynamic origin
  const reportToHeader = {
    group: 'csp-endpoint',
    max_age: 10886400,
    endpoints: [{
      url: `${req.protocol}://${req.get('host')}/api/csp-report`
    }],
    include_subdomains: true
  };

  // Enhanced CSP violation reporting
  res.setHeader('Report-To', JSON.stringify(reportToHeader));

  // Use Report-Only in development, enforce in production
  const header = isDevelopment ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
  
  // Filter out null values for production
  const directives = Object.entries(cspConfig.directives)
    .filter(([_, value]) => value !== null)
    .map(([key, value]) => `${key} ${Array.isArray(value) ? value.join(' ') : value}`)
    .join('; ');
  
  res.setHeader(header, directives);
  next();
});

// Enhanced CSP violation reporting
app.post('/api/csp-report', (req, res) => {
  const violation = req.body['csp-report'] || req.body;
  logger.warn('CSP Violation:', {
    violation,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    path: req.path,
    timestamp: new Date().toISOString()
  });
  res.status(204).end();
});

// Apply security headers after CSP
app.use(addSecurityHeaders);

// Apply general rate limiter to all routes
app.use(apiLimiter);

// Apply CSRF protection to state-changing routes with development bypass option
const applyCSRF = (req, res, next) => {
  // Skip CSRF in development with bypass parameter
  if (process.env.NODE_ENV === 'development' && req.query.bypassCsrf === 'true') {
    logger.info(`Bypassing CSRF for development: ${req.method} ${req.originalUrl}`);
    return next();
  }
  // Otherwise apply CSRF protection
  return csrfProtection(req, res, next);
};

// Apply CSRF to state-changing routes
app.use('/api/orders', applyCSRF);
app.use('/api/payments', applyCSRF);
app.use('/api/bookings', applyCSRF);
app.use('/api/cart', applyCSRF);
app.use('/api/users', applyCSRF);
app.use('/api/admin', applyCSRF);
app.use('/api/manager', applyCSRF);
app.use('/api/menu-items', applyCSRF);
app.use('/api/menu', applyCSRF);

// CSRF error handler
app.use(handleCSRFError);

// Provide CSRF token for client - Keep this global route in addition to authRoutes
app.get('/api/csrf-token', csrfProtection, provideCSRFToken, (req, res) => {
  res.json({ 
    status: 'success',
    csrfToken: res.locals.csrfToken
  });
});

// Apply specific rate limiters to routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/orders/create', orderLimiter);

// Setup Swagger documentation
setupSwagger(app);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/inventory', inventoryRoutes);
// app.use('/api/promotions', promotionRoutes); // Commenting out missing route
// app.use('/api/notifications', notificationRoutes); // Commenting out missing route
app.use('/api/payments', paymentRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check endpoint (simple version kept for backward compatibility)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'Restaurant Management System API', 
    version: '1.0.0',
    documentation: '/api-docs'
  });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// Initialize services with retry logic
const initializeServices = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const db = await connectDB();
    if (!db) {
      console.warn('MongoDB connection failed. Running with limited functionality.');
      logger.warn('MongoDB connection failed. Running with limited functionality.');
    } else {
      console.log('MongoDB connection successful');
    }
    
    // Initialize scheduled tasks
    console.log('Initializing schedulers...');
    try {
      initSchedulers();
    } catch (schedulerError) {
      console.warn('Scheduler initialization error:', schedulerError.message);
      logger.warn(`Scheduler initialization error: ${schedulerError.message}`);
    }
    
    // Start server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
      console.log(`✅ Server successfully started on port ${PORT}`);
    });
    
    // Initialize WebSocket server
    console.log('Initializing WebSocket server...');
    try {
      initializeWebSocket(server);
    } catch (wsError) {
      console.warn('WebSocket initialization error:', wsError.message);
      logger.warn(`WebSocket initialization error: ${wsError.message}`);
    }

    // Start cron jobs
    if (process.env.ENABLE_CRON_JOBS === 'true') {
      try {
        // Schedule payment reconciliation job
        console.log('Scheduling cron jobs...');
        schedulePaymentReconciliation();
        logger.info('Cron jobs enabled and scheduled');
      } catch (cronError) {
        console.warn('Cron job initialization error:', cronError.message);
        logger.warn(`Cron job initialization error: ${cronError.message}`);
      }
    } else {
      logger.info('Cron jobs disabled. Set ENABLE_CRON_JOBS=true to enable.');
    }

    // Return the server instance for proper handling
    return server;
  } catch (error) {
    logger.error(`Failed to initialize services: ${error.message}`);
    console.error('Failed to initialize services:', error);
    
    // Try to start the server anyway
    const PORT = process.env.PORT || 5000;
    try {
      const server = app.listen(PORT, () => {
        logger.info(`Server running in limited mode on port ${PORT}`);
        console.log(`⚠️ Server started in limited mode on port ${PORT}`);
      });
      return server;
    } catch (serverError) {
      logger.error(`Could not start server: ${serverError.message}`);
      console.error('Could not start server:', serverError);
      throw serverError;
    }
  }
};

// Start the application
initializeServices();

// Global error handlers to prevent silent crashes
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { 
    stack: error.stack,
    name: error.name
  });
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(error.name, error.message);
  // Keep process alive but log the error
  // Optionally, exit after a grace period to allow logging
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise: promise,
    reason: reason
  });
  console.error('UNHANDLED REJECTION! 💥');
  console.error(reason);
  // Keep process alive but log the error
  // Optionally, exit after a grace period to allow logging
  // process.exit(1);
});

export default app; 