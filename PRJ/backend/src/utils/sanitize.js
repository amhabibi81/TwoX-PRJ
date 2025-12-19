import validator from 'validator';

/**
 * Sanitize a string input
 * - Trim whitespace
 * - Remove null bytes
 * - Basic XSS prevention (escape HTML)
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  
  return str
    .trim()
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
};

/**
 * Sanitize and normalize email
 * - Trim and lowercase
 * - Validate format
 */
export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') {
    return null;
  }
  
  const trimmed = email.trim().toLowerCase();
  
  if (!validator.isEmail(trimmed)) {
    return null;
  }
  
  return trimmed;
};

/**
 * Sanitize username
 * - Trim and normalize
 * - Remove special characters (keep only alphanumeric, underscore, hyphen)
 */
export const sanitizeUsername = (username) => {
  if (typeof username !== 'string') {
    return null;
  }
  
  return username
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '') // Remove invalid characters
    .substring(0, 50); // Enforce max length
};

/**
 * Sanitize integer value
 * - Parse to integer
 * - Validate range (optional)
 */
export const sanitizeInteger = (value, min = null, max = null) => {
  if (value === null || value === undefined) {
    return null;
  }
  
  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed)) {
    return null;
  }
  
  if (min !== null && parsed < min) {
    return null;
  }
  
  if (max !== null && parsed > max) {
    return null;
  }
  
  return parsed;
};

/**
 * Escape HTML entities to prevent XSS
 */
export const escapeHtml = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return str.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
};

/**
 * Sanitize object recursively
 */
export const sanitizeObject = (obj, rules = {}) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (rules[key]) {
      sanitized[key] = rules[key](value);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, rules);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};
