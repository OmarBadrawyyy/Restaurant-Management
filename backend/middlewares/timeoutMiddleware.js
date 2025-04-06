import logger from '../config/logger.js';

/**
 * Middleware to handle request timeouts
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Function} Express middleware function
 */
const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    // Set a timeout for the request
    req.setTimeout(timeout, () => {
      logger.warn(`Request timeout: ${req.method} ${req.originalUrl}`);
      
      // Only send a response if one hasn't been sent yet
      if (!res.headersSent) {
        res.status(503).json({
          status: 'error',
          message: 'Request timed out. Please try again later.'
        });
      }
    });
    
    next();
  };
};

export default requestTimeout; 