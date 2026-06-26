import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCw, AlertOctagon } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070708] text-white flex flex-col items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-white/10 text-center space-y-6 shadow-2xl relative overflow-hidden">
            {/* Red alert top line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
            
            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold tracking-tight">Something went wrong</h2>
              <p className="text-sm text-gray-400">
                An unexpected error occurred in the application. Please try reloading or check the console logs for details.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl text-left overflow-x-auto max-h-32 text-xs font-mono text-red-400">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleRetry}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-lime hover:brightness-110 active:scale-95 text-black text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer outline-none"
            >
              <RotateCw className="w-4 h-4" />
              Retry & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
