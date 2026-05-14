"use client";

import { Search } from "lucide-react";

type SearchBarProps = {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
};

export function SearchBar({
  placeholder = "Tìm kiếm...",
  value,
  onChange,
  onSearch,
}: SearchBarProps) {
  return (
    <div className="search-bar">
      <Search size={18} className="search-bar__icon" aria-hidden="true" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
        aria-label={placeholder}
      />
      <button className="btn btn-primary search-bar__btn" onClick={onSearch} type="button">
        Tìm kiếm
      </button>
    </div>
  );
}
