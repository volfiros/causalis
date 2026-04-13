"use client";

interface RouteCardProps {
  name: string;
  origin: string;
  destination: string;
  originFlag?: string;
  destinationFlag?: string;
  status: "baseline" | "rerouted" | "blocked";
  additionalDays?: number;
  additionalCostUsd?: number;
  vesselsAffected?: number;
}

export function RouteCard({
  name,
  origin,
  destination,
  originFlag = "🏳️",
  destinationFlag = "🏳️",
  status,
  additionalDays,
  additionalCostUsd,
  vesselsAffected,
}: RouteCardProps) {
  const statusConfig = {
    baseline: { color: "#71717a", bgColor: "rgba(113, 113, 122, 0.15)", label: "Baseline" },
    rerouted: { color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.15)", label: "Rerouted" },
    blocked: { color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.15)", label: "Blocked" },
  };

  const config = statusConfig[status];

  return (
    <div
      style={{
        padding: "14px",
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "8px",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-outfit), system-ui, sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            color: "#ffffff",
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "9px",
            padding: "3px 8px",
            backgroundColor: config.bgColor,
            color: config.color,
            borderRadius: "4px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {config.label}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <span style={{ fontSize: "16px" }}>{originFlag}</span>
        <span
          style={{
            fontFamily: "var(--font-outfit), system-ui, sans-serif",
            fontSize: "13px",
            color: "rgba(255, 255, 255, 0.8)",
          }}
        >
          {origin}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "12px",
            color: "rgba(255, 255, 255, 0.4)",
          }}
        >
          →
        </span>
        <span style={{ fontSize: "16px" }}>{destinationFlag}</span>
        <span
          style={{
            fontFamily: "var(--font-outfit), system-ui, sans-serif",
            fontSize: "13px",
            color: "rgba(255, 255, 255, 0.8)",
          }}
        >
          {destination}
        </span>
      </div>

      <div style={{ display: "flex", gap: "16px" }}>
        {additionalDays !== undefined && (
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono), ui-monospace, monospace",
                fontSize: "9px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "rgba(255, 255, 255, 0.4)",
                marginBottom: "2px",
              }}
            >
              +Days
            </div>
            <div
              style={{
                fontFamily: "var(--font-outfit), system-ui, sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: status === "blocked" ? "#ef4444" : "#3b82f6",
              }}
            >
              +{additionalDays}
            </div>
          </div>
        )}

        {additionalCostUsd !== undefined && (
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono), ui-monospace, monospace",
                fontSize: "9px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "rgba(255, 255, 255, 0.4)",
                marginBottom: "2px",
              }}
            >
              +Cost
            </div>
            <div
              style={{
                fontFamily: "var(--font-outfit), system-ui, sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: "#ffffff",
              }}
            >
              ${(additionalCostUsd / 1000).toFixed(0)}K
            </div>
          </div>
        )}

        {vesselsAffected !== undefined && (
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono), ui-monospace, monospace",
                fontSize: "9px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "rgba(255, 255, 255, 0.4)",
                marginBottom: "2px",
              }}
            >
              Vessels
            </div>
            <div
              style={{
                fontFamily: "var(--font-outfit), system-ui, sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: "#ffffff",
              }}
            >
              {vesselsAffected}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
