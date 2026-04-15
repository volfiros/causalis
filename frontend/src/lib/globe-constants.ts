import * as THREE from "three";

export const GLOBE_RADIUS = 3;

export const PIN_ALTITUDE = GLOBE_RADIUS * 1.015;
export const DOT_ALTITUDE = GLOBE_RADIUS * 1.001;
export const LAND_ALTITUDE = GLOBE_RADIUS * 1.003;
export const ARC_MIN_ALTITUDE = GLOBE_RADIUS * 1.015;
export const ARC_HEIGHT = GLOBE_RADIUS * 1.25;

export function latLng(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}