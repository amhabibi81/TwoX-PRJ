/**
 * Utility functions for error message handling and formatting
 */

/**
 * Check if error is a network error (no response received)
 */
export const isNetworkError = (error) => {
  return error.request && !error.response;
};

/**
 * Map HTTP status codes to user-friendly error messages
 */
export const mapHttpError = (status, data) => {
  // If backend provides a user-friendly error message, use it
  if (data?.error && typeof data.error === 'string') {
    return data.error;
  }

  // Map status codes to default messages
  const statusMessages = {
    400: 'Invalid request. Please check your input.',
    401: 'Your session has expired. Please log in again.',
    403: "You don't have permission to perform this action.",
    404: 'The requested resource was not found.',
    409: 'This action conflicts with existing data.',
    422: 'Please check your input and try again.',
    500: 'Server error. Please try again later.',
    502: 'Service temporarily unavailable. Please try again later.',
    503: 'Service temporarily unavailable. Please try again later.',
    504: 'Request timeout. Please try again.',
  };

  return statusMessages[status] || 'An unexpected error occurred. Please try again.';
};

/**
 * Extract error type from error object
 */
export const getErrorType = (error) => {
  if (isNetworkError(error)) {
    return 'network';
  }
  
  if (error.response) {
    const status = error.response.status;
    if (status >= 400 && status < 500) {
      return 'api';
    }
    if (status >= 500) {
      return 'server';
    }
  }
  
  return 'unknown';
};

/**
 * Check if API URL is misconfigured (using localhost in production)
 */
const isApiUrlMisconfigured = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  return isProduction && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'));
};

/**
 * Get user-friendly error message from error object
 */
export const getErrorMessage = (error) => {
  // Handle network errors
  if (isNetworkError(error)) {
    // Check if API URL is misconfigured
    if (isApiUrlMisconfigured()) {
      return 'API configuration error: Backend URL is not configured. Please set VITE_API_URL environment variable in your deployment settings.';
    }
    return 'Network error. Please check your connection and try again.';
  }

  // Handle API errors with response
  if (error.response) {
    const { status, data } = error.response;
    return mapHttpError(status, data);
  }

  // Handle error objects with message property
  if (error.message) {
    return error.message;
  }

  // Fallback
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Format error for display
 */
export const formatError = (error) => {
  return {
    message: getErrorMessage(error),
    type: getErrorType(error),
    status: error.response?.status || null,
    originalError: error,
  };
};
