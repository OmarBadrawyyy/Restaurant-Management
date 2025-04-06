import NodeCache from 'node-cache';
import logger from '../config/logger.js';

// Create a cache instance with default TTL of 5 minutes
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Middleware to cache API responses
 * @param {number} ttl - Time to live in seconds
 * @returns {Function} Express middleware function
 */
export const cacheMiddleware = (ttl = 300) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create a cache key from the request URL
    const key = req.originalUrl;
    
    // Check if we have a cached response
    const cachedResponse = cache.get(key);
    
    if (cachedResponse) {
      logger.debug(`Cache hit for: ${key}`);
      return res.status(200).json(cachedResponse);
    }

    // Store the original send function
    const originalSend = res.json;
    
    // Override the json method to cache the response
    res.json = function(body) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logger.debug(`Caching response for: ${key}`);
        cache.set(key, body, ttl);
      }
      
      // Call the original json method
      return originalSend.call(this, body);
    };
    
    next();
  };
};

/**
 * Middleware for clearing cache when data changes
 * @param {string|Array} keys - Single key or array of keys to clear
 * @returns {Function} Express middleware function
 */
export const clearCache = (keys = null) => {
  return (req, res, next) => {
    // After the request is processed, clear the cache
    res.on('finish', () => {
      if (keys === null) {
        cache.flushAll();
        logger.info('Cleared entire cache');
      } else if (Array.isArray(keys)) {
        keys.forEach(key => {
          cache.del(key);
        });
        logger.info(`Cleared cache for key: ${keys.join(',')}`);
      } else {
        cache.del(keys);
        logger.info(`Cleared cache for key: ${keys}`);
      }
    });
    
    next();
  };
}; 