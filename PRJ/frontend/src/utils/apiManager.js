/**
 * API Manager to bridge axios interceptors with React contexts
 * This allows interceptors to communicate with ErrorContext and LoadingContext
 */

let errorHandler = null;
let loadingHandler = null;

export const registerErrorHandler = (handler) => {
  errorHandler = handler;
};

export const registerLoadingHandler = (handler) => {
  loadingHandler = handler;
};

export const handleError = (error, errorType) => {
  if (errorHandler) {
    errorHandler(error, errorType);
  }
};

export const setLoading = (loading, message) => {
  if (loadingHandler) {
    loadingHandler(loading, message);
  }
};
