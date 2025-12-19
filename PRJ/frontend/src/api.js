import axios from 'axios';
import { handleError, setLoading } from './utils/apiManager';
import { getErrorMessage, getErrorType } from './utils/errorMessages';

const api = axios.create({
  baseURL: 'http://localhost:5000'
});

// Request interceptor: Add token to headers and track loading
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Track loading state (unless explicitly disabled)
    if (config.showLoading !== false) {
      setLoading(true, config.loadingMessage || null);
    }
    
    return config;
  },
  error => {
    // Request error - still decrement loading
    setLoading(false);
    return Promise.reject(error);
  }
);

// Response interceptor: Handle errors and track loading
api.interceptors.response.use(
  response => {
    // Success - decrement loading
    if (response.config.showLoading !== false) {
      setLoading(false);
    }
    return response;
  },
  error => {
    // Decrement loading on error
    if (error.config?.showLoading !== false) {
      setLoading(false);
    }

    // Handle 401 errors (unauthorized/expired token) - special handling
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Dispatch custom event to notify auth context
      window.dispatchEvent(new Event('auth:logout'));
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
      
      // Don't show error toast for 401 - redirect handles it
      return Promise.reject(error);
    }

    // Handle all other errors - show user-friendly message
    // Skip error handling if explicitly disabled
    if (error.config?.showError !== false) {
      const errorMessage = getErrorMessage(error);
      const errorType = getErrorType(error);
      handleError(errorMessage, errorType);
    }

    return Promise.reject(error);
  }
);

export default api;
