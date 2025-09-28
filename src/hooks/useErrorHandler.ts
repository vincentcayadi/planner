// src/hooks/useErrorHandler.ts
import { useCallback } from 'react';
import { toast } from 'sonner';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
}

export function useErrorHandler() {
  const handleError = useCallback((error: Error | string, options: ErrorHandlerOptions = {}) => {
    const {
      showToast = true,
      logError = true,
      fallbackMessage = 'An unexpected error occurred',
    } = options;

    const errorMessage = typeof error === 'string' ? error : error.message;
    const displayMessage = errorMessage || fallbackMessage;

    if (logError) {
      console.error('Error handled:', error);
    }

    if (showToast) {
      toast.error('Error', {
        description: displayMessage,
      });
    }

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production' && typeof error !== 'string') {
      // TODO: Send to error reporting service
      console.error('Production error:', error);
    }
  }, []);

  return { handleError };
}
