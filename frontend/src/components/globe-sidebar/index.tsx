"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { GlobeEventPayload } from "@/lib/globe-events";
import { SpatialPort, SpatialChokepoint, SpatialRoute } from "@/lib/spatial-data";
import SideGlobe from "@/components/SideGlobe";
import { ImpactStatsCard } from "./ImpactStatsCard";
import { CarrierTableCard } from "./CarrierTableCard";
import { Menus } from "./Menus";

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

function DropdownSection({
  id,
  title,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: isOpen 
          ? "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(34, 211, 238, 0.2)" 
          : "0 8px 24px rgba(0, 0, 0, 0.4)",
        transition: "box-shadow 0.2s ease",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#ffffff",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {title}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4" style={{ color: "#22d3ee" }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: "rgba(255, 255, 255, 0.5)" }} />
        )}
      </button>
      {isOpen && (
        <div style={{ padding: "0 16px 16px", overflow: "hidden" }}>
          {children}
        </div>
      )}
    </div>
  );
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
  onClearFilters,
  highlightedEntities = [],
  highlightedRouteIds = [],
  onPinClick,
}: GlobeSidebarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggleDropdown = (id: string) => {
    setOpenDropdown((current) => current === id ? null : id);
  };

  if (!isOpen || !globeState) return null;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "50%",
        height: "100vh",
        zIndex: 50,
        overflow: "hidden",
      }}
    >
      {/* Globe Container - Full size filling entire sidebar */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background: "radial-gradient(ellipse at center, rgba(10, 10, 30, 0.9) 0%, rgba(0, 0, 0, 1) 70%)",
        }}
      >
        <SideGlobe
          highlightedEntities={highlightedEntities}
          highlightedRouteIds={highlightedRouteIds}
          selectedPinId={selectedEntityId}
          onPinClick={onPinClick}
          dpr={1.5}
        />
      </div>

      {/* Close Button - Top Right */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          zIndex: 60,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "12px",
          color: "#ffffff",
          fontSize: "24px",
          width: "44px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 150ms ease",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.3)";
          e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(239, 68, 68, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.75)";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.4)";
        }}
      >
        ×
      </button>

      {/* Top Section - Dropdowns */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          right: "80px",
          zIndex: 60,
          display: "flex",
          gap: "12px",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
        <DropdownSection
          id="scenarios-dropdown"
          title="Active Scenarios"
          isOpen={openDropdown === "scenarios"}
          onToggle={() => toggleDropdown("scenarios")}
        >
          <Menus
            entityInfos={entityInfos}
            ports={ports}
            chokepoints={chokepoints}
            routes={routes}
            selectedEntityId={selectedEntityId}
            onEntitySelect={onEntitySelect}
          />
        </DropdownSection>
        </div>

        <div style={{ flex: "1 1 0", minWidth: 0 }}>
        <DropdownSection
          id="carriers-dropdown"
          title="Carriers"
          isOpen={openDropdown === "carriers"}
          onToggle={() => toggleDropdown("carriers")}
        >
          <CarrierTableCard carriers={SAMPLE_CARRIERS} />
        </DropdownSection>
        </div>
      </div>

      {/* Bottom Section - Impact Stats */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          right: "16px",
          zIndex: 60,
        }}
      >
        <ImpactStatsCard
          vessels={globeState.entities.length * 45 + 120}
          routes={routes.filter((r) =>
            globeState.entities.some(
              (e) =>
                r.chokepoints_transited.includes(e) ||
                r.origin_port_id === e ||
                r.destination_port_id === e
            )
          ).length}
          costUsd={globeState.entities.length * 25000000 + 150000000}
        />
      </div>
    </motion.div>
  );
}
