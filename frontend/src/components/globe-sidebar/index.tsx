"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GlobeEventPayload } from "@/lib/globe-events";
import { SpatialPort, SpatialChokepoint, SpatialRoute } from "@/lib/spatial-data";
import { VersionPanel } from "./VersionPanel";
import { ImpactStatsCard } from "./ImpactStatsCard";
import { CarrierTableCard } from "./CarrierTableCard";
import { PinDetails } from "./PinDetails";
import { Menus } from "./Menus";
import { FilterControls } from "./FilterControls";

export { ImpactStatsCard, CarrierTableCard };

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
  highlightedEntities?: string[];
  highlightedRouteIds?: string[];
  onPinClick?: (pinId: string | null) => void;
}

const SAMPLE_CARRIERS = [
  { name: "Maersk", exposure: 0.85 },
  { name: "MSC", exposure: 0.72 },
  { name: "CMA CGM", exposure: 0.65 },
  { name: "COSCO", exposure: 0.58 },
  { name: "Hapag-Lloyd", exposure: 0.45 },
  { name: "ONE", exposure: 0.38 },
];

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
  highlightedEntities = [],
  highlightedRouteIds = [],
  onPinClick,
}: GlobeSidebarProps) {
  const selectedPort = selectedEntityId ? ports.find(p => p.id === selectedEntityId) ?? null : null;
  const selectedChokepoint = selectedEntityId ? chokepoints.find(cp => cp.id === selectedEntityId) ?? null : null;

  return (
    <AnimatePresence>
      {isOpen && globeState !== null && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            zIndex: 50,
            maxHeight: "50vh",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255, 255, 255, 0.5)",
                cursor: "pointer",
                fontSize: "18px",
                padding: "4px 8px",
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 280px",
              gap: "8px",
              padding: "12px 20px 16px",
              overflow: "auto",
              maxHeight: "calc(50vh - 60px)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <CarrierTableCard carriers={SAMPLE_CARRIERS} />
              <PinDetails
                selectedPort={selectedPort}
                selectedChokepoint={selectedChokepoint}
                onClose={() => onEntitySelect?.("")}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}