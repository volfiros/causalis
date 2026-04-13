"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const R = 4;

function latLng(lat: number, lng: number, r: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

const CHOKEPOINTS = [
  { lat: 30.5, lng: 32.3 }, { lat: 9.1, lng: -79.7 }, { lat: 2.5, lng: 101.5 },
  { lat: 12.6, lng: 43.3 }, { lat: 26.5, lng: 56.3 }, { lat: 36.1, lng: -5.4 },
  { lat: 1.4, lng: 104.0 }, { lat: 41.0, lng: 29.0 }, { lat: 34.1, lng: 32.3 },
  { lat: -6.2, lng: 39.2 }, { lat: 13.0, lng: 100.5 }, { lat: 22.3, lng: 114.2 },
];

const PORTS = [
  { lat: 31.2, lng: 121.5 }, { lat: 1.3, lng: 103.8 }, { lat: 51.9, lng: 4.5 },
  { lat: 33.7, lng: -118.3 }, { lat: 25.2, lng: 55.3 }, { lat: 53.5, lng: 10.0 },
  { lat: 22.3, lng: 114.2 }, { lat: 35.1, lng: 129.0 }, { lat: -33.9, lng: 18.4 },
  { lat: 13.7, lng: 100.5 }, { lat: 22.0, lng: 114.1 }, { lat: 28.6, lng: 77.2 },
  { lat: 1.3, lng: 124.9 }, { lat: -23.0, lng: -43.2 }, { lat: 19.1, lng: 72.9 },
  { lat: 21.0, lng: -86.8 }, { lat: 51.0, lng: 1.3 }, { lat: 40.7, lng: -74.0 },
];

const ROUTES = [
  [0, 1], [1, 2], [3, 1], [4, 1], [2, 5], [0, 6], [7, 0], [8, 2],
  [9, 1], [11, 4], [12, 1], [13, 8], [14, 4], [16, 2], [17, 3], [15, 3],
];

interface GeoFeature {
  type: string;
  geometry: { type: string; coordinates: number[][][] | number[][][][] };
}

function buildLandGeometry(features: GeoFeature[]): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const feature of features) {
    const geo = feature.geometry;
    const polygons: number[][][][] =
      geo.type === "MultiPolygon" ? geo.coordinates as number[][][][] : [geo.coordinates as number[][][]];
    for (const polygon of polygons) {
      const ring = polygon[0];
      if (!ring || ring.length < 2) continue;
      for (let i = 0; i < ring.length - 1; i++) {
        const a = latLng(ring[i][1], ring[i][0], R * 1.003);
        const b = latLng(ring[i + 1][1], ring[i + 1][0], R * 1.003);
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
  }
  return new THREE.BufferGeometry().setAttribute(
    "position", new THREE.Float32BufferAttribute(positions, 3)
  );
}

function buildRouteGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const [ai, bi] of ROUTES) {
    const a = PORTS[ai], b = PORTS[bi];
    const start = latLng(a.lat, a.lng, R * 1.005);
    const end = latLng(b.lat, b.lng, R * 1.005);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(R * 1.2);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const pts = curve.getPoints(24);
    for (let i = 0; i < pts.length - 1; i++) {
      positions.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
    }
  }
  return new THREE.BufferGeometry().setAttribute(
    "position", new THREE.Float32BufferAttribute(positions, 3)
  );
}

const chokePositions = CHOKEPOINTS.map((cp) => latLng(cp.lat, cp.lng, R * 1.015));

function Globe({ countries }: { countries: GeoFeature[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const glowMeshes = useRef<THREE.InstancedMesh>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);

  const landGeo = useMemo(() => {
    if (countries.length === 0) return null;
    return buildLandGeometry(countries);
  }, [countries]);

  const dotGeo = useMemo(() => {
    const pts: number[] = [];
    for (let lat = -85; lat <= 85; lat += 3) {
      const circumference = Math.cos((lat * Math.PI) / 180);
      const lngStep = Math.max(3, Math.round(3 / circumference));
      for (let lng = -180; lng < 180; lng += lngStep) {
        const p = latLng(lat, lng, R * 1.001);
        pts.push(p.x, p.y, p.z);
      }
    }
    return new THREE.BufferGeometry().setAttribute(
      "position", new THREE.BufferAttribute(new Float32Array(pts), 3)
    );
  }, []);

  const routeGeo = useMemo(() => buildRouteGeometry(), []);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const t = elapsed.current;
    const rot = t * 0.06;

    if (groupRef.current) groupRef.current.rotation.y = rot;

    if (glowMeshes.current) {
      const dummy = new THREE.Object3D();
      for (let i = 0; i < CHOKEPOINTS.length; i++) {
        const s = 1 + Math.sin(t * 2 + i * 0.8) * 0.3;
        dummy.position.copy(chokePositions[i]);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        glowMeshes.current.setMatrixAt(i, dummy.matrix);
      }
      glowMeshes.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 8, 10]} intensity={1.2} />
      <pointLight position={[-8, 0, -8]} intensity={0.3} color="#22d3ee" />

      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[R, 48, 48]} />
          <meshBasicMaterial color="#0a0a1a" />
        </mesh>

        <points geometry={dotGeo}>
          <pointsMaterial color="#ffffff" size={0.015} transparent opacity={0.2} sizeAttenuation />
        </points>

        {landGeo && (
          <lineSegments geometry={landGeo}>
            <lineBasicMaterial color="#ffffff" transparent opacity={0.12} />
          </lineSegments>
        )}

        <lineSegments geometry={routeGeo}>
          <lineBasicMaterial color="#22d3ee" transparent opacity={0.12} />
        </lineSegments>

        {chokePositions.map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color="#22d3ee" />
          </mesh>
        ))}

        <instancedMesh ref={glowMeshes} args={[undefined, undefined, CHOKEPOINTS.length]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.12} />
        </instancedMesh>

        <mesh scale={[1.06, 1.06, 1.06]}>
          <sphereGeometry args={[R, 24, 24]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.02} side={THREE.BackSide} />
        </mesh>
      </group>
    </>
  );
}

export default function SideGlobe() {
  const [countries, setCountries] = useState<GeoFeature[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(
      "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson",
      { signal: controller.signal }
    )
      .then((res) => res.json())
      .then((data) => setCountries(data.features))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <div className="absolute inset-0" style={{ clipPath: "inset(0 0 0 0%)" }}>
      <Canvas
        camera={{ position: [-1.75, 0, 10.5], fov: 45 }}
        dpr={1}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <color attach="background" args={["#000000"]} />
        <Globe countries={countries} />
      </Canvas>
    </div>
  );
}
