// src/components/ui/error-message.tsx
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';

interface ErrorMessageProps {
  title?: string;
  message: string;
  variant?: 'error' | 'warning' | 'info';
  onDismiss?: () => void;
  className?: string;
}

export function ErrorMessage({
  title,
  message,
  variant = 'error',
  onDismiss,
  className,
}: ErrorMessageProps) {
  const variantStyles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };

  const iconStyles = {
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
  };

  return (
    <div className={cn('relative rounded-md border p-4', variantStyles[variant], className)}>
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className={cn('h-5 w-5', iconStyles[variant])} />
        </div>
        <div className="ml-3 flex-1">
          {title && <h3 className="mb-1 text-sm font-medium">{title}</h3>}
          <div className="text-sm">{message}</div>
        </div>
        {onDismiss && (
          <div className="ml-4 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-auto p-1 hover:bg-transparent"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
