"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Html, OrbitControls } from "@react-three/drei";
import { fetchSpatialData, getAllPorts, getAllChokepoints, getAllRoutes, SpatialPort, SpatialChokepoint, SpatialRoute } from "@/lib/spatial-data";
import { buildArcGeometry, ArcData, computeArcsFromRoutes } from "@/lib/arc-utils";
import { emitGlobeEvent } from "@/lib/globe-events";

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
  routes: SpatialRoute[];
  highlightedEntities: string[];
  highlightedRouteIds: string[];
  autoRotate?: boolean;
  onPinClick?: (pinId: string) => void;
  selectedPinId?: string | null;
}

function PinTooltip({ name, type, visible }: { name: string; type: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <Html distanceFactor={10}>
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "6px",
          padding: "8px 12px",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          opacity: visible ? 1 : 0,
          transition: "opacity 150ms ease",
          transform: "translate(-50%, -120%)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-outfit), system-ui, sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            color: "#ffffff",
            marginBottom: "2px",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: type === "port" ? "#22d3ee" : "#a855f7",
          }}
        >
          {type}
        </div>
      </div>
    </Html>
  );
}

function PinMesh({
  pin,
  isSelected,
  isHovered,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: {
  pin: PinData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const scale = isSelected ? 1.8 : isHovered ? 1.3 : 1;

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.15);
    }
  });

  return (
    <group position={pin.position}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
      {isSelected && (
        <mesh>
          <ringGeometry args={[0.08, 0.1, 16]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
      <PinTooltip name={pin.name} type={pin.type} visible={isHovered || isSelected} />
    </group>
  );
}

function Globe({
  countries,
  ports,
  chokepoints,
  routes,
  highlightedEntities,
  highlightedRouteIds,
  autoRotate = false,
  onPinClick,
  selectedPinId,
}: GlobeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowMeshes = useRef<THREE.InstancedMesh>(null);
  const elapsed = useRef(0);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const { camera, gl } = useThree();

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

  const portCoords = useMemo(() => {
    const coords = new Map<string, { latitude: number; longitude: number }>();
    for (const port of ports) {
      coords.set(port.id, { latitude: port.latitude, longitude: port.longitude });
    }
    return coords;
  }, [ports]);

  const arcs = useMemo<ArcData[]>(() => {
    return computeArcsFromRoutes(routes, portCoords, highlightedRouteIds);
  }, [routes, portCoords, highlightedRouteIds]);

  const backgroundArcs = useMemo(() => arcs.filter(a => !a.animated), [arcs]);
  const affectedArcs = useMemo(() => arcs.filter(a => a.animated), [arcs]);

  const backgroundArcGeos = useMemo(() => {
    return backgroundArcs.map(arc => ({
      geo: buildArcGeometry([arc.startLat, arc.startLng], [arc.endLat, arc.endLng], R * 1.2, 24),
      routeId: arc.routeId,
    }));
  }, [backgroundArcs]);

  const affectedArcGeos = useMemo(() => {
    return affectedArcs.map(arc => ({
      geo: buildArcGeometry([arc.startLat, arc.startLng], [arc.endLat, arc.endLng], R * 1.2, 24),
      routeId: arc.routeId,
    }));
  }, [affectedArcs]);

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

  const handlePinClick = useCallback((pinId: string) => {
    onPinClick?.(pinId);
    emitGlobeEvent({
      version: 1,
      entities: highlightedEntities,
      selectedEntityId: pinId,
    });
  }, [onPinClick, highlightedEntities]);

  const handleCanvasClick = useCallback((event: MouseEvent) => {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const rect = gl.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const globeGroup = groupRef.current;
    if (!globeGroup) return;

    const intersects = raycaster.intersectObjects(globeGroup.children, true);
    const clickedPin = intersects.find(hit =>
      visiblePins.some(pin =>
        Math.abs(hit.point.distanceTo(pin.position)) < 0.1
      )
    );

    if (!clickedPin) {
      onPinClick?.(null as unknown as string);
    }
  }, [camera, gl, onPinClick, visiblePins]);

  useEffect(() => {
    gl.domElement.addEventListener("click", handleCanvasClick);
    return () => gl.domElement.removeEventListener("click", handleCanvasClick);
  }, [gl, handleCanvasClick]);

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

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        const material = child.material;
        if (material instanceof THREE.LineDashedMaterial) {
          (material as THREE.LineDashedMaterial & { dashOffset: number }).dashOffset -= 0.01;
        }
      }
    });
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

        {backgroundArcGeos.map(({ geo, routeId }) => (
          <lineSegments key={`bg-${routeId}`} geometry={geo}>
            <lineBasicMaterial color="#ffffff" transparent opacity={0.08} />
          </lineSegments>
        ))}

        {affectedArcGeos.map(({ geo, routeId }) => {
          return (
            <lineSegments key={routeId} geometry={geo}>
              <lineDashedMaterial
                color="#3b82f6"
                dashSize={0.15}
                gapSize={0.08}
                linewidth={2}
                transparent
                opacity={0.8}
              />
            </lineSegments>
          );
        })}

        {visiblePins.map((pin) => (
          <PinMesh
            key={pin.id}
            pin={pin}
            isSelected={selectedPinId === pin.id}
            isHovered={hoveredPinId === pin.id}
            onClick={() => handlePinClick(pin.id)}
            onPointerEnter={() => setHoveredPinId(pin.id)}
            onPointerLeave={() => setHoveredPinId(null)}
          />
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
  highlightedRouteIds?: string[];
  autoRotate?: boolean;
  onPinClick?: (pinId: string) => void;
  selectedPinId?: string | null;
  dpr?: number;
}

export default function SideGlobe({
  highlightedEntities = [],
  highlightedRouteIds = [],
  autoRotate = false,
  onPinClick,
  selectedPinId,
  dpr = 1,
}: SideGlobeProps) {
  const [countries, setCountries] = useState<GeoFeature[]>([]);
  const [ports, setPorts] = useState<SpatialPort[]>([]);
  const [chokepoints, setChokepoints] = useState<SpatialChokepoint[]>([]);
  const [routes, setRoutes] = useState<SpatialRoute[]>([]);
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
        setRoutes(getAllRoutes());
        setDataLoaded(true);
      })
      .catch((err) => console.error("Failed to load spatial data:", err));
  }, []);

  return (
    <div className="absolute inset-0" style={{ clipPath: "inset(0 0 0 0%)", pointerEvents: "auto" }}>
      <Canvas
        camera={{ position: [-1.75, 0, 10.5], fov: 45 }}
        dpr={dpr}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
          });
          gl.domElement.addEventListener("webglcontextrestored", () => {
            // Force scene re-render after context restore
          });
        }}
        style={{ background: "transparent" }}
      >
        <color attach="background" args={["#000000"]} />
        {dataLoaded && (
          <Globe
            countries={countries}
            ports={ports}
            chokepoints={chokepoints}
            routes={routes}
            highlightedEntities={highlightedEntities}
            highlightedRouteIds={highlightedRouteIds}
            autoRotate={autoRotate}
            onPinClick={onPinClick}
            selectedPinId={selectedPinId}
          />
        )}
      </Canvas>
    </div>
  );
}
