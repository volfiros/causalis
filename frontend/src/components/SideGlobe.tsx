"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { subscribeToGlobeEvents } from "@/lib/globe-events";
import { fetchSpatialData, getAllPorts, getAllChokepoints, getEntityCoords, SpatialPort, SpatialChokepoint } from "@/lib/spatial-data";

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

interface PinData {
  position: THREE.Vector3;
  id: string;
  name: string;
  type: "port" | "chokepoint";
}

interface GlobeProps {
  countries: GeoFeature[];
  ports: SpatialPort[];
  chokepoints: SpatialChokepoint[];
  highlightedEntities: string[];
  autoRotate?: boolean;
}

function Globe({ countries, ports, chokepoints, highlightedEntities, autoRotate = false }: GlobeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowMeshes = useRef<THREE.InstancedMesh>(null);
  const elapsed = useRef(0);

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

  const allPins = useMemo<PinData[]>(() => {
    const pins: PinData[] = [];
    for (const port of ports) {
      pins.push({
        position: latLng(port.latitude, port.longitude, R * 1.015),
        id: port.id,
        name: port.name,
        type: "port",
      });
    }
    for (const cp of chokepoints) {
      pins.push({
        position: latLng(cp.latitude, cp.longitude, R * 1.015),
        id: cp.id,
        name: cp.name,
        type: "chokepoint",
      });
    }
    return pins;
  }, [ports, chokepoints]);

  const visiblePins = useMemo(() => {
    if (highlightedEntities.length === 0) return allPins;
    return allPins.filter(pin => highlightedEntities.includes(pin.id));
  }, [allPins, highlightedEntities]);

  const glowPositions = useMemo(() => {
    return visiblePins.map(pin => pin.position);
  }, [visiblePins]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const t = elapsed.current;

    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y = t * 0.06;
    }

    if (glowMeshes.current && glowPositions.length > 0) {
      const dummy = new THREE.Object3D();
      for (let i = 0; i < glowPositions.length; i++) {
        const s = 1 + Math.sin(t * 2 + i * 0.8) * 0.3;
        dummy.position.copy(glowPositions[i]);
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

        {visiblePins.map((pin) => (
          <mesh key={pin.id} position={pin.position}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color="#22d3ee" />
          </mesh>
        ))}

        <instancedMesh ref={glowMeshes} args={[undefined, undefined, Math.max(1, glowPositions.length)]}>
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

export interface SideGlobeProps {
  highlightedEntities?: string[];
  autoRotate?: boolean;
}

export default function SideGlobe({ highlightedEntities = [], autoRotate = false }: SideGlobeProps) {
  const [countries, setCountries] = useState<GeoFeature[]>([]);
  const [ports, setPorts] = useState<SpatialPort[]>([]);
  const [chokepoints, setChokepoints] = useState<SpatialChokepoint[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

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

  useEffect(() => {
    fetchSpatialData()
      .then(() => {
        setPorts(getAllPorts());
        setChokepoints(getAllChokepoints());
        setDataLoaded(true);
      })
      .catch((err) => console.error("Failed to load spatial data:", err));
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
        {dataLoaded && (
          <Globe
            countries={countries}
            ports={ports}
            chokepoints={chokepoints}
            highlightedEntities={highlightedEntities}
            autoRotate={autoRotate}
          />
        )}
      </Canvas>
    </div>
  );
}
