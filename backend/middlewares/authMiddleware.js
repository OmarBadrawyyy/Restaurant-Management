import jwt from 'jsonwebtoken';
import { userModel } from '../schemas/userSchema.js';
import logger from '../config/logger.js';
import NodeCache from 'node-cache';

// In-memory blacklist cache for revoked tokens
// In production, this should use Redis or another distributed cache
const tokenBlacklist = new NodeCache({ stdTTL: 86400 }); // 24 hour TTL

/**
 * Check if a string is a valid MongoDB ObjectId
 * @param {String} id - The string to check
 * @returns {Boolean} True if valid ObjectId format
 */
const isValidObjectId = (id) => {
  if (!id) return false;
  // ObjectId is a 24-character hex string
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Add token to blacklist
 * @param {String} token - JWT token to blacklist
 */
export const blacklistToken = (token) => {
  try {
    if (!token) return;
    
    // Extract expiration from token
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return;
    
    // Calculate TTL (time to live) from token expiration
    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;
    
    if (ttl > 0) {
      // Only add to blacklist if token is not already expired
      tokenBlacklist.set(token, true, ttl);
      logger.info(`Token blacklisted successfully`);
    }
  } catch (error) {
    logger.error(`Error blacklisting token: ${error.message}`);
  }
};

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header or cookies
 */
export const protect = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      logger.warn(`Authentication failed: No token provided - ${req.originalUrl}`);
      return res.status(401).json({
        status: 'error',
        message: 'Please log in to access this resource'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check token expiration
    if (decoded.exp < Date.now() / 1000) {
      logger.warn(`Authentication failed: Token expired - ${req.originalUrl}`);
      return res.status(401).json({
        status: 'error',
        message: 'Your session has expired. Please log in again.'
      });
    }

    // Check if user ID is a valid ObjectId
    if (!isValidObjectId(decoded.id)) {
      logger.warn(`Authentication failed: Invalid ObjectId format in token - ${req.originalUrl}`);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid session. Please log in again.'
      });
    }

    // Get user from token
    const user = await userModel.findById(decoded.id).select('-password');
    
    if (!user) {
      logger.warn(`Authentication failed: User not found - ${req.originalUrl}`);
      return res.status(401).json({
        status: 'error',
        message: 'User not found. Please log in again.'
      });
    }
    
    if (!user.isActive) {
      logger.warn(`Authentication failed: Deactivated account - ${req.originalUrl}`);
      return res.status(401).json({
        status: 'error',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }
    
    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message} - ${req.originalUrl}`);
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed. Please try again.'
    });
  }
};

/**
 * Role-based authorization middleware
 * @param  {...String} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn(`Authorization failed: No user in request - ${req.originalUrl}`);
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn(`Authorization failed: Insufficient permissions (${req.user.role}) - ${req.originalUrl}`);
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    
    next();
  };
};

/**
 * Middleware to restrict access to admin users only
 * Must be used after the protect middleware
 */
export const isAdmin = (req, res, next) => {
  try {
    // User should be attached by protect middleware
    if (!req.user) {
      logger.warn(`Admin authorization failed: No user in request - ${req.originalUrl}`);
      return res.status(401).json({ 
        status: 'error',
        message: 'Authentication required. Please log in.' 
      });
    }

    // Special case - allow managers to access specific endpoints needed for dashboard
    const isManagerAllowedPath = req.user.role === 'manager' && (
      req.originalUrl.includes('/api/orders/stats') || 
      req.originalUrl.includes('/api/users/all') ||
      req.originalUrl.includes('/api/bookings/all') || // Allow managers to access all bookings
      req.originalUrl.includes('/api/bookings/edit') || // Allow managers to edit bookings
      req.originalUrl.includes('/api/bookings/cancel-all') // Allow managers to cancel bookings
    );

    // Check if user has admin role or is a manager with special access
    if (req.user.role !== 'admin' && !isManagerAllowedPath) {
      logger.warn(`Admin authorization failed: Unauthorized access attempt by ${req.user.email} - ${req.originalUrl}`);
      return res.status(403).json({ 
        status: 'error',
        message: 'Access denied. Admin privileges required.' 
      });
    }

    // Log admin access for auditing
    logger.info(`Admin access: ${req.user.email} accessed ${req.originalUrl}`);
    
    // User is admin, proceed
    next();
  } catch (error) {
    logger.error(`Admin middleware error: ${error.message} - ${req.originalUrl}`);
    return res.status(500).json({ 
      status: 'error',
      message: 'Authorization process failed. Please try again.' 
    });
  }
};

/**
 * Middleware to restrict access to admin and manager users only
 * Must be used after the protect middleware
 */
export const isAdminOrManager = (req, res, next) => {
  try {
    // User should be attached by protect middleware
    if (!req.user) {
      logger.warn(`Manager/Admin authorization failed: No user in request - ${req.originalUrl}`);
      return res.status(401).json({ 
        status: 'error',
        message: 'Authentication required. Please log in.' 
      });
    }

    // Check if user has admin or manager role
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      logger.warn(`Manager/Admin authorization failed: Unauthorized access attempt by ${req.user.email} - ${req.originalUrl}`);
      return res.status(403).json({ 
        status: 'error',
        message: 'Access denied. Manager or Admin privileges required.' 
      });
    }

    // Log access for auditing
    logger.info(`Manager/Admin access: ${req.user.email} accessed ${req.originalUrl}`);
    
    // User is manager or admin, proceed
    next();
  } catch (error) {
    logger.error(`Manager/Admin middleware error: ${error.message} - ${req.originalUrl}`);
    return res.status(500).json({ 
      status: 'error',
      message: 'Authorization process failed. Please try again.' 
    });
  }
};

/**
 * Middleware to restrict access to staff, manager or admin users
 * Must be used after the protect middleware
 */
export const isStaffOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      status: 'error',
      message: 'Authentication required before checking staff status.' 
    });
  }
  
  const allowedRoles = ['staff', 'manager', 'admin'];
  if (!allowedRoles.includes(req.user.role)) {
    logger.warn(`Authorization failed: User ${req.user.email} attempted to access staff route - ${req.originalUrl}`);
    return res.status(403).json({ 
      status: 'error',
      message: 'Access denied. Staff privileges required.' 
    });
  }
  
  next();
};

/**
 * Middleware to restrict access based on user roles
 * @param {Array} roles - Array of allowed roles
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn(`Authorization failed: No user in request - ${req.originalUrl}`);
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Check if user's role is included in the allowed roles
    if (!roles.includes(req.user.role)) {
      logger.warn(`Authorization failed: User role ${req.user.role} not in allowed roles [${roles.join(', ')}] - ${req.originalUrl}`);
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }

    // Special handling for manager permissions on table routes
    if (req.user.role === 'manager' && req.originalUrl.startsWith('/api/tables')) {
      logger.info(`Manager access granted for table operations: ${req.user.email} - ${req.originalUrl}`);
    }

    next();
  };
};

/**
 * Debug middleware for customer issues API calls
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const debugCustomerIssuesRequests = (req, res, next) => {
  logger.debug(`Customer Issues API Request: ${req.method} ${req.originalUrl}`);
  
  if (req.method !== 'GET') {
    logger.debug('Request Body:', req.body);
  }
  
  // Create a timestamp for tracking
  req.requestTimestamp = new Date();
  
  // Capture the original send function
  const originalSend = res.send;
  
  // Override the send function to log responses
  res.send = function(body) {
    const responseTime = new Date() - req.requestTimestamp;
    logger.debug(`Customer Issues API Response [${responseTime}ms]: ${res.statusCode}`);
    
    // Call the original send function
    return originalSend.call(this, body);
  };
  
  next();
};
