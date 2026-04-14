"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { SpatialPort, SpatialChokepoint, SpatialRoute } from "@/lib/spatial-data";
import { SimulationData } from "@/lib/use-simulation";
import { EntityInfo } from "./index";

interface MenuSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  count?: number;
}

function MenuSection({ title, children, defaultExpanded = false, count }: MenuSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255, 255, 255, 0.6)",
            }}
          >
            {title}
          </span>
          {count !== undefined && (
            <span
              style={{
                fontFamily: "var(--font-mono), ui-monospace, monospace",
                fontSize: "10px",
                padding: "2px 6px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                borderRadius: "4px",
                color: "rgba(255, 255, 255, 0.5)",
              }}
            >
              {count}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <ChevronDown className="w-4 h-4" style={{ color: "rgba(255, 255, 255, 0.4)" }} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ paddingBottom: "16px" }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MenusProps {
  entityInfos: EntityInfo[];
  ports: SpatialPort[];
  chokepoints: SpatialChokepoint[];
  routes: SpatialRoute[];
  selectedEntityId?: string | null;
  onEntitySelect?: (entityId: string) => void;
  simulationData?: SimulationData | null;
}

export function Menus({
  entityInfos,
  ports,
  chokepoints,
  routes,
  selectedEntityId,
  onEntitySelect,
  simulationData,
}: MenusProps) {
  const relevantPorts = ports.filter(p => entityInfos.some(e => e.id === p.id));
  const relevantChokepoints = chokepoints.filter(cp => entityInfos.some(e => e.id === cp.id));

  return (
    <div style={{ marginTop: "16px", flex: 1, overflow: "auto" }}>
      <MenuSection title="Active Scenario" defaultExpanded={true}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {simulationData?.scenario?.severity && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                borderRadius: "6px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: "11px",
                  color: "rgba(255, 255, 255, 0.5)",
                }}
              >
                Severity
              </span>
              <span
                style={{
                  fontFamily: "var(--font-outfit), system-ui, sans-serif",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#a855f7",
                  textTransform: "capitalize",
                }}
              >
                {simulationData.scenario.severity}
              </span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              borderRadius: "6px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono), ui-monospace, monospace",
                fontSize: "11px",
                color: "rgba(255, 255, 255, 0.5)",
              }}
            >
              Entities
            </span>
            <span
              style={{
                fontFamily: "var(--font-outfit), system-ui, sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: "#22d3ee",
              }}
            >
              {entityInfos.length}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              borderRadius: "6px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono), ui-monospace, monospace",
                fontSize: "11px",
                color: "rgba(255, 255, 255, 0.5)",
              }}
            >
              Affected Routes
            </span>
            <span
              style={{
                fontFamily: "var(--font-outfit), system-ui, sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: "#3b82f6",
              }}
            >
              {simulationData?.affected_routes?.length ?? routes.length}
            </span>
          </div>
        </div>
      </MenuSection>

      <MenuSection title="Chokepoints" count={relevantChokepoints.length}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {relevantChokepoints.length === 0 ? (
            <div
              style={{
                fontFamily: "var(--font-outfit), system-ui, sans-serif",
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.4)",
                padding: "8px 0",
              }}
            >
              No chokepoints in current scenario
            </div>
          ) : (
            relevantChokepoints.map((cp) => (
              <button
                key={cp.id}
                onClick={() => onEntitySelect?.(cp.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  backgroundColor: selectedEntityId === cp.id
                    ? "rgba(168, 85, 247, 0.15)"
                    : "rgba(255, 255, 255, 0.03)",
                  border: "none",
                  borderLeft: selectedEntityId === cp.id ? "2px solid #a855f7" : "2px solid transparent",
                  borderRadius: "0 6px 6px 0",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 150ms ease",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-outfit), system-ui, sans-serif",
                      fontSize: "13px",
                      color: selectedEntityId === cp.id ? "#ffffff" : "rgba(255, 255, 255, 0.8)",
                    }}
                  >
                    {cp.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono), ui-monospace, monospace",
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.4)",
                      textTransform: "uppercase",
                    }}
                  >
                    {cp.daily_vessels} vessels/day
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono), ui-monospace, monospace",
                    fontSize: "9px",
                    padding: "2px 6px",
                    backgroundColor: "rgba(168, 85, 247, 0.2)",
                    color: "#a855f7",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  {cp.type}
                </span>
              </button>
            ))
          )}
        </div>
      </MenuSection>

      <MenuSection title="Ports" count={relevantPorts.length}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {relevantPorts.length === 0 ? (
            <div
              style={{
                fontFamily: "var(--font-outfit), system-ui, sans-serif",
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.4)",
                padding: "8px 0",
              }}
            >
              No ports in current scenario
            </div>
          ) : (
            relevantPorts.map((port) => (
              <button
                key={port.id}
                onClick={() => onEntitySelect?.(port.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  backgroundColor: selectedEntityId === port.id
                    ? "rgba(34, 211, 238, 0.15)"
                    : "rgba(255, 255, 255, 0.03)",
                  border: "none",
                  borderLeft: selectedEntityId === port.id ? "2px solid #22d3ee" : "2px solid transparent",
                  borderRadius: "0 6px 6px 0",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 150ms ease",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-outfit), system-ui, sans-serif",
                      fontSize: "13px",
                      color: selectedEntityId === port.id ? "#ffffff" : "rgba(255, 255, 255, 0.8)",
                    }}
                  >
                    {port.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono), ui-monospace, monospace",
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.4)",
                    }}
                  >
                    {port.country} · {(port.annual_teu / 1000000).toFixed(1)}M TEU
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono), ui-monospace, monospace",
                    fontSize: "9px",
                    padding: "2px 6px",
                    backgroundColor: "rgba(34, 211, 238, 0.2)",
                    color: "#22d3ee",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  {port.type}
                </span>
              </button>
            ))
          )}
        </div>
      </MenuSection>

      <MenuSection title="All Entities" count={entityInfos.length}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {entityInfos.length === 0 ? (
            <div
              style={{
                fontFamily: "var(--font-outfit), system-ui, sans-serif",
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.4)",
                padding: "8px 0",
              }}
            >
              No entities
            </div>
          ) : (
            entityInfos.map((entity) => (
              <button
                key={entity.id}
                onClick={() => onEntitySelect?.(entity.id)}
                style={{
                  padding: "6px 10px",
                  backgroundColor: selectedEntityId === entity.id
                    ? entity.type === "port"
                      ? "rgba(34, 211, 238, 0.2)"
                      : "rgba(168, 85, 247, 0.2)"
                    : "rgba(255, 255, 255, 0.05)",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-outfit), system-ui, sans-serif",
                    fontSize: "12px",
                    color: entity.type === "port" ? "#22d3ee" : "#a855f7",
                  }}
                >
                  {entity.name}
                </span>
              </button>
            ))
          )}
        </div>
      </MenuSection>
    </div>
  );
}
