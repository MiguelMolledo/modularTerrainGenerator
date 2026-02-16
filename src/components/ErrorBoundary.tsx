'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    this.setState({ errorInfo });

    // Here you could also log to an error reporting service like Sentry
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    // }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-card rounded-lg shadow-xl p-6 text-center">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Something went wrong
            </h1>

            {/* Description */}
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred. Your work may have been saved automatically.
              Try refreshing the page or going back to the home screen.
            </p>

            {/* Error Details (collapsible) */}
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Technical details
                </summary>
                <div className="mt-2 p-3 bg-background rounded text-xs text-destructive font-mono overflow-auto max-h-40">
                  <p className="font-bold mb-1">{this.state.error.name}: {this.state.error.message}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-muted-foreground whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </Button>
              <Button
                onClick={this.handleGoHome}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>

            {/* Help Text */}
            <p className="mt-6 text-xs text-muted-foreground">
              If this problem persists, please{' '}
              <a
                href="https://github.com/anthropics/claude-code/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                report the issue
              </a>
              .
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
