import Joi from 'joi';

/**
 * Validation schemas for all API inputs
 */

// Username: 3-50 chars, alphanumeric + underscore/hyphen
const usernameSchema = Joi.string()
  .min(3)
  .max(50)
  .pattern(/^[a-zA-Z0-9_-]+$/)
  .required()
  .messages({
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username must not exceed 50 characters',
    'string.pattern.base': 'Username can only contain letters, numbers, underscores, and hyphens',
    'any.required': 'Username is required'
  });

// Email: Valid email format, max 255 chars
const emailSchema = Joi.string()
  .email({ tlds: { allow: false } })
  .max(255)
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'string.max': 'Email must not exceed 255 characters',
    'any.required': 'Email is required'
  });

// Password: Min 6 chars, max 128 chars
const passwordSchema = Joi.string()
  .min(6)
  .max(128)
  .required()
  .messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'any.required': 'Password is required'
  });

// Month: Integer 1-12
const monthSchema = Joi.number()
  .integer()
  .min(1)
  .max(12)
  .required()
  .messages({
    'number.base': 'Month must be a number',
    'number.integer': 'Month must be an integer',
    'number.min': 'Month must be between 1 and 12',
    'number.max': 'Month must be between 1 and 12',
    'any.required': 'Month is required'
  });

// Year: Integer 2000-3000
const yearSchema = Joi.number()
  .integer()
  .min(2000)
  .max(3000)
  .required()
  .messages({
    'number.base': 'Year must be a number',
    'number.integer': 'Year must be an integer',
    'number.min': 'Year must be between 2000 and 3000',
    'number.max': 'Year must be between 2000 and 3000',
    'any.required': 'Year is required'
  });

// QuestionId: Positive integer
const questionIdSchema = Joi.number()
  .integer()
  .positive()
  .required()
  .messages({
    'number.base': 'Question ID must be a number',
    'number.integer': 'Question ID must be an integer',
    'number.positive': 'Question ID must be a positive number',
    'any.required': 'Question ID is required'
  });

// Score: Integer 1-5
const scoreSchema = Joi.number()
  .integer()
  .min(1)
  .max(5)
  .required()
  .messages({
    'number.base': 'Score must be a number',
    'number.integer': 'Score must be an integer',
    'number.min': 'Score must be between 1 and 5',
    'number.max': 'Score must be between 1 and 5',
    'any.required': 'Score is required'
  });

// Optional month/year for query parameters
const optionalMonthSchema = Joi.number()
  .integer()
  .min(1)
  .max(12)
  .optional()
  .messages({
    'number.base': 'Month must be a number',
    'number.integer': 'Month must be an integer',
    'number.min': 'Month must be between 1 and 12',
    'number.max': 'Month must be between 1 and 12'
  });

const optionalYearSchema = Joi.number()
  .integer()
  .min(2000)
  .max(3000)
  .optional()
  .messages({
    'number.base': 'Year must be a number',
    'number.integer': 'Year must be an integer',
    'number.min': 'Year must be between 2000 and 3000',
    'number.max': 'Year must be between 2000 and 3000'
  });

/**
 * Signup validation schema
 */
export const signupSchema = Joi.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema
});

/**
 * Login validation schema
 */
export const loginSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema
});

/**
 * Team generation validation schema (body)
 */
export const teamGenerationSchema = Joi.object({
  month: monthSchema,
  year: yearSchema
});

/**
 * Answer submission validation schema
 */
export const answerSubmissionSchema = Joi.object({
  questionId: questionIdSchema,
  score: scoreSchema
});

/**
 * Month/Year query parameters validation schema
 * Both are optional, but if one is provided, both must be provided
 */
export const monthYearQuerySchema = Joi.object({
  month: optionalMonthSchema,
  year: optionalYearSchema
}).and('month', 'year'); // If month is provided, year must also be provided and vice versa
