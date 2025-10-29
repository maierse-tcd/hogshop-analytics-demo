import React, { Component, ReactNode } from 'react';
import { posthog } from '@/lib/posthog';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to PostHog with full stack trace
    console.error('Error caught by boundary:', error, errorInfo);
    
    posthog.capture('$exception', {
      $exception_list: [
        {
          $exception_message: error.message,
          $exception_type: error.name,
          $exception_stack_trace_raw: error.stack,
        }
      ],
      $exception_personURL: posthog.get_session_replay_url(),
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Something went wrong, but we've logged it!</p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="text-primary hover:underline text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
