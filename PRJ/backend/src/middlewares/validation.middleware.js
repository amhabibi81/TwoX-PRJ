import Joi from 'joi';

/**
 * Generic validation middleware
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - Source of data: 'body', 'query', or 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    
    // For query params, allow empty object if no params provided
    if (source === 'query' && (!data || Object.keys(data).length === 0)) {
      return next();
    }
    
    const { error, value } = schema.validate(data, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      allowUnknown: false // Don't allow unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Validate request body
 */
export const validateBody = (schema) => {
  return validate(schema, 'body');
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema) => {
  return validate(schema, 'query');
};

/**
 * Validate URL parameters
 */
export const validateParams = (schema) => {
  return validate(schema, 'params');
};

export default validate;
