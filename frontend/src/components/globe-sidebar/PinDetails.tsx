"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { SpatialPort, SpatialChokepoint } from "@/lib/spatial-data";

interface PinDetailsProps {
  selectedPort: SpatialPort | null;
  selectedChokepoint: SpatialChokepoint | null;
  onClose: () => void;
}

export function PinDetails({ selectedPort, selectedChokepoint, onClose }: PinDetailsProps) {
  const hasSelection = selectedPort || selectedChokepoint;

  return (
    <AnimatePresence>
      {hasSelection && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          style={{
            padding: "16px",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            marginBottom: "16px",
            position: "relative",
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.4)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X className="w-4 h-4" />
          </button>

          {selectedPort && (
            <div>
              <div
                style={{
                  fontFamily: "var(--font-outfit), system-ui, sans-serif",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#ffffff",
                  marginBottom: "4px",
                  paddingRight: "24px",
                }}
              >
                {selectedPort.name}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono), ui-monospace, monospace",
                    fontSize: "11px",
                    color: "rgba(255, 255, 255, 0.5)",
                  }}
                >
                  {selectedPort.country}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono), ui-monospace, monospace",
                    fontSize: "10px",
                    padding: "2px 8px",
                    backgroundColor: "rgba(34, 211, 238, 0.15)",
                    color: "#22d3ee",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  {selectedPort.type}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    borderRadius: "6px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono), ui-monospace, monospace",
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.4)",
                      textTransform: "uppercase",
                    }}
                  >
                    Annual TEU
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-outfit), system-ui, sans-serif",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#ffffff",
                    }}
                  >
                    {(selectedPort.annual_teu / 1000000).toFixed(1)}M
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    borderRadius: "6px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono), ui-monospace, monospace",
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.4)",
                      textTransform: "uppercase",
                    }}
                  >
                    Typical Dwell
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-outfit), system-ui, sans-serif",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#ffffff",
                    }}
                  >
                    {selectedPort.typical_dwell_hours}h
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    borderRadius: "6px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono), ui-monospace, monospace",
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.4)",
                      textTransform: "uppercase",
                    }}
                  >
                    Max Draft
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-outfit), system-ui, sans-serif",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#ffffff",
                    }}
                  >
                    {selectedPort.max_draft_meters}m
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedChokepoint && (
            <div>
              <div
                style={{
                  fontFamily: "var(--font-outfit), system-ui, sans-serif",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#ffffff",
                  marginBottom: "4px",
                  paddingRight: "24px",
                }}
              >
                {selectedChokepoint.name}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono), ui-monospace, monospace",
                    fontSize: "10px",
                    padding: "2px 8px",
                    backgroundColor: "rgba(168, 85, 247, 0.15)",
                    color: "#a855f7",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  {selectedChokepoint.type}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono), ui-monospace, monospace",
                    fontSize: "11px",
                    color: "rgba(255, 255, 255, 0.5)",
                  }}
                >
                  Strategic: {selectedChokepoint.strategic_importance}/10
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    borderRadius: "6px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono), ui-monospace, monospace",
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.4)",
                      textTransform: "uppercase",
                    }}
                  >
                    Daily Vessels
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-outfit), system-ui, sans-serif",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#ffffff",
                    }}
                  >
                    {selectedChokepoint.daily_vessels}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    borderRadius: "6px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono), ui-monospace, monospace",
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.4)",
                      textTransform: "uppercase",
                    }}
                  >
                    Importance
                  </span>
                  <div style={{ display: "flex", gap: "2px" }}>
                    {Array.from({ length: selectedChokepoint.strategic_importance }).map((_, i) => (
                      <span key={i} style={{ color: "#a855f7" }}>★</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
