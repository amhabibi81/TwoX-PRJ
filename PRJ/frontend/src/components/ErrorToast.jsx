import { useEffect } from 'react';
import { useError } from '../contexts/ErrorContext';

export default function ErrorToast() {
  const { error, errorType, clearError } = useError();

  useEffect(() => {
    // Auto-dismiss is handled in ErrorContext
    return () => {};
  }, [error]);

  if (!error) {
    return null;
  }

  const getToastClasses = () => {
    const baseClasses = 'fixed top-5 right-5 z-50 min-w-[300px] max-w-[500px] p-4 rounded-lg shadow-lg flex items-start gap-3 animate-slide-in';
    
    switch (errorType) {
      case 'network':
        return `${baseClasses} bg-yellow-50 border border-yellow-300 text-yellow-800`;
      case 'server':
        return `${baseClasses} bg-red-50 border border-red-300 text-red-800`;
      default:
        return `${baseClasses} bg-red-50 border border-red-300 text-red-800`;
    }
  };

  return (
    <div className={getToastClasses()}>
      <div className="flex-1">
        <div className="font-bold mb-1 text-base">
          {errorType === 'network' ? '⚠️ Network Error' : '❌ Error'}
        </div>
        <div className="text-sm leading-relaxed">
          {error}
        </div>
      </div>
      <button
        onClick={clearError}
        className="bg-transparent border-none text-xl cursor-pointer text-inherit p-0 leading-none opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss error"
      >
        ×
      </button>
    </div>
  );
}
