"use client";

interface ImpactStatsCardProps {
  vessels: number;
  routes: number;
  costUsd: number;
  customMetric?: { label: string; value: string };
}

export function ImpactStatsCard({ vessels, routes, costUsd, customMetric }: ImpactStatsCardProps) {
  const metrics = [
    { label: "Vessels", value: vessels.toLocaleString() },
    { label: "Routes", value: routes.toLocaleString() },
    { label: "Est. Cost", value: `$${(costUsd / 1_000_000).toFixed(1)}M` },
    customMetric || { label: "Impact", value: "High" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "1px",
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "8px",
        overflow: "hidden",
        marginBottom: "16px",
      }}
    >
      {metrics.map((metric, i) => (
        <div
          key={i}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            padding: "14px 12px",
            textAlign: "center",
          }}
        >
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
            {metric.label}
          </div>
          <div
            style={{
              fontFamily: "var(--font-outfit), system-ui, sans-serif",
              fontSize: i === 2 ? "16px" : "18px",
              fontWeight: 600,
              color: i === 2 ? "#22d3ee" : "#ffffff",
            }}
          >
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
}
