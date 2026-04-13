export interface SpatialPort {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  type: string;
  annual_teu: number;
  max_draft_meters: number;
  typical_dwell_hours: number;
}

export interface SpatialChokepoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  daily_vessels: number;
  strategic_importance: number;
}

export interface SpatialRoute {
  id: string;
  name: string;
  origin_port_id: string;
  destination_port_id: string;
  chokepoints_transited: string[];
  distance_nm: number;
  transit_days: number;
}

interface SpatialDataCache {
  ports: Map<string, SpatialPort>;
  chokepoints: Map<string, SpatialChokepoint>;
  routes: Map<string, SpatialRoute>;
  initialized: boolean;
}

const cache: SpatialDataCache = {
  ports: new Map(),
  chokepoints: new Map(),
  routes: new Map(),
  initialized: false,
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchSpatialData(): Promise<void> {
  if (cache.initialized) return;

  const [portsRes, chokepointsRes, routesRes] = await Promise.all([
    fetch(`${API_BASE}/v1/spatial/ports`),
    fetch(`${API_BASE}/v1/spatial/chokepoints`),
    fetch(`${API_BASE}/v1/spatial/routes`),
  ]);

  if (!portsRes.ok) throw new Error(`Failed to fetch ports: ${portsRes.status}`);
  if (!chokepointsRes.ok) throw new Error(`Failed to fetch chokepoints: ${chokepointsRes.status}`);
  if (!routesRes.ok) throw new Error(`Failed to fetch routes: ${routesRes.status}`);

  const portsData = await portsRes.json();
  const chokepointsData = await chokepointsRes.json();
  const routesData = await routesRes.json();

  cache.ports.clear();
  cache.chokepoints.clear();
  cache.routes.clear();

  for (const port of portsData.ports) {
    cache.ports.set(port.id, port);
  }

  for (const cp of chokepointsData.chokepoints) {
    cache.chokepoints.set(cp.id, cp);
  }

  for (const route of routesData.routes) {
    cache.routes.set(route.id, route);
  }

  cache.initialized = true;
}

export function getEntityCoords(id: string): { latitude: number; longitude: number; type: "port" | "chokepoint" } | null {
  const port = cache.ports.get(id);
  if (port) {
    return { latitude: port.latitude, longitude: port.longitude, type: "port" };
  }

  const chokepoint = cache.chokepoints.get(id);
  if (chokepoint) {
    return { latitude: chokepoint.latitude, longitude: chokepoint.longitude, type: "chokepoint" };
  }

  return null;
}

export function getPortById(id: string): SpatialPort | null {
  return cache.ports.get(id) || null;
}

export function getChokepointById(id: string): SpatialChokepoint | null {
  return cache.chokepoints.get(id) || null;
}

export function getRoutesInvolving(entityId: string): SpatialRoute[] {
  const routes: SpatialRoute[] = [];

  for (const route of cache.routes.values()) {
    if (
      route.chokepoints_transited.includes(entityId) ||
      route.origin_port_id === entityId ||
      route.destination_port_id === entityId
    ) {
      routes.push(route);
    }
  }

  return routes;
}

export function getAllPorts(): SpatialPort[] {
  return Array.from(cache.ports.values());
}

export function getAllChokepoints(): SpatialChokepoint[] {
  return Array.from(cache.chokepoints.values());
}

export function getAllRoutes(): SpatialRoute[] {
  return Array.from(cache.routes.values());
}

export function isCacheInitialized(): boolean {
  return cache.initialized;
}
