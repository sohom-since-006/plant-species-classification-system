import { Component, type ReactNode, type ErrorInfo } from 'react';
import { SolidButton } from '@/components/ui/SolidButton';
import { BrandLogo } from '@/components/brand';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an uncaught render error:', error, errorInfo);

    // Auto-reload once for dynamic chunk loading failures after a new deployment
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      /Failed to fetch dynamically imported module/i.test(error.message) ||
      /error loading dynamically imported module/i.test(error.message) ||
      /Importing a module script failed/i.test(error.message);

    if (isChunkError && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      const retryKey = 'plantai_chunk_reloaded';
      if (!sessionStorage.getItem(retryKey)) {
        sessionStorage.setItem(retryKey, 'true');
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center text-white">
          <div className="liquid-glass rounded-3xl p-8 max-w-lg w-full border border-white/10 shadow-2xl space-y-6">
            <div className="flex justify-center">
              <div className="liquid-glass h-16 w-16 rounded-full flex items-center justify-center">
                <BrandLogo size={36} />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="font-heading italic text-3xl sm:text-4xl text-white">
                Something went wrong
              </h2>
              <p className="font-body text-sm text-white/70">
                An unexpected interface error occurred. Please reload to refresh the botanical workspace.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <SolidButton
                onClick={this.handleReload}
                className="w-full sm:w-auto px-6 py-2.5 text-sm"
              >
                Reload Page
              </SolidButton>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-6 py-2.5 text-sm rounded-full liquid-glass border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
