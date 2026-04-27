"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react";
import type { Group, Material, Mesh, Object3D, Texture } from "three";
import { Box3, Color, MathUtils, MeshStandardMaterial, Vector3 } from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

const MODEL_ROOT = "/models/racing-bicycle";
const MODEL_URL = `${MODEL_ROOT}/racing-bicycle.obj`;
const MATERIAL_URL = `${MODEL_ROOT}/racing-bicycle.mtl`;
const DRAG_ROTATION_SCALE = 0.0046;
const DRAG_ROTATION_X_MIN = -0.42;
const DRAG_ROTATION_X_MAX = 0.28;
const INERTIA_DECAY_PER_FRAME = 0.94;
const INERTIA_STOP_EPSILON = 0.00003;
const HOVER_DAMPING = 0.075;
const ROTATION_DAMPING = 0.115;
const POSITION_DAMPING = 0.085;

type BicycleModelProps = {
  readonly dragRotationRef: MutableRefObject<{ x: number; y: number }>;
  readonly dragVelocityRef: MutableRefObject<{ x: number; y: number }>;
  readonly hoverTargetRef: MutableRefObject<{ x: number; y: number }>;
  readonly isDraggingRef: MutableRefObject<boolean>;
  readonly isHoveringRef: MutableRefObject<boolean>;
};

type Point3 = readonly [number, number, number];

function Tube({
  from,
  radius = 0.035,
  to
}: {
  readonly from: Point3;
  readonly radius?: number;
  readonly to: Point3;
}) {
  const midpoint: Point3 = [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
    (from[2] + to[2]) / 2
  ];
  const deltaX = to[0] - from[0];
  const deltaY = to[1] - from[1];
  const length = Math.hypot(deltaX, deltaY);
  const rotationZ = -Math.atan2(deltaX, deltaY);

  return (
    <mesh position={midpoint} rotation={[0, 0, rotationZ]}>
      <cylinderGeometry args={[radius, radius, length, 28]} />
      <meshStandardMaterial color="#f8f4ff" metalness={0.72} roughness={0.18} />
    </mesh>
  );
}

function PremiumBicycleGeometry() {
  const rearHub: Point3 = [-1.18, -0.62, 0.02];
  const frontHub: Point3 = [1.18, -0.62, 0.02];
  const crank: Point3 = [-0.18, -0.5, 0.08];
  const seat: Point3 = [-0.54, 0.22, 0.05];
  const handlebarStem: Point3 = [0.86, 0.14, 0.04];
  const handlebar: Point3 = [1.1, 0.34, 0.02];

  return (
    <group position={[0, -0.02, 0]} rotation={[0.02, 0, 0]}>
      <mesh position={rearHub} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.52, 0.028, 24, 96]} />
        <meshStandardMaterial color="#171421" metalness={0.24} roughness={0.32} />
      </mesh>
      <mesh position={frontHub} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.52, 0.028, 24, 96]} />
        <meshStandardMaterial color="#171421" metalness={0.24} roughness={0.32} />
      </mesh>
      {[rearHub, frontHub].map((hub) => (
        <mesh key={hub[0]} position={hub} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.4, 0.006, 12, 80]} />
          <meshStandardMaterial color="#fff9f2" metalness={0.86} roughness={0.16} />
        </mesh>
      ))}
      <Tube from={rearHub} to={crank} />
      <Tube from={crank} to={frontHub} />
      <Tube from={rearHub} to={seat} />
      <Tube from={seat} to={crank} radius={0.04} />
      <Tube from={seat} to={handlebarStem} radius={0.042} />
      <Tube from={handlebarStem} to={frontHub} />
      <Tube from={handlebarStem} to={handlebar} radius={0.026} />
      <mesh position={[-0.58, 0.31, 0.06]} rotation={[0, 0, -0.08]}>
        <boxGeometry args={[0.44, 0.08, 0.08]} />
        <meshStandardMaterial color="#211a31" metalness={0.18} roughness={0.28} />
      </mesh>
      <mesh position={[1.2, 0.38, 0.02]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.38, 0.045, 0.06]} />
        <meshStandardMaterial color="#211a31" metalness={0.26} roughness={0.24} />
      </mesh>
      <mesh position={crank} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.14, 0.012, 12, 56]} />
        <meshStandardMaterial color="#d8c7ff" metalness={0.82} roughness={0.12} />
      </mesh>
    </group>
  );
}

function BicycleModel({
  dragRotationRef,
  dragVelocityRef,
  hoverTargetRef,
  isDraggingRef,
  isHoveringRef
}: BicycleModelProps) {
  const groupRef = useRef<Group | null>(null);
  const presentationRef = useRef({ x: 0, y: 0 });
  const [rawModel, setRawModel] = useState<Object3D | null>(null);

  useEffect(() => {
    let cancelled = false;

    const mtlLoader = new MTLLoader();
    mtlLoader.load(
      MATERIAL_URL,
      (materials) => {
        if (cancelled) {
          return;
        }

        materials.preload();

        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load(
          MODEL_URL,
          (object) => {
            if (!cancelled) {
              setRawModel(object);
            }
          },
          undefined,
          () => {
            if (!cancelled) {
              setRawModel(null);
            }
          }
        );
      },
      undefined,
      () => {
        if (!cancelled) {
          setRawModel(null);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const [model, setModel] = useState<Object3D | null>(null);

  useEffect(() => {
    if (!rawModel) {
      return;
    }

    let disposed = false;
    const clone = rawModel.clone(true);
    const box = new Box3().setFromObject(clone);
    const size = new Vector3();
    const center = new Vector3();

    box.getSize(size);
    box.getCenter(center);

    const largestAxis = Math.max(size.x, size.y, size.z);
    const scale = 3.35 / largestAxis;
    const offset = center.clone().multiplyScalar(scale);

    clone.position.set(-offset.x, -offset.y + 0.05, -offset.z);
    clone.scale.setScalar(scale);
    clone.traverse((child) => {
      if ("castShadow" in child) {
        child.castShadow = true;
      }

      if ("receiveShadow" in child) {
        child.receiveShadow = true;
      }

      const mesh = child as Mesh;

      if (!mesh.isMesh) {
        return;
      }

      const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      mesh.material = sourceMaterials.map((material, index) =>
        createPremiumMaterial(material, index)
      ) as Mesh["material"];
    });

    const frame = setTimeout(() => {
      if (!disposed) {
        setModel(clone);
      }
    }, 0);

    return () => {
      disposed = true;
      clearTimeout(frame);
      clone.traverse((child) => {
        const object = child as {
          geometry?: { dispose(): void } | null;
          material?: Array<{
            dispose(): void;
            map?: { dispose(): void } | null;
          }> | {
            dispose(): void;
            map?: { dispose(): void } | null;
          } | null;
        };

        object.geometry?.dispose();

        if (!object.material) {
          return;
        }

        const materials = Array.isArray(object.material) ? object.material : [object.material];

        for (const material of materials) {
          material.map?.dispose();

          material.dispose();
        }
      });

      if (clone.parent) {
        clone.parent.remove(clone);
      }

      setModel(null);
    };
  }, [rawModel]);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;

    if (!group || !model) {
      return;
    }

    const smoothing = 1 - Math.pow(1 - ROTATION_DAMPING, delta * 60);
    const hoverSmoothing = 1 - Math.pow(1 - HOVER_DAMPING, delta * 60);
    const positionSmoothing = 1 - Math.pow(1 - POSITION_DAMPING, delta * 60);
    const frameFactor = delta * 60;

    presentationRef.current = {
      x: MathUtils.lerp(presentationRef.current.x, hoverTargetRef.current.x, hoverSmoothing),
      y: MathUtils.lerp(presentationRef.current.y, hoverTargetRef.current.y, hoverSmoothing)
    };

    if (!isDraggingRef.current) {
      dragRotationRef.current = {
        x: MathUtils.clamp(
          dragRotationRef.current.x + dragVelocityRef.current.x * frameFactor,
          DRAG_ROTATION_X_MIN,
          DRAG_ROTATION_X_MAX
        ),
        y: dragRotationRef.current.y + dragVelocityRef.current.y * frameFactor
      };

      const decay = Math.pow(INERTIA_DECAY_PER_FRAME, frameFactor);
      dragVelocityRef.current = {
        x:
          Math.abs(dragVelocityRef.current.x) < INERTIA_STOP_EPSILON
            ? 0
            : dragVelocityRef.current.x * decay,
        y:
          Math.abs(dragVelocityRef.current.y) < INERTIA_STOP_EPSILON
            ? 0
            : dragVelocityRef.current.y * decay
      };
    }

    const idleLift = -0.2 + Math.sin(clock.elapsedTime * 0.72) * 0.025;
    const idleTiltX = 0.045 + Math.sin(clock.elapsedTime * 0.58) * 0.01;
    const idleTiltY = -0.86 + Math.sin(clock.elapsedTime * 0.38) * 0.045;
    const hoverTiltX = idleTiltX + presentationRef.current.y * 0.13;
    const hoverTiltY = idleTiltY + presentationRef.current.x * 0.26;
    const hoverTiltZ = presentationRef.current.x * 0.035;
    const targetRotationX = isDraggingRef.current
      ? idleTiltX + dragRotationRef.current.x
      : isHoveringRef.current
        ? hoverTiltX
        : idleTiltX;
    const targetRotationY = isDraggingRef.current
      ? idleTiltY + dragRotationRef.current.y
      : isHoveringRef.current
        ? hoverTiltY
        : idleTiltY;
    const targetRotationZ = isDraggingRef.current ? 0.01 : isHoveringRef.current ? hoverTiltZ : 0.01;

    group.rotation.x = MathUtils.lerp(group.rotation.x, targetRotationX, smoothing);
    group.rotation.y = MathUtils.lerp(group.rotation.y, targetRotationY, smoothing);
    group.rotation.z = MathUtils.lerp(group.rotation.z, targetRotationZ, smoothing);
    group.position.y = MathUtils.lerp(
      group.position.y,
      isHoveringRef.current || isDraggingRef.current ? -0.16 : idleLift,
      positionSmoothing
    );
  });

  return (
    <group ref={groupRef} position={[0, -0.16, 0]}>
      <PremiumBicycleGeometry />
      {model ? <primitive object={model} /> : null}
    </group>
  );
}

function createPremiumMaterial(material: Material, index: number) {
  const source = material as Material & {
    color?: Color;
    map?: Texture | null;
    name?: string;
  };
  const name = source.name?.toLowerCase() ?? "";
  const baseColor = source.color instanceof Color ? source.color.clone() : new Color("#efe8ff");
  const isTire = name.includes("tire") || name.includes("rubber") || index % 7 === 0;
  const isMetal = name.includes("rim") || name.includes("spoke") || name.includes("chain");

  return new MeshStandardMaterial({
    color: isTire ? new Color("#1d1a28") : baseColor.lerp(new Color("#f8f4ff"), 0.18),
    envMapIntensity: isMetal ? 1.4 : 0.9,
    map: source.map ?? null,
    metalness: isTire ? 0.2 : isMetal ? 0.72 : 0.45,
    roughness: isTire ? 0.38 : 0.22
  });
}

function HeroStage() {
  const [cursor, setCursor] = useState<"grab" | "grabbing">("grab");
  const hoverTargetRef = useRef({ x: 0, y: 0 });
  const isHoveringRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragRotationRef = useRef({ x: 0, y: 0 });
  const dragVelocityRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0, rotationX: 0, rotationY: 0 });
  const dragLastPointRef = useRef<{ x: number; y: number } | null>(null);

  const updateHoverTarget = (
    event: ReactPointerEvent<HTMLDivElement>,
    bounds: DOMRect
  ) => {
    hoverTargetRef.current = {
      x: ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      y: -(((event.clientY - bounds.top) / bounds.height) * 2 - 1)
    };
  };

  return (
    <div
      aria-label="Premium interactive 3D bicycle showcase"
      className="relative h-full w-full overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_50%_16%,rgba(255,255,255,0.86),transparent_34%),linear-gradient(145deg,#fffaf4_0%,#f0e8ff_44%,#d9cdf6_100%)]"
      role="img"
      onPointerEnter={(event) => {
        isHoveringRef.current = true;
        updateHoverTarget(event, event.currentTarget.getBoundingClientRect());
        if (!isDraggingRef.current) {
          setCursor("grab");
        }
      }}
      onPointerLeave={() => {
        if (isDraggingRef.current) {
          return;
        }

        isHoveringRef.current = false;
        setCursor("grab");
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        isDraggingRef.current = true;
        isHoveringRef.current = true;
        dragStartRef.current = {
          x: event.clientX,
          y: event.clientY,
          rotationX: dragRotationRef.current.x,
          rotationY: dragRotationRef.current.y
        };
        dragLastPointRef.current = {
          x: event.clientX,
          y: event.clientY
        };
        dragVelocityRef.current = {
          x: 0,
          y: 0
        };
        updateHoverTarget(event, event.currentTarget.getBoundingClientRect());
        setCursor("grabbing");
      }}
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();

        if (!isDraggingRef.current) {
          isHoveringRef.current = true;
          updateHoverTarget(event, bounds);
          return;
        }

        const dragX = event.clientX - dragStartRef.current.x;
        const dragY = event.clientY - dragStartRef.current.y;
        const lastPoint = dragLastPointRef.current;
        const deltaX = lastPoint ? event.clientX - lastPoint.x : 0;
        const deltaY = lastPoint ? event.clientY - lastPoint.y : 0;

        dragRotationRef.current = {
          x: MathUtils.clamp(
            dragStartRef.current.rotationX + dragY * DRAG_ROTATION_SCALE,
            DRAG_ROTATION_X_MIN,
            DRAG_ROTATION_X_MAX
          ),
          y: dragStartRef.current.rotationY + dragX * DRAG_ROTATION_SCALE
        };
        dragVelocityRef.current = {
          x: MathUtils.clamp(deltaY * DRAG_ROTATION_SCALE, -0.035, 0.035),
          y: MathUtils.clamp(deltaX * DRAG_ROTATION_SCALE, -0.05, 0.05)
        };
        dragLastPointRef.current = {
          x: event.clientX,
          y: event.clientY
        };
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }

        isDraggingRef.current = false;
        const bounds = event.currentTarget.getBoundingClientRect();
        const isInside =
          event.clientX >= bounds.left &&
          event.clientX <= bounds.right &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom;
        isHoveringRef.current = isInside;
        dragLastPointRef.current = null;
        setCursor("grab");
      }}
      onPointerCancel={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }

        isDraggingRef.current = false;
        isHoveringRef.current = false;
        dragLastPointRef.current = null;
        dragVelocityRef.current = {
          x: 0,
          y: 0
        };
        setCursor("grab");
      }}
      onLostPointerCapture={() => {
        isDraggingRef.current = false;
        isHoveringRef.current = false;
        dragLastPointRef.current = null;
        setCursor("grab");
      }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,198,167,0.34),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(135,104,224,0.32),transparent_28%),radial-gradient(circle_at_50%_96%,rgba(93,190,165,0.22),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-x-12 bottom-6 h-10 rounded-full bg-[radial-gradient(ellipse,rgba(72,48,116,0.24),transparent_68%)] blur-md" />
      <div className="pointer-events-none absolute left-8 top-7 rounded-full border border-white/60 bg-white/45 px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[var(--clay-accent-strong)] shadow-[0_12px_30px_rgba(91,54,178,0.16)] backdrop-blur-md">
        Drag to inspect
      </div>
      <div className="pointer-events-none absolute right-7 top-7 h-16 w-16 rounded-full border border-white/55 bg-[conic-gradient(from_140deg,rgba(255,255,255,0.88),rgba(202,181,255,0.42),rgba(255,214,196,0.66),rgba(255,255,255,0.88))] opacity-75 blur-[0.2px]" />
      <Canvas
        className="relative z-10 h-full w-full"
        dpr={[1.25, 2]}
        camera={{ fov: 25, position: [0, 0.2, 6.4] }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
        style={{ cursor }}>
        <ambientLight intensity={1.55} />
        <directionalLight color="#fff8ef" intensity={2.1} position={[4.8, 4.8, 5.2]} />
        <directionalLight color="#7d5de0" intensity={1.15} position={[-4.5, 1.6, 3.8]} />
        <spotLight
          angle={0.32}
          color="#ffd3bd"
          intensity={1.75}
          penumbra={0.9}
          position={[0, 5.4, 5.6]}
        />
        <pointLight color="#f4e5ff" intensity={1.15} position={[0, -1.2, 3.2]} />
        <mesh position={[0, -1.28, -0.08]}>
          <cylinderGeometry args={[1.95, 2.45, 0.16, 96]} />
          <meshStandardMaterial
            color="#f8f1ff"
            metalness={0.22}
            roughness={0.24}
            transparent
            opacity={0.86}
          />
        </mesh>
        <mesh position={[0, -1.19, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.86, 0.018, 16, 96]} />
          <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.18} />
        </mesh>
        <BicycleModel
          dragRotationRef={dragRotationRef}
          dragVelocityRef={dragVelocityRef}
          hoverTargetRef={hoverTargetRef}
          isDraggingRef={isDraggingRef}
          isHoveringRef={isHoveringRef}
        />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] ring-1 ring-white/55" />
    </div>
  );
}

export function LoginHeroScene() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/50 p-2 shadow-[0_34px_90px_rgba(79,55,133,0.24)] backdrop-blur-xl">
      <div className="relative aspect-[16/9] w-full">
        <HeroStage />
      </div>
    </div>
  );
}
