import logger from '../config/logger.js';
import timeout from 'express-timeout-handler';
import slowDown from 'express-slow-down';
import rateLimit from 'express-rate-limit';
import csrf from 'csurf';

/**
 * Middleware to add Content Security Policy headers
 */
export const addSecurityHeaders = (req, res, next) => {
  // Add Content Security Policy headers
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'"
  );
  
  // Add other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
};

/**
 * Request timeout middleware to prevent long-running operations
 * Default timeout: 15 seconds
 */
export const requestTimeout = timeout.handler({
  timeout: 15000,
  onTimeout: (req, res) => {
    logger.warn('Request timeout', { 
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });
    
    res.status(503).json({
      message: 'Request timeout - operation took too long to complete'
    });
  }
});

/**
 * Rate limiting with slowdown - adds increasing delay to requests as they approach the limit
 * For API endpoints that might be abused
 */
export const requestSlowdown = slowDown({
  windowMs: 5 * 60 * 1000, // 5 minutes
  delayAfter: 20, // allow 20 requests per 5 minutes, then start slowing down
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 500;
  }, // Fixed according to warning recommendation
  maxDelayMs: 5000, // maximum delay is 5 seconds
  skipSuccessfulRequests: false,
  // onLimitReached removed as it's deprecated
  validate: {
    delayMs: false // Disable the warning
  }
});

/**
 * Suspicious activity detection for feedback submissions
 */
const suspiciousActivityMap = new Map();

export const detectSuspiciousActivity = (req, res, next) => {
  const userId = req.user?._id?.toString() || 'anonymous';
  const ip = req.ip;
  const key = `${userId}:${ip}`;
  
  // Get or initialize user activity tracking
  const activity = suspiciousActivityMap.get(key) || {
    count: 0,
    firstActivity: Date.now(),
    lastActivity: Date.now(),
    isFlagged: false
  };
  
  // Update activity tracking
  activity.count += 1;
  activity.lastActivity = Date.now();
  
  // Check for suspicious patterns
  const timeWindow = 10 * 60 * 1000; // 10 minutes
  const maxAllowedInWindow = 15; // Maximum allowed submissions in window
  const timeSinceFirst = activity.lastActivity - activity.firstActivity;
  
  if (timeSinceFirst <= timeWindow && activity.count > maxAllowedInWindow) {
    activity.isFlagged = true;
    
    logger.warn('Suspicious feedback activity detected', {
      userId,
      ip,
      count: activity.count,
      timeWindow: timeSinceFirst,
      route: req.originalUrl,
      method: req.method
    });
    
    // We allow the request to proceed but flag it for review
    req.suspiciousActivity = true;
  }
  
  // Reset counter if outside time window
  if (timeSinceFirst > timeWindow) {
    activity.count = 1;
    activity.firstActivity = Date.now();
    activity.isFlagged = false;
  }
  
  // Store updated activity data
  suspiciousActivityMap.set(key, activity);
  
  // Clean up old entries every hour
  const cleanupInterval = 60 * 60 * 1000; // 1 hour
  if (!global.suspiciousActivityCleanupSet) {
    global.suspiciousActivityCleanupSet = true;
    setInterval(() => {
      const now = Date.now();
      for (const [mapKey, mapValue] of suspiciousActivityMap.entries()) {
        if (now - mapValue.lastActivity > cleanupInterval) {
          suspiciousActivityMap.delete(mapKey);
        }
      }
    }, cleanupInterval);
  }
  
  next();
};

/**
 * CSRF Protection middleware
 * Protects against Cross-Site Request Forgery attacks
 */
export const csrfProtection = csrf({
  cookie: {
    key: '_csrf',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    httpOnly: true
  }
});

/**
 * Error handler for CSRF token validation
 */
export const handleCSRFError = (err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);

  logger.warn(`Invalid CSRF token: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(403).json({
    status: 'error',
    message: 'Invalid or missing CSRF token'
  });
};

/**
 * Security headers middleware
 * Sets various HTTP security headers
 */
export const securityHeaders = (req, res, next) => {
  // HSTS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';");
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Frame Options
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  next();
};

/**
 * Request sanitization middleware
 * Sanitizes request parameters
 */
export const sanitizeRequest = (req, res, next) => {
  const sanitize = (obj) => {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        // Remove potentially dangerous characters
        obj[key] = obj[key]
          .replace(/[<>]/g, '') // Remove < and >
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+=/gi, '') // Remove inline event handlers
          .trim();
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    });
  };

  // Sanitize query parameters
  if (req.query) sanitize(req.query);
  
  // Sanitize body parameters
  if (req.body) sanitize(req.body);
  
  next();
};

/**
 * IP filtering middleware
 * Blocks requests from banned IPs
 */
export const ipFilter = (req, res, next) => {
  const bannedIPs = process.env.BANNED_IPS ? process.env.BANNED_IPS.split(',') : [];
  
  if (bannedIPs.includes(req.ip)) {
    logger.warn(`Blocked request from banned IP: ${req.ip}`);
    return res.status(403).json({
      status: 'error',
      message: 'Access denied'
    });
  }
  
  next();
}; 