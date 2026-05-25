"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Html, OrbitControls } from "@react-three/drei";
import { fetchSpatialData, getAllPorts, getAllChokepoints, getAllRoutes, SpatialPort, SpatialChokepoint, SpatialRoute } from "@/lib/spatial-data";
import { emitGlobeEvent } from "@/lib/globe-events";
import { GLOBE_RADIUS, latLng, PIN_ALTITUDE, DOT_ALTITUDE, LAND_ALTITUDE, ARC_MIN_ALTITUDE } from "@/lib/globe-constants";

const PIN_CLICK_RADIUS = 0.075;
const CHOKEPOINT_PRIORITY_CLICK_RADIUS = 0.14;

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
        const a = latLng(ring[i][1], ring[i][0], LAND_ALTITUDE);
        const b = latLng(ring[i + 1][1], ring[i + 1][0], LAND_ALTITUDE);
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

interface RouteGeometry {
  geo: THREE.BufferGeometry;
  routeId: string;
}

type RouteCoord = { latitude: number; longitude: number };

function buildRoutePathGeometry(points: RouteCoord[]): THREE.BufferGeometry {
  const vectors = points.map((point) => latLng(point.latitude, point.longitude, ARC_MIN_ALTITUDE));
  const curvePoints =
    vectors.length === 3
      ? new THREE.QuadraticBezierCurve3(vectors[0], vectors[1], vectors[2]).getPoints(72)
      : new THREE.CatmullRomCurve3(vectors, false, "centripetal", 0.4).getPoints(
          Math.max(32, (points.length - 1) * 32)
        );
  const positions = curvePoints.flatMap((point) => {
    const p = point.clone().normalize().multiplyScalar(ARC_MIN_ALTITUDE);
    return [p.x, p.y, p.z];
  });

  return new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
}

function RouteLine({ geometry, active }: { geometry: THREE.BufferGeometry; active: boolean }) {
  const material = useMemo(() => {
    if (active) {
      return new THREE.LineBasicMaterial({
        color: "#3b82f6",
        transparent: true,
        opacity: 0.92,
      });
    }

    return new THREE.LineDashedMaterial({
      color: "#94a3b8",
      dashSize: 0.045,
      gapSize: 0.095,
      transparent: true,
      opacity: 0.34,
    });
  }, [active]);

  const line = useMemo(() => new THREE.Line(geometry, material), [geometry, material]);

  useEffect(() => {
    line.computeLineDistances();
    return () => material.dispose();
  }, [line, material]);

  return <primitive object={line} />;
}

interface GlobeProps {
  countries: GeoFeature[];
  ports: SpatialPort[];
  chokepoints: SpatialChokepoint[];
  routes: SpatialRoute[];
  highlightedEntities: string[];
  highlightedRouteIds: string[];
  activeRouteIds: string[];
  autoRotate?: boolean;
  onPinClick?: (pinId: string | null) => void;
  selectedPinId?: string | null;
  showOnlyChokepoints?: boolean;
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
  isClickable,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: {
  pin: PinData;
  isSelected: boolean;
  isHovered: boolean;
  isClickable: boolean;
  onClick: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const scale = isSelected ? 1.8 : isHovered ? 1.3 : 1;
  const pinColor = pin.type === "chokepoint" ? "#a855f7" : "#22d3ee";
  const ringColor = pin.type === "chokepoint" ? "#a855f7" : "#22d3ee";

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.15);
    }
  });

  return (
    <group position={pin.position}>
      <mesh
        ref={meshRef}
        onClick={isClickable ? onClick : undefined}
        onPointerEnter={isClickable ? onPointerEnter : undefined}
        onPointerLeave={isClickable ? onPointerLeave : undefined}
      >
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color={pinColor} />
      </mesh>
      {isSelected && (
        <mesh>
          <ringGeometry args={[0.06, 0.075, 16]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.6} side={THREE.DoubleSide} />
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
  activeRouteIds,
  autoRotate = false,
  onPinClick,
  selectedPinId,
  showOnlyChokepoints = false,
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
        const p = latLng(lat, lng, DOT_ALTITUDE);
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

  const chokepointCoords = useMemo(() => {
    const coords = new Map<string, { latitude: number; longitude: number }>();
    for (const chokepoint of chokepoints) {
      coords.set(chokepoint.id, { latitude: chokepoint.latitude, longitude: chokepoint.longitude });
    }
    return coords;
  }, [chokepoints]);

  const visibleRoutes = useMemo(() => {
    if (highlightedRouteIds.length === 0) return [];
    const visibleRouteIds = new Set(highlightedRouteIds);
    return routes.filter((route) => visibleRouteIds.has(route.id));
  }, [routes, highlightedRouteIds]);

  const scenarioChokepointIds = useMemo(() => {
    return highlightedEntities.filter((id) => chokepointCoords.has(id));
  }, [highlightedEntities, chokepointCoords]);

  const routeGeometries = useMemo(() => {
    const activeRouteIdSet = new Set(activeRouteIds);

    return visibleRoutes.reduce<{ background: RouteGeometry[]; active: RouteGeometry[] }>(
      (acc, route) => {
        const origin = portCoords.get(route.origin_port_id);
        const dest = portCoords.get(route.destination_port_id);
        if (!origin || !dest) return acc;

        const routeChokepointIds =
          selectedPinId &&
          chokepointCoords.has(selectedPinId) &&
          route.chokepoints_transited.includes(selectedPinId)
            ? [selectedPinId]
            : route.chokepoints_transited.filter((id) => scenarioChokepointIds.includes(id));

        const waypointCoords = routeChokepointIds
          .map((id) => chokepointCoords.get(id))
          .filter((coord): coord is RouteCoord => Boolean(coord));

        const routeGeometry = {
          geo: buildRoutePathGeometry([origin, ...waypointCoords, dest]),
          routeId: route.id,
        };

        if (activeRouteIdSet.has(route.id)) {
          acc.active.push(routeGeometry);
        } else {
          acc.background.push(routeGeometry);
        }
        return acc;
      },
      { background: [], active: [] }
    );
  }, [activeRouteIds, chokepointCoords, portCoords, scenarioChokepointIds, selectedPinId, visibleRoutes]);

  const allPins = useMemo<PinData[]>(() => {
    const pins: PinData[] = [];
    for (const port of ports) {
      pins.push({
        position: latLng(port.latitude, port.longitude, PIN_ALTITUDE),
        id: port.id,
        name: port.name,
        type: "port",
      });
    }
    for (const cp of chokepoints) {
      pins.push({
        position: latLng(cp.latitude, cp.longitude, PIN_ALTITUDE),
        id: cp.id,
        name: cp.name,
        type: "chokepoint",
      });
    }
    return pins;
  }, [ports, chokepoints]);

  const visiblePins = useMemo(() => {
    if (highlightedEntities.length > 0) {
      return allPins.filter(pin => highlightedEntities.includes(pin.id));
    }
    if (showOnlyChokepoints) {
      return allPins.filter(pin => pin.type === "chokepoint");
    }
    return allPins;
  }, [allPins, highlightedEntities, showOnlyChokepoints]);

  const clickablePinIds = useMemo(() => {
    if (scenarioChokepointIds.length > 0) return new Set(scenarioChokepointIds);
    if (showOnlyChokepoints) {
      return new Set(visiblePins.filter((pin) => pin.type === "chokepoint").map((pin) => pin.id));
    }
    return new Set<string>();
  }, [scenarioChokepointIds, showOnlyChokepoints, visiblePins]);

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
    const clickedClickablePin = visiblePins.find(pin =>
      clickablePinIds.has(pin.id) &&
      intersects.some(hit =>
        Math.abs(hit.point.distanceTo(pin.position)) < CHOKEPOINT_PRIORITY_CLICK_RADIUS
      )
    );
    const clickedVisiblePin = intersects.find(hit =>
      visiblePins.some(pin =>
        Math.abs(hit.point.distanceTo(pin.position)) < PIN_CLICK_RADIUS
      )
    );

    if (clickedClickablePin) {
      handlePinClick(clickedClickablePin.id);
      return;
    }

    if (!clickedClickablePin && !clickedVisiblePin) {
      onPinClick?.(null);
    }
  }, [camera, clickablePinIds, gl, handlePinClick, onPinClick, visiblePins]);

  useEffect(() => {
    gl.domElement.addEventListener("click", handleCanvasClick);
    return () => gl.domElement.removeEventListener("click", handleCanvasClick);
  }, [gl, handleCanvasClick]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const t = elapsed.current;

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
          <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
          <meshBasicMaterial color="#0a0a1a" />
        </mesh>

        <points geometry={dotGeo}>
          <pointsMaterial color="#ffffff" size={0.011} transparent opacity={0.2} sizeAttenuation />
        </points>

        {landGeo && (
          <lineSegments geometry={landGeo}>
            <lineBasicMaterial color="#ffffff" transparent opacity={0.12} />
          </lineSegments>
        )}

        {routeGeometries.background.map(({ geo, routeId }) => (
          <RouteLine key={`bg-${routeId}`} geometry={geo} active={false} />
        ))}

        {routeGeometries.active.map(({ geo, routeId }) => {
          return <RouteLine key={routeId} geometry={geo} active />;
        })}

        {visiblePins.map((pin) => (
          <PinMesh
            key={pin.id}
            pin={pin}
            isSelected={selectedPinId === pin.id}
            isHovered={hoveredPinId === pin.id}
            isClickable={clickablePinIds.has(pin.id)}
            onClick={() => handlePinClick(pin.id)}
            onPointerEnter={() => setHoveredPinId(pin.id)}
            onPointerLeave={() => setHoveredPinId(null)}
          />
        ))}

        <instancedMesh ref={glowMeshes} args={[undefined, undefined, Math.max(1, glowPositions.length)]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.12} />
        </instancedMesh>

        <mesh scale={[1.05, 1.05, 1.05]}>
          <sphereGeometry args={[GLOBE_RADIUS, 24, 24]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.02} side={THREE.BackSide} />
        </mesh>
      </group>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minDistance={8}
        maxDistance={18}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        target={[0, 0, 0]}
      />
    </>
  );
}

export interface SideGlobeProps {
  highlightedEntities?: string[];
  highlightedRouteIds?: string[];
  activeRouteIds?: string[];
  autoRotate?: boolean;
  onPinClick?: (pinId: string | null) => void;
  selectedPinId?: string | null;
  dpr?: number;
  showOnlyChokepoints?: boolean;
  onReady?: () => void;
}

export default function SideGlobe({
  highlightedEntities = [],
  highlightedRouteIds = [],
  activeRouteIds = [],
  autoRotate = false,
  onPinClick,
  selectedPinId,
  dpr = 1,
  showOnlyChokepoints = false,
  onReady,
}: SideGlobeProps) {
  const [countries, setCountries] = useState<GeoFeature[]>([]);
  const [ports, setPorts] = useState<SpatialPort[]>([]);
  const [chokepoints, setChokepoints] = useState<SpatialChokepoint[]>([]);
  const [routes, setRoutes] = useState<SpatialRoute[]>([]);
  const [spatialStatus, setSpatialStatus] = useState<"loading" | "ready">("loading");
  const [showWakeNotice, setShowWakeNotice] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const readyNotified = useRef(false);

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
    if (spatialStatus !== "loading") return;
    const timer = window.setTimeout(() => setShowWakeNotice(true), 2000);
    return () => window.clearTimeout(timer);
  }, [spatialStatus]);

  useEffect(() => {
    let cancelled = false;
    const retryDelays = [0, 5000, 15000, 30000];

    const loadSpatialData = async (attempt: number) => {
      if (retryDelays[attempt] > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, retryDelays[attempt]));
      }
      if (cancelled) return;

      try {
        await fetchSpatialData();
        if (cancelled) return;
        setPorts(getAllPorts());
        setChokepoints(getAllChokepoints());
        setRoutes(getAllRoutes());
        setSpatialStatus("ready");
        setShowWakeNotice(false);
      } catch (err) {
        if (cancelled) return;
        console.warn("Spatial data is not ready yet; retrying:", err);
        setShowWakeNotice(true);
        void loadSpatialData(Math.min(attempt + 1, retryDelays.length - 1));
      }
    };

    void loadSpatialData(0);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (canvasReady && !readyNotified.current) {
      readyNotified.current = true;
      onReady?.();
    }
  }, [canvasReady, onReady]);

  return (
    <div className="absolute inset-0" style={{ clipPath: "inset(0 0 0 0%)", pointerEvents: "auto" }}>
      {showWakeNotice && (
        <div
          role="status"
          className="fixed left-6 bottom-6 z-[100] max-w-[340px] rounded-md px-4 py-3 text-xs leading-relaxed shadow-2xl"
          style={{
            backgroundColor: "rgba(8, 12, 18, 0.94)",
            border: "1px solid rgba(34, 211, 238, 0.28)",
            color: "rgba(255, 255, 255, 0.92)",
            fontFamily: "var(--font-outfit), system-ui, sans-serif",
            backdropFilter: "blur(10px)",
            whiteSpace: "normal",
            overflowWrap: "break-word",
          }}
        >
          Server is waking up. Map data will appear shortly.
        </div>
      )}
      <Canvas
        camera={{ position: [-1, 0, 12], fov: 45 }}
        dpr={dpr}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
          });
          gl.domElement.addEventListener("webglcontextrestored", () => {
          });
          setCanvasReady(true);
        }}
        style={{ background: "transparent" }}
      >
        <color attach="background" args={["#000000"]} />
        <Globe
          countries={countries}
          ports={ports}
          chokepoints={chokepoints}
          routes={routes}
          highlightedEntities={highlightedEntities}
          highlightedRouteIds={highlightedRouteIds}
          activeRouteIds={activeRouteIds}
          autoRotate={autoRotate}
          onPinClick={onPinClick}
          selectedPinId={selectedPinId}
          showOnlyChokepoints={showOnlyChokepoints}
        />
      </Canvas>
    </div>
  );
}
