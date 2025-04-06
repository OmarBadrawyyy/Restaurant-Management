import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import validator from 'validator';

// Initialize DOMPurify with a virtual DOM
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Enhanced sanitization for HTML content using DOMPurify + validator
 * Provides multiple layers of protection against XSS attacks
 * 
 * @param {string} content - The content to sanitize
 * @param {boolean} allowBasicFormatting - Whether to allow basic HTML formatting (default: false)
 * @returns {string} Sanitized content
 */
export const sanitizeHTML = (content, allowBasicFormatting = false) => {
  if (!content) return '';
  
  // First layer: Run through validator's escape
  let sanitized = validator.escape(content.toString());
  
  // Second layer: If basic formatting is allowed, clean with DOMPurify
  if (allowBasicFormatting) {
    // Config for allowing only basic formatting tags
    const config = {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
      FORBID_CONTENTS: ['script', 'style', 'iframe', 'form', 'input', 'object', 'embed', 'link'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'object', 'embed', 'link'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'style'],
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
      WHOLE_DOCUMENT: false,
      SANITIZE_DOM: true
    };
    
    // Unescape first since we want to allow some HTML tags
    const unescaped = validator.unescape(sanitized);
    
    // Then clean with DOMPurify
    sanitized = DOMPurify.sanitize(unescaped, config);
  }
  
  return sanitized;
};

/**
 * Sanitize a URL to prevent XSS and other injection attacks
 * 
 * @param {string} url - The URL to sanitize
 * @returns {string|null} Sanitized URL or null if invalid
 */
export const sanitizeURL = (url) => {
  if (!url) return null;
  
  try {
    // Validate URL format
    if (!validator.isURL(url, { protocols: ['http', 'https'], require_protocol: true })) {
      return null;
    }
    
    // Parse URL to remove any script or data URI
    const urlObj = new URL(url);
    
    // Check for javascript: or data: protocols that could be used for XSS
    if (urlObj.protocol === 'javascript:' || urlObj.protocol === 'data:') {
      return null;
    }
    
    // Validate hostname (extra layer of protection)
    if (!validator.isFQDN(urlObj.hostname)) {
      return null;
    }
    
    // Return the cleaned URL
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return null
    return null;
  }
};

/**
 * Sanitize an object's string properties recursively
 * 
 * @param {Object} obj - The object to sanitize
 * @returns {Object} Sanitized object
 */
export const sanitizeObject = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeHTML(value);
      } else if (value === null || typeof value !== 'object') {
        sanitized[key] = value;
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
  }
  
  return sanitized;
};

/**
 * Sanitize input data for notifications and other user inputs
 * Uses appropriate sanitization based on data type
 * 
 * @param {Object} data - The input data to sanitize
 * @returns {Object} Sanitized data object
 */
export const sanitizeInput = (data) => {
  if (!data) return {};
  
  // Clone the data to avoid modifying the original
  const sanitized = { ...data };
  
  // Sanitize text fields
  if (sanitized.title) sanitized.title = sanitizeHTML(sanitized.title);
  if (sanitized.message) sanitized.message = sanitizeHTML(sanitized.message, true);
  if (sanitized.actionText) sanitized.actionText = sanitizeHTML(sanitized.actionText);
  
  // Sanitize URL fields
  if (sanitized.actionUrl) sanitized.actionUrl = sanitizeURL(sanitized.actionUrl);
  
  // Pass through ObjectIds without modification
  // But validate they're string format if present
  const idFields = ['recipient', 'relatedOrder', 'relatedReservation', 
                    'relatedPromotion', 'relatedPayment'];
  
  idFields.forEach(field => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      // Basic format validation for MongoDB ObjectId
      if (!/^[0-9a-fA-F]{24}$/.test(sanitized[field])) {
        sanitized[field] = null;
      }
    }
  });
  
  // Handle arrays like sentVia
  if (Array.isArray(sanitized.sentVia)) {
    sanitized.sentVia = sanitized.sentVia.filter(item => 
      typeof item === 'string' && ['app', 'email', 'sms', 'push'].includes(item)
    );
  }
  
  // Preserve dates
  if (sanitized.expiresAt && sanitized.expiresAt instanceof Date) {
    // Keep as is
  } else if (sanitized.expiresAt) {
    // Try to parse as date if it's a string
    try {
      sanitized.expiresAt = new Date(sanitized.expiresAt);
      // Check if valid date
      if (isNaN(sanitized.expiresAt.getTime())) {
        delete sanitized.expiresAt;
      }
    } catch (error) {
      delete sanitized.expiresAt;
    }
  }
  
  return sanitized;
};

// Export all sanitization functions
export default {
  sanitizeHTML,
  sanitizeURL,
  sanitizeObject,
  sanitizeInput
}; 