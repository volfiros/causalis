import * as THREE from "three";
import { SpatialRoute } from "./spatial-data";

export interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  animated: boolean;
  width: number;
  routeId: string;
}

const R = 3;

function latLng(lat: number, lng: number, r: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

const MIN_ALTITUDE = R * 1.005;

function clampAboveSurface(point: THREE.Vector3): THREE.Vector3 {
  const len = point.length();
  if (len < MIN_ALTITUDE) {
    return point.clone().normalize().multiplyScalar(MIN_ALTITUDE);
  }
  return point;
}

export function buildArcGeometry(
  start: [number, number],
  end: [number, number],
  arcHeight: number = R * 1.25,
  segments: number = 32
): THREE.BufferGeometry {
  const startVec = latLng(start[0], start[1], MIN_ALTITUDE);
  const endVec = latLng(end[0], end[1], MIN_ALTITUDE);

  const mid = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  mid.normalize().multiplyScalar(arcHeight);

  const curve = new THREE.QuadraticBezierCurve3(startVec, mid, endVec);
  const points = curve.getPoints(segments);

  const positions: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = clampAboveSurface(points[i]);
    const p1 = clampAboveSurface(points[i + 1]);
    positions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

export function computeArcsFromRoutes(
  routes: SpatialRoute[],
  portCoords: Map<string, { latitude: number; longitude: number }>,
  affectedRouteIds: string[] = []
): ArcData[] {
  const arcs: ArcData[] = [];

  for (const route of routes) {
    const origin = portCoords.get(route.origin_port_id);
    const dest = portCoords.get(route.destination_port_id);

    if (!origin || !dest) continue;

    const isAffected = affectedRouteIds.includes(route.id);

    arcs.push({
      startLat: origin.latitude,
      startLng: origin.longitude,
      endLat: dest.latitude,
      endLng: dest.longitude,
      color: isAffected ? "#3b82f6" : "#ffffff",
      animated: isAffected,
      width: isAffected ? 2 : 1,
      routeId: route.id,
    });
  }

  return arcs;
}