import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { registerLoadingHandler } from '../utils/apiManager';

const LoadingContext = createContext(null);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [loading, setLoadingState] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(null);
  const [requestCount, setRequestCount] = useState(0);

  const setLoading = useCallback((isLoading, message = null) => {
    if (isLoading) {
      setRequestCount(prev => prev + 1);
      setLoadingState(true);
      if (message) {
        setLoadingMessage(message);
      }
    } else {
      setRequestCount(prev => {
        const newCount = Math.max(0, prev - 1);
        if (newCount === 0) {
          setLoadingState(false);
          setLoadingMessage(null);
        }
        return newCount;
      });
    }
  }, []);

  // Register loading handler with API manager
  useEffect(() => {
    registerLoadingHandler((isLoading, message) => {
      setLoading(isLoading, message);
    });
  }, [setLoading]);

  const value = {
    loading,
    loadingMessage,
    setLoading,
  };

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};
