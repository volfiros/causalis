"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface Carrier {
  name: string;
  exposure: number;
}

interface CarrierTableCardProps {
  carriers: Carrier[];
}

export function CarrierTableCard({ carriers }: CarrierTableCardProps) {
  const [sortBy, setSortBy] = useState<"name" | "exposure">("exposure");
  const [sortDesc, setSortDesc] = useState(true);

  const sortedCarriers = [...carriers].sort((a, b) => {
    if (sortBy === "exposure") {
      return sortDesc ? b.exposure - a.exposure : a.exposure - b.exposure;
    }
    return sortDesc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
  });

  const toggleSort = (field: "name" | "exposure") => {
    if (sortBy === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(field);
      setSortDesc(true);
    }
  };

  const getExposureColor = (exposure: number) => {
    if (exposure > 0.7) return "#22d3ee";
    if (exposure > 0.4) return "#ffffff";
    return "rgba(255, 255, 255, 0.4)";
  };

  return (
    <div
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "8px",
        overflow: "hidden",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 100px",
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "rgba(255, 255, 255, 0.02)",
        }}
      >
        <button
          onClick={() => toggleSort("name")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255, 255, 255, 0.5)",
            textAlign: "left",
          }}
        >
          Carrier
          {sortBy === "name" && (sortDesc ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
        </button>
        <button
          onClick={() => toggleSort("exposure")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "4px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          Exposure
          {sortBy === "exposure" && (sortDesc ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
        </button>
      </div>

      <div style={{ maxHeight: "200px", overflow: "auto" }}>
        {sortedCarriers.slice(0, 5).map((carrier, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px",
              alignItems: "center",
              padding: "10px 12px",
              borderBottom: i < sortedCarriers.length - 1 ? "1px solid rgba(255, 255, 255, 0.05)" : "none",
              height: "40px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-outfit), system-ui, sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                color: "#ffffff",
              }}
            >
              {carrier.name}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                    width: `${carrier.exposure * 100}%`,
                    height: "100%",
                    backgroundColor: getExposureColor(carrier.exposure),
                    borderRadius: "2px",
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: "10px",
                  color: getExposureColor(carrier.exposure),
                  minWidth: "28px",
                  textAlign: "right",
                }}
              >
                {(carrier.exposure * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
