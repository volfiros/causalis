"use client";

import { X } from "lucide-react";

interface FilterControlsProps {
  onFilterChange?: (filters: { routeIds: string[] }) => void;
  onClearFilters?: () => void;
  hasFilters: boolean;
}

export function FilterControls({ onClearFilters, hasFilters }: FilterControlsProps) {
  if (!hasFilters) return null;

  return (
    <div
      style={{
        padding: "16px 0",
        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        marginTop: "auto",
      }}
    >
      <button
        onClick={onClearFilters}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "10px 16px",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "6px",
          color: "rgba(255, 255, 255, 0.7)",
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: "11px",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "all 150ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
          e.currentTarget.style.color = "#ffffff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
          e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
        }}
      >
        <X className="w-3.5 h-3.5" />
        Clear Selection
      </button>
    </div>
  );
}
