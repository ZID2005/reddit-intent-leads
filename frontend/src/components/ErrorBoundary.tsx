import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
import ErrorOne from './ErrorOne';

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
        <ErrorOne
          code="500"
          title="Something went wrong."
          description={
            this.state.error
              ? `An unexpected error occurred: ${this.state.error.message || this.state.error.toString()}`
              : "An unexpected error occurred in the application. Please try reloading or check the console logs for details."
          }
          action={{
            label: "Retry & Reload",
            onClick: this.handleRetry,
            icon: RotateCw
          }}
        >
          {this.state.error && (
            <div className="bg-[#08080A]/60 border border-emerald-500/20 p-4 rounded-lg text-left overflow-x-auto max-h-40 text-xs font-mono text-emerald-400 shadow-inner mt-2">
              <div className="text-emerald-500/60 uppercase text-[9px] tracking-widest font-bold mb-1 border-b border-emerald-500/10 pb-1">Error Trace</div>
              {this.state.error.stack || this.state.error.toString()}
            </div>
          )}
        </ErrorOne>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
