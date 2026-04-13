"use client";

interface VersionPanelProps {
  version: number;
}

export function VersionPanel({ version }: VersionPanelProps) {
  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "8px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: "10px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(255, 255, 255, 0.4)",
          marginBottom: "8px",
        }}
      >
        Current Version
      </div>
      <div
        style={{
          fontFamily: "var(--font-outfit), system-ui, sans-serif",
          fontSize: "32px",
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
