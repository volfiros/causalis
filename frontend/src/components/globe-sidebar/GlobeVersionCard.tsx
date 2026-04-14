"use client";

interface GlobeVersionCardProps {
  version: number;
  affectedChokepoints: string[];
  affectedPorts: string[];
  vesselsAffected: number;
  onViewOnGlobe?: () => void;
}

export function GlobeVersionCard({
  version,
  affectedChokepoints,
  affectedPorts,
  vesselsAffected,
  onViewOnGlobe,
}: GlobeVersionCardProps) {
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255, 255, 255, 0.4)",
              marginBottom: "4px",
            }}
          >
            Globe Version
          </div>
          <div
            style={{
              fontFamily: "var(--font-outfit), system-ui, sans-serif",
              fontSize: "36px",
              fontWeight: 700,
              color: "#22d3ee",
              lineHeight: 1,
            }}
          >
            V{version}
          </div>
        </div>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: "rgba(34, 211, 238, 0.1)",
            border: "2px solid rgba(34, 211, 238, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: "24px" }}>🌐</span>
        </div>
      </div>

      <div
        style={{
          fontFamily: "var(--font-outfit), system-ui, sans-serif",
          fontSize: "13px",
          color: "rgba(255, 255, 255, 0.7)",
          marginBottom: "12px",
        }}
      >
        {affectedChokepoints.length} chokepoints, {affectedPorts.length} ports, {vesselsAffected} vessels affected
      </div>

      {affectedChokepoints.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginBottom: "16px",
          }}
        >
          {affectedChokepoints.slice(0, 4).map((name, i) => (
            <span
              key={i}
              style={{
                fontFamily: "var(--font-mono), ui-monospace, monospace",
                fontSize: "10px",
                padding: "4px 8px",
                backgroundColor: "rgba(168, 85, 247, 0.15)",
                color: "#a855f7",
                borderRadius: "4px",
              }}
            >
              {name}
            </span>
          ))}
          {affectedChokepoints.length > 4 && (
            <span
              style={{
                fontFamily: "var(--font-mono), ui-monospace, monospace",
                fontSize: "10px",
                padding: "4px 8px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                color: "rgba(255, 255, 255, 0.5)",
                borderRadius: "4px",
              }}
            >
              +{affectedChokepoints.length - 4} more
            </span>
          )}
        </div>
      )}

      {onViewOnGlobe && (
        <button
          onClick={onViewOnGlobe}
          style={{
            width: "100%",
            padding: "10px 16px",
            backgroundColor: "rgba(34, 211, 238, 0.1)",
            border: "1px solid rgba(34, 211, 238, 0.3)",
            borderRadius: "6px",
            color: "#22d3ee",
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "11px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(34, 211, 238, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(34, 211, 238, 0.1)";
          }}
        >
          View on Globe
        </button>
      )}
    </div>
  );
}
