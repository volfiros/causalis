"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { GlobeEventPayload } from "@/lib/globe-events";
import { SpatialPort, SpatialChokepoint, SpatialRoute } from "@/lib/spatial-data";
import { SimulationData } from "@/lib/use-simulation";
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
  simulationData?: SimulationData | null;
  simulationLoading?: boolean;
}

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
  simulationData,
  simulationLoading,
}: GlobeSidebarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggleDropdown = (id: string) => {
    setOpenDropdown((current) => current === id ? null : id);
  };

  if (!isOpen || !globeState) return null;

  const affectedVessels = simulationData?.scenario?.affected_vessels ?? 0;
  const affectedRoutes = simulationData?.affected_routes?.length ?? 0;
  const totalCost = simulationData?.carriers?.reduce(
    (sum, c) => sum + c.estimated_daily_risk_usd, 0
  ) ?? 0;

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
      {/* Globe Container - Full size filling entire sidebar, shifted up */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          top: "-5%",
          bottom: "5%",
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
            simulationData={simulationData}
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
          <CarrierTableCard
            carriers={simulationData?.carriers ?? []}
            loading={simulationLoading}
          />
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
          vessels={affectedVessels}
          routes={affectedRoutes}
          costUsd={totalCost}
          loading={simulationLoading}
        />
      </div>
    </motion.div>
  );
}