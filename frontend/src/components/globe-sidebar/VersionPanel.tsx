"use client";

interface VersionPanelProps {
  version: number;
}

export function VersionPanel({ version }: VersionPanelProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 12px",
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "6px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: "9px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(255, 255, 255, 0.4)",
        }}
      >
        Version
      </div>
      <div
        style={{
          fontFamily: "var(--font-outfit), system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: 700,
          color: "#22d3ee",
          lineHeight: 1,
        }}
      >
        V{version}
      </div>
    </div>
  );
}