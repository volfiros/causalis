"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GlobeEventPayload } from "@/lib/globe-events";
import { SpatialPort, SpatialChokepoint, SpatialRoute } from "@/lib/spatial-data";
import { VersionPanel } from "./VersionPanel";
import { Menus } from "./Menus";
import { PinDetails } from "./PinDetails";
import { FilterControls } from "./FilterControls";
import { FullscreenToggle } from "./FullscreenToggle";
import { ImpactStatsCard } from "./ImpactStatsCard";
import { CarrierTableCard } from "./CarrierTableCard";
import { PortCard } from "./PortCard";
import { RouteCard } from "./RouteCard";
import { GlobeVersionCard } from "./GlobeVersionCard";

// Sample carrier data - in production this would come from the API
const SAMPLE_CARRIERS = [
  { name: "Maersk", exposure: 0.85 },
  { name: "MSC", exposure: 0.72 },
  { name: "CMA CGM", exposure: 0.65 },
  { name: "COSCO", exposure: 0.58 },
  { name: "Hapag-Lloyd", exposure: 0.45 },
  { name: "ONE", exposure: 0.38 },
];

export { ImpactStatsCard, CarrierTableCard, PortCard, RouteCard, GlobeVersionCard };

export interface EntityInfo {
  id: string;
  name: string;
  type: "port" | "chokepoint";
}

interface GlobeSidebarProps {
  globeState: GlobeEventPayload | null;
  isOpen: boolean;
  onClose: () => void;
  entityInfos: EntityInfo[];
  selectedEntityId?: string | null;
  onEntitySelect?: (entityId: string) => void;
  ports: SpatialPort[];
  chokepoints: SpatialChokepoint[];
  routes: SpatialRoute[];
  onFilterChange?: (filters: { routeIds: string[] }) => void;
  onClearFilters?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function GlobeSidebar({
  globeState,
  isOpen,
  onClose,
  entityInfos,
  selectedEntityId,
  onEntitySelect,
  ports,
  chokepoints,
  routes,
  onFilterChange,
  onClearFilters,
  isFullscreen = false,
  onToggleFullscreen,
}: GlobeSidebarProps) {
  const selectedPort = selectedEntityId ? ports.find(p => p.id === selectedEntityId) ?? null : null;
  const selectedChokepoint = selectedEntityId ? chokepoints.find(cp => cp.id === selectedEntityId) ?? null : null;

  return (
    <AnimatePresence>
      {isOpen && globeState !== null && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "320px",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
            zIndex: 20,
            padding: "24px",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "24px",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-outfit), system-ui, sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: "#ffffff",
              }}
            >
              Globe View
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {onToggleFullscreen && (
                <FullscreenToggle isFullscreen={isFullscreen} onToggle={onToggleFullscreen} />
              )}
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.5)",
                  cursor: "pointer",
                  fontSize: "18px",
                  padding: "4px",
                }}
              >
                ×
              </button>
            </div>
          </div>

          <VersionPanel version={globeState.version} />

          <ImpactStatsCard
            vessels={globeState.entities.length * 45 + 120}
            routes={routes.filter(r => 
              globeState.entities.some(e => 
                r.chokepoints_transited.includes(e) ||
                r.origin_port_id === e ||
                r.destination_port_id === e
              )
            ).length}
            costUsd={globeState.entities.length * 25000000 + 150000000}
          />

          <CarrierTableCard carriers={SAMPLE_CARRIERS} />

          <PinDetails
            selectedPort={selectedPort}
            selectedChokepoint={selectedChokepoint}
            onClose={() => onEntitySelect?.("")}
          />

          <Menus
            entityInfos={entityInfos}
            ports={ports}
            chokepoints={chokepoints}
            routes={routes}
            selectedEntityId={selectedEntityId}
            onEntitySelect={onEntitySelect}
          />

          <FilterControls
            onFilterChange={onFilterChange}
            onClearFilters={onClearFilters}
            hasFilters={!!selectedEntityId}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
