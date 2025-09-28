'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });

    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
      // TODO: Send to error reporting service (Sentry, LogRocket, etc.)
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen items-center justify-center bg-[radial-gradient(ellipse_at_100%_100%,_theme(colors.red.200),_theme(colors.orange.200)_60%,_theme(colors.yellow.100))] p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-red-900">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-neutral-600">
                The application encountered an unexpected error. This might be a temporary issue.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="rounded-md bg-red-50 p-3 text-xs">
                  <summary className="mb-2 cursor-pointer font-medium text-red-800">
                    Error Details (Development)
                  </summary>
                  <pre className="overflow-auto whitespace-pre-wrap text-red-700">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={this.handleReset} variant="outline" className="flex-1">
                  Try Again
                </Button>
                <Button onClick={this.handleReload} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-neutral-500">
                  If the problem persists, try refreshing the page or clearing your browser data.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return <div className="h-full">{this.props.children}</div>;
  }
}
