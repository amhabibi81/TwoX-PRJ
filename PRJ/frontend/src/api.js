import axios from 'axios';
import { handleError, setLoading } from './utils/apiManager';
import { getErrorMessage, getErrorType } from './utils/errorMessages';

// Get API base URL
const getApiBaseURL = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};

// Check if API URL is misconfigured in production
const checkApiConfiguration = () => {
  const apiUrl = getApiBaseURL();
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  
  if (isProduction && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))) {
    console.error(
      '⚠️ API Configuration Warning: VITE_API_URL is not set or is using localhost.\n' +
      'The frontend is trying to connect to: ' + apiUrl + '\n' +
      'Please set VITE_API_URL environment variable in Render dashboard to your backend URL.'
    );
  }
};

// Check configuration on module load (only in browser)
if (typeof window !== 'undefined') {
  checkApiConfiguration();
}

const api = axios.create({
  baseURL: getApiBaseURL()
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

// Admin API methods
export const adminApi = {
  getDashboard: (month, year) => api.get('/admin/dashboard', { params: { month, year } }),
  getTeamParticipation: (month, year) => api.get('/admin/dashboard/participation', { params: { month, year } }),
  getTeamAverages: (month, year) => api.get('/admin/dashboard/team-averages', { params: { month, year } }),
  getUserAverages: (month, year) => api.get('/admin/dashboard/user-averages', { params: { month, year } }),
  getPerformers: (month, year, limit) => api.get('/admin/dashboard/performers', { params: { month, year, limit } }),
  getMonthComparison: (month, year) => api.get('/admin/dashboard/month-comparison', { params: { month, year } })
};

// 360-Degree Evaluation API methods
export const evaluationApi = {
  // Submit self-evaluation
  submitSelfEvaluation: (questionId, score) => 
    api.post('/answers/self', { questionId, score }),
  
  // Submit peer evaluation
  submitPeerEvaluation: (questionId, score, evaluatedUserId) => 
    api.post('/answers/peer', { questionId, score, evaluatedUserId }),
  
  // Submit manager evaluation
  submitManagerEvaluation: (questionId, score, evaluatedUserId) => 
    api.post('/answers/manager', { questionId, score, evaluatedUserId }),
  
  // Get evaluation status (returns answers with source_type breakdown)
  getEvaluationStatus: () => api.get('/answers/my')
};

export default api;
