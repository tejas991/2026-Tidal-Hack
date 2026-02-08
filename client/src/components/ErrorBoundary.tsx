/// <reference types="vite/client" />
import { Component, type ErrorInfo, type ReactNode } from 'react';

/* ============================================
 * FridgeTrack — Error Boundary
 * ============================================
 * Catches React render errors and displays a
 * contextual fallback UI based on error type.
 * ============================================ */


// ---- Error Classification ----

type ErrorKind = 'network' | 'api' | 'render';

function classifyError(error: unknown): ErrorKind {
  if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch'))) {
    return 'network';
  }

  if (
    error instanceof Error &&
    ('status' in error || error.message.includes('429') || error.message.includes('500') || error.message.includes('API'))
  ) {
    return 'api';
  }

  return 'render';
}

const errorContent: Record<ErrorKind, { icon: string; heading: string; message: string }> = {
  network: {
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1 15v-2h2v2h-2Zm0-4V7h2v6h-2Z',
    heading: 'Connection lost',
    message: 'We can\'t reach the server right now. Check your internet connection and try again.',
  },
  api: {
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1 15v-2h2v2h-2Zm0-4V7h2v6h-2Z',
    heading: 'Something went wrong on our end',
    message: 'The server returned an unexpected response. This is usually temporary — try again in a moment.',
  },
  render: {
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1 15v-2h2v2h-2Zm0-4V7h2v6h-2Z',
    heading: 'Something went wrong',
    message: 'An unexpected error occurred while rendering this page. We\'re sorry for the inconvenience.',
  },
};


// ---- Error Tracking Placeholder ----

function reportToErrorTracking(error: Error, errorInfo: ErrorInfo) {
  // TODO: Replace with Sentry, Datadog, or similar in production
  // e.g. Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  void error;
  void errorInfo;
}


// ---- Component ----

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorKind: ErrorKind;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorKind: 'render' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorKind: classifyError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Dev: log to console
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    // Prod: send to error tracking
    if (import.meta.env.PROD) {
      reportToErrorTracking(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorKind: 'render' });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Custom fallback takes precedence
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { errorKind, error } = this.state;
    const content = errorContent[errorKind];

    const mailtoSubject = encodeURIComponent('FridgeTrack Bug Report');
    const mailtoBody = encodeURIComponent(
      `Error: ${error?.message ?? 'Unknown error'}\nType: ${errorKind}\nURL: ${window.location.href}\nTimestamp: ${new Date().toISOString()}`
    );

    return (
      <div
        className="min-h-screen flex items-center justify-center px-5 py-12"
        style={{ backgroundColor: 'var(--surface-primary)' }}
      >
        <div
          className="w-full max-w-md text-center"
        >
          {/* Icon */}
          <div
            className="mx-auto mb-6 flex items-center justify-center rounded-full"
            style={{
              width: '4rem',
              height: '4rem',
              backgroundColor: errorKind === 'network'
                ? 'var(--color-warning-light)'
                : 'var(--color-danger-light)',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              style={{
                color: errorKind === 'network'
                  ? 'var(--color-warning-dark)'
                  : 'var(--color-danger)',
              }}
            >
              <path d={content.icon} fill="currentColor" />
            </svg>
          </div>

          {/* Heading */}
          <h1
            className="text-xl font-semibold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {content.heading}
          </h1>

          {/* Message */}
          <p
            className="text-sm mb-8 leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {content.message}
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {/* Try Again — resets the boundary */}
            <button
              type="button"
              onClick={this.handleReset}
              className={[
                'inline-flex items-center justify-center',
                'px-4 py-2 text-base rounded-lg font-medium',
                'bg-brand-600 text-white',
                'hover:bg-brand-700 active:bg-brand-800',
                'transition-all duration-200 ease-in-out',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
                'cursor-pointer',
              ].join(' ')}
            >
              Try again
            </button>

            {/* Reload Page */}
            <button
              type="button"
              onClick={this.handleReload}
              className={[
                'inline-flex items-center justify-center',
                'px-4 py-2 text-base rounded-lg font-medium',
                'border border-neutral-300 bg-transparent text-neutral-800',
                'hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50',
                'active:bg-brand-100',
                'transition-all duration-200 ease-in-out',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
                'cursor-pointer',
              ].join(' ')}
            >
              Reload page
            </button>
          </div>

          {/* Report link */}
          <p className="mt-6 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Still not working?{' '}
            <a
              href={`mailto:support@fridgetrack.app?subject=${mailtoSubject}&body=${mailtoBody}`}
              className="underline hover:no-underline"
              style={{ color: 'var(--color-brand-600)' }}
            >
              Report this issue
            </a>
          </p>

          {/* Dev-only error details */}
          {import.meta.env.DEV && error && (
            <details
              className="mt-8 text-left rounded-lg border border-neutral-200 p-4"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <summary
                className="text-xs font-medium cursor-pointer select-none"
                style={{ color: 'var(--text-secondary)' }}
              >
                Error details (dev only)
              </summary>
              <pre
                className="mt-3 text-xs overflow-x-auto whitespace-pre-wrap break-words"
                style={{ color: 'var(--color-danger)' }}
              >
                {error.stack ?? error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
