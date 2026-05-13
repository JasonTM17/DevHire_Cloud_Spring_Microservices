"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/primitives";

export interface SearchInputProps {
  /** Current search value (controlled) */
  value: string;
  /** Callback fired with debounced value (300ms delay) */
  onChange: (value: string) => void;
  /** Placeholder text for the input */
  placeholder?: string;
}

/**
 * SearchInput with 300ms debounce for the Challenge Library.
 * Displays a search icon and a clear button when value is non-empty.
 * Uses the useDebounce hook internally to avoid excessive re-renders.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search challenges...",
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebounce(localValue, 300);

  // Sync debounced value to parent
  useEffect(() => {
    onChange(debouncedValue);
  }, [debouncedValue, onChange]);

  // Sync external value changes (e.g., clear from parent)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  return (
    <div className="dh-search-input">
      <div className="dh-search-input__icon" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9"
            stroke="currentColor"
            strokeWidth="1.33"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <Input
        id="challenge-search"
        type="search"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="dh-search-input__field"
        aria-label={placeholder}
      />
      {localValue && (
        <button
          type="button"
          className="dh-search-input__clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M10.5 3.5 3.5 10.5M3.5 3.5l7 7"
              stroke="currentColor"
              strokeWidth="1.33"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
