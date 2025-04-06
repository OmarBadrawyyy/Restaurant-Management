import csurf from 'csurf';
import logger from '../config/logger.js';

/**
 * CSRF protection middleware
 * Protects against Cross-Site Request Forgery attacks
 */
export const csrfProtection = csurf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  value: (req) => {
    // In development, allow bypassing CSRF in multiple ways
    if (process.env.NODE_ENV === 'development') {
      // Option 1: Special header bypass
      if (req.headers['x-debug-bypass-auth'] === 'true') {
        return 'development-bypass-token';
      }
      
      // Option 2: Query parameter bypass
      if (req.query.bypassCsrf === 'true') {
        return 'development-bypass-token';
      }
    }
    
    // Check for token in various headers for compatibility
    return req.headers['x-csrf-token'] || 
           req.headers['x-xsrf-token'] || 
           req.headers['csrf-token'];
  }
});

/**
 * Error handler for CSRF errors
 */
export const handleCSRFError = (err, req, res, next) => {
  // In development mode, bypass CSRF errors if debug conditions are met
  if (process.env.NODE_ENV === 'development') {
    // Check for header bypass
    if (req.headers['x-debug-bypass-auth'] === 'true') {
      logger.info('Development mode: Bypassing CSRF check via header');
      return next();
    }
    
    // Check for query parameter bypass
    if (req.query.bypassCsrf === 'true') {
      logger.info('Development mode: Bypassing CSRF check via query parameter');
      return next();
    }
  }

  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }

  // Handle CSRF token errors
  const headers = JSON.stringify(req.headers);
  const cookies = JSON.stringify(req.cookies);
  
  // Enhanced logging for CSRF errors
  logger.warn(`CSRF attack detected from IP: ${req.ip}, URL: ${req.originalUrl}`);
  
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`CSRF Debug - Headers: ${headers.substring(0, 500)}`);
    logger.debug(`CSRF Debug - Cookies: ${cookies}`);
    logger.debug(`CSRF Debug - Method: ${req.method}`);
    logger.debug(`CSRF Debug - X-CSRF-Token: ${req.headers['x-csrf-token'] || 'missing'}`);
  }
  
  res.status(403).json({
    status: 'error',
    message: 'Invalid or missing CSRF token. Please refresh the page and try again.'
  });
};

/**
 * Middleware to provide CSRF token to the client
 */
export const provideCSRFToken = (req, res, next) => {
  // Set CSRF token in response
  const token = req.csrfToken();
  
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Providing CSRF token: ${token.substring(0, 10)}...`);
  }
  
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // Client-side JavaScript needs to read this
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  });
  
  // Also send in response body for easier access
  res.locals.csrfToken = token;
  next();
};

export default {
  csrfProtection,
  handleCSRFError,
  provideCSRFToken
}; 