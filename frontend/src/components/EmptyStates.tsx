import React from 'react';
import { AlertCircle, RefreshCw, SlidersHorizontal, Search } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Skeleton Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-panel p-6 h-28 flex flex-col justify-between overflow-hidden relative">
            <div className="h-4 w-24 bg-white/5 rounded shimmer" />
            <div className="h-8 w-16 bg-white/10 rounded shimmer mt-2" />
          </div>
        ))}
      </div>

      {/* Skeleton Lead Cards */}
      <div className="space-y-4 mt-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-panel p-6 border-l-2 border-l-white/10 space-y-4 overflow-hidden relative">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="h-6 w-3/4 bg-white/10 rounded shimmer" />
                <div className="h-4 w-1/4 bg-white/5 rounded shimmer" />
              </div>
              <div className="h-8 w-12 bg-white/10 rounded shimmer ml-4" />
            </div>
            <div className="h-4 w-full bg-white/5 rounded shimmer" />
            <div className="h-4 w-5/6 bg-white/5 rounded shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="glass-panel grid-dots p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-12 min-h-[300px]">
      <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center border-lime/30 text-lime mb-6">
        <SlidersHorizontal className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">No signals detected</h3>
      <p className="text-sm text-mutedText mb-8 max-w-sm">
        We couldn't find any leads matching the selected criteria. Try adjusting your sidebar filters.
      </p>
      <button
        onClick={onRefresh}
        className="px-5 py-2.5 rounded-full border border-lime text-lime hover:bg-lime/15 transition-all duration-200 font-mono text-sm tracking-wider uppercase flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Refresh Database
      </button>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="glass-panel border-l-4 border-l-amberAccent p-8 max-w-xl mx-auto my-12 flex gap-5 items-start">
      <div className="p-2 glass-panel border-amberAccent/20 text-amberAccent bg-amberAccent/10 rounded-xl">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="flex-1 space-y-4">
        <div>
          <h3 className="text-lg font-medium text-white mb-1">Database Connection Error</h3>
          <p className="text-sm text-mutedText">
            {message || "We encountered an issue connecting to the Supabase database."}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg border border-lime text-lime hover:bg-lime/10 transition-colors duration-150 font-mono text-sm uppercase flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    </div>
  );
}

export function NoSearchResultsState({ onClear }: { onClear: () => void }) {
  return (
    <div className="glass-panel p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-12">
      <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center border-white/10 text-mutedText mb-6">
        <Search className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">No leads match your search</h3>
      <p className="text-sm text-mutedText mb-6 max-w-sm">
        Try typing different keywords, checking your spelling, or clearing your current text search filter.
      </p>
      <button
        onClick={onClear}
        className="text-sm text-lime hover:underline font-mono uppercase tracking-wider"
      >
        Clear filters & search
      </button>
    </div>
  );
}
