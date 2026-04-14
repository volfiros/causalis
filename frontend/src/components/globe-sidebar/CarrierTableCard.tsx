"use client";
import { SimulationCarrier } from "@/lib/use-simulation";

interface CarrierTableCardProps {
  carriers: SimulationCarrier[];
  loading?: boolean;
}

const getExposureColor = (score: number) => {
  if (score > 0.6) return "#22d3ee";
  if (score > 0.3) return "#ffffff";
  return "rgba(255, 255, 255, 0.4)";
};

export function CarrierTableCard({ carriers, loading }: CarrierTableCardProps) {
  const sortedCarriers = [...(carriers || [])].sort(
    (a, b) => b.exposure_score - a.exposure_score
  );

  if (loading) {
    return (
      <div
        style={{
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: "11px",
          color: "rgba(255, 255, 255, 0.4)",
          padding: "8px 0",
          textAlign: "center",
        }}
      >
        Loading carriers...
      </div>
    );
  }

  if (!sortedCarriers.length) {
    return (
      <div
        style={{
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: "11px",
          color: "rgba(255, 255, 255, 0.4)",
          padding: "8px 0",
          textAlign: "center",
        }}
      >
        No carrier data available
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 80px",
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "rgba(255, 255, 255, 0.02)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "9px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          Carrier
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "9px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255, 255, 255, 0.5)",
            textAlign: "right",
          }}
        >
          Exposure
        </span>
      </div>

      <div
        style={{
          maxHeight: "240px",
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(34, 211, 238, 0.3) transparent",
        }}
        className="carrier-scroll"
      >
        {sortedCarriers.map((carrier) => (
          <div
            key={carrier.carrier_id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px",
              alignItems: "center",
              padding: "8px 12px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-outfit), system-ui, sans-serif",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#ffffff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {carrier.name}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: "9px",
                  color: "rgba(255, 255, 255, 0.35)",
                }}
              >
                {carrier.routes_exposed} route{carrier.routes_exposed !== 1 ? "s" : ""} affected
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
              <div
                style={{
                  flex: 1,
                  height: "3px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(carrier.exposure_score * 100, 100)}%`,
                    height: "100%",
                    backgroundColor: getExposureColor(carrier.exposure_score),
                    borderRadius: "2px",
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: "10px",
                  color: getExposureColor(carrier.exposure_score),
                  minWidth: "32px",
                  textAlign: "right",
                  fontWeight: 600,
                }}
              >
                {(carrier.exposure_score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {sortedCarriers.length > 5 && (
        <div
          style={{
            padding: "6px 12px",
            textAlign: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "9px",
            color: "rgba(255, 255, 255, 0.3)",
            letterSpacing: "0.05em",
          }}
        >
          Scroll for {sortedCarriers.length - 5} more
        </div>
      )}
    </div>
  );
}