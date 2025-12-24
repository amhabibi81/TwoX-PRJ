import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Failed to parse stored user:', e);
        }
      }
    }
    setLoading(false);
  }, []);

  // Listen for logout events from API interceptor
  useEffect(() => {
    const handleLogout = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password }, {
        showError: false,  // Disable automatic error toast
        showLoading: false  // We handle loading state in Login component
      });
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return { success: true };
    } catch (error) {
      // Always log errors for debugging (even in production)
      console.error('Login error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        isNetworkError: !error.response
      });

      // Extract error message more carefully
      let errorMessage = 'Login failed';
      if (error.response?.data) {
        if (error.response.data.details && Array.isArray(error.response.data.details) && error.response.data.details.length > 0) {
          errorMessage = error.response.data.details[0].message || error.response.data.error || 'Validation failed';
        } else {
          errorMessage = error.response.data.error || 'Login failed';
        }
      } else if (!error.response) {
        // Network error
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        if (isProduction && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))) {
          errorMessage = 'API configuration error: Backend URL is not configured. Please check your deployment settings.';
        } else {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const signup = async (username, email, password) => {
    try {
      const response = await api.post('/auth/signup', { username, email, password }, {
        showError: false,
        showLoading: false
      });
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return { success: true };
    } catch (error) {
      // Always log errors for debugging
      console.error('Signup error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      let errorMessage = 'Signup failed';
      if (error.response?.data) {
        if (error.response.data.details && Array.isArray(error.response.data.details) && error.response.data.details.length > 0) {
          errorMessage = error.response.data.details[0].message || error.response.data.error || 'Validation failed';
        } else {
          errorMessage = error.response.data.error || 'Signup failed';
        }
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAuthenticated = !!token;

  // Role helper methods
  const getUserRole = () => {
    return user?.role || 'member';
  };

  const isAdmin = () => {
    return getUserRole() === 'admin';
  };

  const isManager = () => {
    const role = getUserRole();
    return role === 'manager' || role === 'admin';
  };

  const hasRole = (requiredRole) => {
    return getUserRole() === requiredRole;
  };

  const hasAnyRole = (allowedRoles) => {
    const userRole = getUserRole();
    return allowedRoles.includes(userRole);
  };

  const value = {
    user,
    token,
    login,
    signup,
    logout,
    isAuthenticated,
    loading,
    // Role helpers
    getUserRole,
    isAdmin,
    isManager,
    hasRole,
    hasAnyRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
