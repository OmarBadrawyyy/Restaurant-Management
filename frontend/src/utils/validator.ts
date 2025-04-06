/**
 * Form validation utility to match backend validation rules
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  min?: number;
  max?: number;
  match?: string;
  customValidator?: (value: any, formValues?: Record<string, any>) => boolean | string;
  message?: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface ValidationErrors {
  [key: string]: string;
}

// Email regex pattern
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Phone number regex pattern
const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;

// Password regex pattern (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// Common validation rules
export const VALIDATION_RULES = {
  required: { required: true, message: 'This field is required' },
  email: { email: true, pattern: EMAIL_PATTERN, message: 'Please enter a valid email address' },
  phone: { pattern: PHONE_PATTERN, message: 'Please enter a valid phone number' },
  password: { 
    pattern: PASSWORD_PATTERN, 
    minLength: 8,
    message: 'Password must be at least 8 characters and include uppercase, lowercase, and numbers' 
  },
  name: { minLength: 2, maxLength: 50, message: 'Name must be between 2 and 50 characters' },
  username: { minLength: 3, maxLength: 30, message: 'Username must be between 3 and 30 characters' },
  positiveNumber: { min: 0, message: 'Value must be a positive number' },
};

/**
 * Validate a single field
 */
export const validateField = (value: any, rules: ValidationRule, formValues?: Record<string, any>): string | null => {
  // Check if required
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return rules.message || 'This field is required';
  }

  // Skip further validation if value is empty and not required
  if (!value && !rules.required) {
    return null;
  }

  // Check min length
  if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
    return rules.message || `Minimum length is ${rules.minLength} characters`;
  }

  // Check max length
  if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
    return rules.message || `Maximum length is ${rules.maxLength} characters`;
  }

  // Check pattern
  if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
    return rules.message || 'Invalid format';
  }

  // Check email format
  if (rules.email && typeof value === 'string' && !EMAIL_PATTERN.test(value)) {
    return rules.message || 'Please enter a valid email address';
  }

  // Check min value
  if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
    return rules.message || `Minimum value is ${rules.min}`;
  }

  // Check max value
  if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
    return rules.message || `Maximum value is ${rules.max}`;
  }

  // Custom validator
  if (rules.customValidator) {
    const result = rules.customValidator(value, formValues);
    if (typeof result === 'string') {
      return result;
    }
    if (result === false) {
      return rules.message || 'Invalid value';
    }
  }

  return null;
};

/**
 * Validate a form with multiple fields
 */
export const validateForm = (values: Record<string, any>, rules: ValidationRules): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.keys(rules).forEach(fieldName => {
    const fieldValue = values[fieldName];
    const fieldRules = rules[fieldName];
    
    const error = validateField(fieldValue, fieldRules, values);
    if (error) {
      errors[fieldName] = error;
    }
    
    // Check if field needs to match another field (like password confirmation)
    if (fieldRules.match && values[fieldRules.match] !== fieldValue) {
      errors[fieldName] = fieldRules.message || `Must match ${fieldRules.match}`;
    }
  });

  return errors;
};

/**
 * Check if the form has any validation errors
 */
export const hasErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};

const validator = {
  validateField,
  validateForm,
  hasErrors,
  VALIDATION_RULES
};

export default validator; 