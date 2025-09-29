/**
 * Shared debounce configuration and utilities for consistent timing across the application
 * Provides type-safe debounce functions with standardized delays
 */

/**
 * Standard debounce delays used throughout the application
 */
export const DEBOUNCE_DELAYS = {
  /** Fast response for immediate feedback (search, filters) */
  FAST: 150,
  /** Standard response for auto-save operations */
  STANDARD: 300,
  /** Slow response for expensive operations (API calls, complex calculations) */
  SLOW: 500,
} as const;

/**
 * Generic debounce function with TypeScript support
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Debounce function with loading state management
 * Returns both the debounced function and loading state
 */
export function debounceWithLoading<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): {
  debouncedFn: (...args: Parameters<T>) => void;
  isLoading: () => boolean;
  cancel: () => void;
} {
  let timeoutId: NodeJS.Timeout;
  let isLoadingState = false;

  const debouncedFn = (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    isLoadingState = true;

    timeoutId = setTimeout(() => {
      isLoadingState = false;
      func(...args);
    }, delay);
  };

  const cancel = () => {
    clearTimeout(timeoutId);
    isLoadingState = false;
  };

  const isLoading = () => isLoadingState;

  return { debouncedFn, isLoading, cancel };
}

/**
 * React hook for debounced auto-save with loading state
 * @param saveFunction The function to call when saving
 * @param delay The debounce delay (defaults to STANDARD)
 * @returns Object with save function, loading state, and cancel function
 */
import { useCallback, useRef, useState } from 'react';

export function useAutoSave<T extends (...args: any[]) => void>(
  saveFunction: T,
  delay: number = DEBOUNCE_DELAYS.STANDARD
) {
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const save = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsSaving(true);

    timeoutRef.current = setTimeout(() => {
      setIsSaving(false);
      saveFunction(...args);
    }, delay);
  }, [saveFunction, delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      setIsSaving(false);
    }
  }, []);

  return { save, isSaving, cancel };
}

/**
 * Type-safe debounce delays for specific use cases
 */
export const AUTO_SAVE_DELAY = DEBOUNCE_DELAYS.STANDARD;
export const SEARCH_DELAY = DEBOUNCE_DELAYS.FAST;
export const API_CALL_DELAY = DEBOUNCE_DELAYS.SLOW;