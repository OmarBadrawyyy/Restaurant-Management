import Joi from 'joi';
import logger from '../config/logger.js';
import { notificationSchemas } from '../schemas/validationSchemas.js';
import validator from 'validator';
import mongoose from 'mongoose';
import { sanitizeHTML, sanitizeURL, sanitizeObject } from '../utils/sanitizer.js';

/**
 * Middleware factory for request validation
 * @param {Object} schema - Joi validation schema
 * @param {String} property - Request property to validate (body, params, query)
 * @returns {Function} Express middleware function
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (!error) {
      return next();
    }

    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    logger.warn(`Validation error: ${JSON.stringify(validationErrors)}`);
    
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: validationErrors
    });
  };
};

/**
 * Middleware for validating notification-related requests
 */
export const validateNotification = {
  settings: validate(notificationSchemas.settings),
  markRead: validate(notificationSchemas.markRead, 'params')
};

/**
 * Middleware to validate feedback input with enhanced sanitization
 */
export const validateFeedbackInput = (req, res, next) => {
  // Sanitize all input data
  req.body = sanitizeObject(req.body);
  
  // Required fields
  const { rating, comment } = req.body;
  const errors = [];

  // Validate rating
  if (rating === undefined) {
    errors.push('Rating is required');
  } else if (isNaN(rating) || rating < 1 || rating > 5) {
    errors.push('Rating must be a number between 1 and 5');
  }

  // Validate comment if provided
  if (comment !== undefined && comment !== null) {
    // Check length restriction
    if (comment.length > 1000) {
      errors.push('Comment cannot exceed 1000 characters');
    }
  }

  // Validate photos if provided
  const { photos } = req.body;
  if (photos && Array.isArray(photos)) {
    // Check array length
    if (photos.length > 5) {
      errors.push('Cannot upload more than 5 photos');
    }
    
    // Validate each URL
    photos.forEach((url, index) => {
      const sanitizedUrl = sanitizeURL(url);
      if (!sanitizedUrl) {
        errors.push(`Photo URL at position ${index + 1} is invalid`);
      } else {
        // Replace with sanitized URL
        photos[index] = sanitizedUrl;
      }
    });
  }

  // Validate tags if provided
  const { tags } = req.body;
  if (tags && Array.isArray(tags)) {
    // Check array length
    if (tags.length > 10) {
      errors.push('Cannot add more than 10 tags');
    }
    
    // Validate each tag
    tags.forEach((tag, index) => {
      if (tag.length > 20) {
        errors.push(`Tag at position ${index + 1} cannot exceed 20 characters`);
      }
      
      // Sanitize tag
      tags[index] = sanitizeHTML(tag);
    });
  }

  // Return errors if any
  if (errors.length > 0) {
    logger.warn('Feedback validation failed', { 
      userId: req.user?._id,
      errors 
    });
    
    return res.status(400).json({
      message: 'Validation failed',
      errors
    });
  }

  // Proceed to the next middleware/controller
  next();
};

export const validateTableInput = (req, res, next) => {
    // Only validate if there's a body (for POST/PUT requests)
    if (Object.keys(req.body).length > 0) {
        // Required fields check for create operation
        if (req.method === 'POST' && (!req.body.tableNumber || !req.body.capacity)) {
            return res.status(400).json({
                status: 'error',
                message: 'Table number and capacity are required'
            });
        }

        // Validate tableNumber
        if (req.body.tableNumber !== undefined) {
            const tableNumber = Number(req.body.tableNumber);
            if (isNaN(tableNumber) || !Number.isInteger(tableNumber) || tableNumber <= 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Table number must be a positive integer'
                });
            }
        }

        // Validate capacity
        if (req.body.capacity !== undefined) {
            const capacity = Number(req.body.capacity);
            if (isNaN(capacity) || !Number.isInteger(capacity) || capacity <= 0 || capacity > 50) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Capacity must be a positive integer between 1 and 50'
                });
            }
        }

        // Validate minSpendRequired
        if (req.body.minSpendRequired !== undefined) {
            const minSpend = Number(req.body.minSpendRequired);
            if (isNaN(minSpend) || minSpend < 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Minimum spend required cannot be negative'
                });
            }
        }

        // Validate status
        if (req.body.status !== undefined && 
            !['available', 'occupied', 'reserved', 'maintenance'].includes(req.body.status)) {
            return res.status(400).json({
                status: 'error',
                message: 'Status must be one of: available, occupied, reserved, maintenance'
            });
        }

        // Validate section
        if (req.body.section !== undefined && 
            !['indoor', 'outdoor', 'bar', 'private', 'terrace', 'window'].includes(req.body.section)) {
            return res.status(400).json({
                status: 'error',
                message: 'Section must be one of: indoor, outdoor, bar, private, terrace, window'
            });
        }

        // Validate shape
        if (req.body.shape !== undefined && 
            !['round', 'square', 'rectangular', 'oval'].includes(req.body.shape)) {
            return res.status(400).json({
                status: 'error',
                message: 'Shape must be one of: round, square, rectangular, oval'
            });
        }

        // Validate features (if present)
        if (req.body.features !== undefined) {
            if (!Array.isArray(req.body.features)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Features must be an array'
                });
            }

            const validFeatures = ['wheelchair_accessible', 'near_window', 'quiet', 'near_kitchen', 'near_bathroom', 'private'];
            const invalidFeatures = req.body.features.filter(feature => !validFeatures.includes(feature));
            
            if (invalidFeatures.length > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: `Invalid features: ${invalidFeatures.join(', ')}`,
                    validFeatures
                });
            }
        }
    }

    // If validation passes or no body to validate, continue
    next();
};

/**
 * Validate menu input
 */
export const validateMenuInput = (req, res, next) => {
  const { name, description, category, items, isActive, startDate, endDate } = req.body;
  const errors = [];

  // Validate required fields
  if (!name) errors.push('Menu name is required');
  if (!category) errors.push('Menu category is required');
  if (!Array.isArray(items) || items.length === 0) errors.push('Menu must contain at least one item');

  // Validate name length
  if (name && (name.length < 2 || name.length > 50)) {
    errors.push('Menu name must be between 2 and 50 characters');
  }

  // Validate description length if provided
  if (description && description.length > 500) {
    errors.push('Description cannot exceed 500 characters');
  }

  // Validate category
  const validCategories = ['breakfast', 'lunch', 'dinner', 'special', 'drinks', 'dessert'];
  if (category && !validCategories.includes(category)) {
    errors.push(`Category must be one of: ${validCategories.join(', ')}`);
  }

  // Validate dates if provided
  if (startDate && !isValidDate(startDate)) {
    errors.push('Invalid start date format');
  }
  if (endDate && !isValidDate(endDate)) {
    errors.push('Invalid end date format');
  }
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    errors.push('Start date cannot be after end date');
  }

  // Validate items array
  if (Array.isArray(items)) {
    items.forEach((item, index) => {
      if (!item.itemId) {
        errors.push(`Item at position ${index + 1} must have an itemId`);
      }
      if (item.price && (isNaN(item.price) || item.price < 0)) {
        errors.push(`Invalid price for item at position ${index + 1}`);
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Validate category parameter
 */
export const validateCategoryParam = (req, res, next) => {
  const { category } = req.params;
  const validCategories = ['starter', 'main', 'dessert', 'drink', 'special'];
  
  if (!category || !validCategories.includes(category.toLowerCase())) {
    return res.status(400).json({
      status: 'error',
      message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
    });
  }
  
  next();
};

/**
 * Validate ID parameter
 */
export const validateIdParam = (req, res, next) => {
    const { tableNumber } = req.params;
    
    // Check if tableNumber exists
    if (!tableNumber) {
        logger.warn('Missing table number parameter');
        return res.status(400).json({
            status: 'error',
            message: 'Table number is required'
        });
    }

    // Convert to number and validate
    const parsedTableNumber = parseInt(tableNumber, 10);
    if (isNaN(parsedTableNumber) || parsedTableNumber <= 0) {
        logger.warn(`Invalid table number format: ${tableNumber}`);
        return res.status(400).json({
            status: 'error',
            message: 'Table number must be a positive integer'
        });
    }

    // Store the parsed number for later use
    req.params.tableNumber = parsedTableNumber;
    next();
};

/**
 * Validate MongoDB ObjectIDs in request parameters and query
 * This middleware provides robust validation for ObjectIDs, using a more reliable
 * technique that prevents false positives from the standard isValid() method
 */
export const validateObjectIds = (req, res, next) => {
  // List of all parameter names that might be ObjectIds
  const objectIdParams = ['userId', 'itemId', 'orderId', 'menuId', 'bookingId', 'tableId', 'id'];
  const invalidParams = [];

  // Helper function with enhanced ObjectId validation
  const isValidObjectId = (id) => {
    // First check with mongoose's isValid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }
    
    // Additional check to ensure it's truly a valid ObjectId by converting to ObjectId and back
    // This prevents false positives from strings like '12345' that pass the basic isValid check
    try {
      return new mongoose.Types.ObjectId(id).toString() === id;
    } catch (err) {
      return false;
    }
  };

  // Check route parameters
  if (req.params) {
    Object.keys(req.params).forEach(param => {
      if (objectIdParams.includes(param) && req.params[param] && !isValidObjectId(req.params[param])) {
        invalidParams.push(param);
      }
    });
  }

  // Also check query string parameters
  if (req.query) {
    Object.keys(req.query).forEach(param => {
      if (objectIdParams.includes(param) && req.query[param] && !isValidObjectId(req.query[param])) {
        invalidParams.push(param);
      }
    });
  }

  // Return error if invalid parameters found
  if (invalidParams.length > 0) {
    logger.warn(`Invalid ObjectId format in request: ${invalidParams.join(', ')}`);
    return res.status(400).json({
      success: false,
      message: `Invalid order ID format for parameter(s): ${invalidParams.join(', ')}`
    });
  }

  next();
};

// Helper function to validate date format
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Validate menu item input
 */
export const validateMenuItemInput = (req, res, next) => {
  const { name, description, price, category, allergens, nutritionalInfo, availability } = req.body;
  const errors = [];

  // Validate required fields
  if (!name) errors.push('Item name is required');
  if (!price) errors.push('Price is required');
  if (!category) errors.push('Category is required');

  // Validate name
  if (name && (name.length < 2 || name.length > 100)) {
    errors.push('Item name must be between 2 and 100 characters');
  }

  // Validate description if provided
  if (description && description.length > 1000) {
    errors.push('Description cannot exceed 1000 characters');
  }

  // Validate price
  if (price !== undefined) {
    if (isNaN(price) || price < 0) {
      errors.push('Price must be a positive number');
    }
  }

  // Validate category
  const validCategories = ['appetizer', 'main', 'dessert', 'beverage', 'side', 'special'];
  if (category && !validCategories.includes(category.toLowerCase())) {
    errors.push(`Category must be one of: ${validCategories.join(', ')}`);
  }

  // Validate allergens if provided
  if (allergens && Array.isArray(allergens)) {
    const validAllergens = ['nuts', 'dairy', 'eggs', 'soy', 'wheat', 'fish', 'shellfish', 'peanuts'];
    allergens.forEach(allergen => {
      if (!validAllergens.includes(allergen)) {
        errors.push(`Invalid allergen: ${allergen}. Valid allergens are: ${validAllergens.join(', ')}`);
      }
    });
  }

  // Validate nutritional info if provided
  if (nutritionalInfo) {
    const requiredNutritionalFields = ['calories', 'protein', 'carbohydrates', 'fat'];
    requiredNutritionalFields.forEach(field => {
      if (nutritionalInfo[field] !== undefined) {
        if (isNaN(nutritionalInfo[field]) || nutritionalInfo[field] < 0) {
          errors.push(`${field} must be a positive number`);
        }
      }
    });
  }

  // Validate availability if provided
  if (availability !== undefined && typeof availability !== 'boolean') {
    errors.push('Availability must be a boolean value');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors
    });
  }

  next();
};

export default validate; 