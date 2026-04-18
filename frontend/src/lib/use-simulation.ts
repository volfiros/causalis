import { useState, useEffect, useCallback } from "react";

export interface SimulationScenario {
  chokepoints: string[];
  severity: string;
  affected_vessels: number;
}

export interface SimulationCarrier {
  name: string;
  carrier_id: string;
  exposure_score: number;
  routes_exposed: number;
  estimated_daily_risk_usd: number;
}

export interface SimulationRerouting {
  alternatives: Array<{
    route_id: string;
    original_route_id: string;
    additional_days: number;
    additional_cost_usd: number;
    vessels_affected: number;
  }>;
}

export interface SimulationPortCongestion {
  port_id: string;
  baseline_congestion: number;
  forecast_congestion: number;
  dwell_increase_hours: number;
}

export interface SimulationCascade {
  impact_timeline: Array<{
    port: string;
    hours_to_impact: number;
  }>;
}

export interface SimulationAffectedRoute {
  id: string;
  name: string;
  origin_port_id: string;
  destination_port_id: string;
}

export interface SimulationData {
  scenario: SimulationScenario;
  affected_routes: SimulationAffectedRoute[];
  carriers: SimulationCarrier[];
  rerouting: SimulationRerouting;
  port_congestion: SimulationPortCongestion[];
  cascade: SimulationCascade;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function getApiBase(): string {
  if (API_BASE) return API_BASE;
  if (typeof window !== "undefined") return "";
  return "http://localhost:8000";
}

let simulationCache = new Map<string, SimulationData>();

export function useSimulation(entities: string[], message: string = "") {
  const [data, setData] = useState<SimulationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSimulation = useCallback(async (entityList: string[], msg: string) => {
    if (entityList.length === 0) {
      setData(null);
      return;
    }

    const chokepoints = entityList.join(",");
    const cacheKey = `${chokepoints}:${msg}`;

    if (simulationCache.has(cacheKey)) {
      setData(simulationCache.get(cacheKey)!);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${getApiBase()}/api/simulate?chokepoints=${encodeURIComponent(chokepoints)}&message=${encodeURIComponent(msg)}`
      );
      if (!res.ok) throw new Error(`Simulation failed: ${res.status}`);
      const result: SimulationData = await res.json();
      simulationCache.set(cacheKey, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (entities.length === 0) {
      setData(null);
      return;
    }
    fetchSimulation(entities, message);
  }, [entities.join(","), message, fetchSimulation]);

  return { data, loading, error };
}
