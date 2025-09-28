// src/hooks/useAsyncError.ts
import { useCallback } from 'react';

export function useAsyncError() {
  const throwError = useCallback((error: Error) => {
    // This will trigger the error boundary
    throw error;
  }, []);

  return throwError;
}
