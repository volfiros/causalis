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
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(34, 211, 238, 0.1)",
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(12px)",
      }}
    >
      {metrics.map((metric, i) => (
        <div
          key={i}
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            padding: "14px 12px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              fontSize: "9px",
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
              fontSize: i === 2 ? "14px" : "16px",
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
