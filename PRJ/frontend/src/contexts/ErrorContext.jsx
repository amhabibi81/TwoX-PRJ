import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { registerErrorHandler } from '../utils/apiManager';

const ErrorContext = createContext(null);

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within ErrorProvider');
  }
  return context;
};

export const ErrorProvider = ({ children }) => {
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [dismissTimeout, setDismissTimeout] = useState(null);

  const clearError = useCallback(() => {
    if (dismissTimeout) {
      clearTimeout(dismissTimeout);
      setDismissTimeout(null);
    }
    setError(null);
    setErrorType(null);
  }, [dismissTimeout]);

  const showError = useCallback((message, type = 'api') => {
    // Clear existing timeout if any
    if (dismissTimeout) {
      clearTimeout(dismissTimeout);
    }

    // Set error
    setError(message);
    setErrorType(type);

    // Auto-dismiss after 5 seconds
    const timeout = setTimeout(() => {
      clearError();
    }, 5000);

    setDismissTimeout(timeout);
  }, [dismissTimeout, clearError]);

  // Register error handler with API manager
  useEffect(() => {
    registerErrorHandler((errorMessage, type) => {
      showError(errorMessage, type);
    });
  }, [showError]);

  const value = {
    error,
    errorType,
    showError,
    clearError,
  };

  return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>;
};
