import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChange, placeholder = 'Search title, body, keywords, subreddit…', autoFocus }: SearchBarProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <div className="relative w-full group">
      {/* Icon */}
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-lime transition-colors duration-200 pointer-events-none" />

      <input
        ref={ref}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-10 pr-10 py-2.5
          text-sm font-sans
          bg-carbon-card/60 border border-white/8
          rounded-xl text-white placeholder-gray-600
          focus:outline-none focus:border-lime/40 focus:bg-carbon-card/80
          transition-all duration-200
          backdrop-blur-sm
        "
        spellCheck={false}
      />

      {/* Clear button */}
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Lime underline on focus */}
      <div className="
        absolute bottom-0 left-4 right-4 h-px
        bg-lime/0 group-focus-within:bg-lime/30
        transition-all duration-300 rounded-full
      " />
    </div>
  );
}

export default SearchBar;
