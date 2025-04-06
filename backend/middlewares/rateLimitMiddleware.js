import rateLimit from 'express-rate-limit';
import logger from '../config/logger.js';

/**
 * Create a rate limiter middleware with specified options
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware
 */
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 250, // Increased from 100 to 250 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests, please try again later.',
    handler: (req, res, next, options) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
        ip: req.ip,
        path: req.originalUrl,
        method: req.method,
        headers: req.headers['user-agent']
      });
      
      res.status(options.statusCode).json({
        status: 'error',
        message: options.message
      });
    },
    skip: (req, res) => {
      // Skip rate limiting if SKIP_RATE_LIMIT is true
      if (process.env.SKIP_RATE_LIMIT === 'true') {
        logger.debug('Skipping rate limit due to SKIP_RATE_LIMIT=true');
        return true;
      }
      
      // Skip rate limiting for development environments
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      
      return false;
    }
  };

  // Always use memory store since Redis is removed
  return rateLimit({
    ...defaultOptions,
    ...options
  });
};

/**
 * General API rate limiter
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute (was 15 minutes)
  max: 300, // Increased from 100 to 300
  message: 'Too many API requests, please try again later.'
});
export const apiLimiter = apiRateLimiter;

/**
 * Authentication rate limiter - Very strict to prevent brute force attacks
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Increased from 5 to 10
  message: 'Too many login attempts, please try again after an hour.',
  skipSuccessfulRequests: true
});
export const authLimiter = authRateLimiter;

/**
 * Cart API rate limiter - More strict since cart operations can be resource-intensive
 */
export const cartRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 120, // Increased from 60 to 120
  message: 'Too many cart operations, please try again in a few minutes.'
});

/**
 * Order creation rate limiter
 * Prevents abuse of order creation endpoints
 */
export const orderRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Increased from 10 to 20
  message: 'Order limit reached, please try again later'
});
export const orderLimiter = orderRateLimiter;

/**
 * Feedback submission rate limiter
 * Prevents spam in feedback/review submissions
 */
export const feedbackRateLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10, // Increased from 5 to 10
  message: 'Feedback submission limit reached, please try again tomorrow'
});
export const feedbackLimiter = feedbackRateLimiter;

/**
 * Table routes rate limiter
 */
export const tableRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased from 100 to 200
  message: 'Too many table operations, please try again later.',
});
export const tableLimiter = tableRateLimiter;

/**
 * Menu routes rate limiter
 */
export const menuRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased from 100 to 200
  message: 'Too many menu operations, please try again later.',
});
export const menuLimiter = menuRateLimiter;

/**
 * Menu item routes rate limiter
 */
export const menuItemRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased from 100 to 200
  message: 'Too many menu item operations, please try again later.',
});
export const menuItemLimiter = menuItemRateLimiter;

/**
 * Notification routes rate limiter
 */
export const notificationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased from 100 to 200
  message: 'Too many notification operations, please try again later.',
});
export const notificationLimiter = notificationRateLimiter;

/**
 * Booking routes rate limiter
 * Prevents abuse of booking system
 */
export const bookingRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Increased from 15 to 30
  message: 'Too many booking operations, please try again later.'
});
export const bookingLimiter = bookingRateLimiter;

/**
 * Payment API rate limiter
 * Prevents abuse of payment endpoints and potential fraud
 */
export const paymentRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40, // Increased from 20 to 40
  message: 'Too many payment requests, please try again later.',
});
export const paymentLimiter = paymentRateLimiter;

export default {
  apiRateLimiter,
  apiLimiter,
  authRateLimiter,
  authLimiter,
  cartRateLimiter,
  orderRateLimiter,
  orderLimiter,
  feedbackRateLimiter,
  feedbackLimiter,
  tableRateLimiter,
  tableLimiter,
  menuRateLimiter,
  menuLimiter,
  menuItemRateLimiter,
  menuItemLimiter,
  notificationRateLimiter,
  notificationLimiter,
  bookingRateLimiter,
  bookingLimiter,
  paymentRateLimiter,
  paymentLimiter
}; 