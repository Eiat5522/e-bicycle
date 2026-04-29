"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react";
import type { Group, Object3D } from "three";
import { Box3, MathUtils, Vector3 } from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

const MODEL_ROOT = "/models/racing-bicycle";
const MODEL_URL = `${MODEL_ROOT}/racing-bicycle.obj`;
const MATERIAL_URL = `${MODEL_ROOT}/racing-bicycle.mtl`;
const DRAG_ROTATION_SCALE = 0.0065;
const DRAG_ROTATION_X_MIN = -0.6;
const DRAG_ROTATION_X_MAX = 0.35;
const INERTIA_DECAY_PER_FRAME = 0.96;
const INERTIA_STOP_EPSILON = 0.00005;

type BicycleModelProps = {
  readonly dragRotationRef: MutableRefObject<{ x: number; y: number }>;
  readonly dragVelocityRef: MutableRefObject<{ x: number; y: number }>;
  readonly hoverTargetRef: MutableRefObject<{ x: number; y: number }>;
  readonly isDraggingRef: MutableRefObject<boolean>;
  readonly isHoveringRef: MutableRefObject<boolean>;
};

function BicycleModel({
  dragRotationRef,
  dragVelocityRef,
  hoverTargetRef,
  isDraggingRef,
  isHoveringRef
}: BicycleModelProps) {
  const groupRef = useRef<Group | null>(null);
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

    clone.position.set(-offset.x, -offset.y + 0.1, -offset.z);
    clone.scale.setScalar(scale);
    clone.traverse((child) => {
      if ("castShadow" in child) {
        child.castShadow = true;
      }

      if ("receiveShadow" in child) {
        child.receiveShadow = true;
      }
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

    const smoothing = 1 - Math.pow(0.001, delta);
    const frameFactor = delta * 60;

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

    const idleLift = -0.16 + Math.sin(clock.elapsedTime * 0.9) * 0.03;
    const idleTiltX = 0.06 + Math.sin(clock.elapsedTime * 0.75) * 0.015;
    const idleTiltY = -0.9 + Math.sin(clock.elapsedTime * 0.45) * 0.05;
    const hoverTiltX = idleTiltX + hoverTargetRef.current.y * 0.2;
    const hoverTiltY = idleTiltY + hoverTargetRef.current.x * 0.38;
    const hoverTiltZ = hoverTargetRef.current.x * 0.06;
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
      isHoveringRef.current || isDraggingRef.current ? -0.12 : idleLift,
      smoothing
    );
  });

  return (
    <group ref={groupRef} position={[0, -0.16, 0]}>
      {model ? <primitive object={model} /> : null}
    </group>
  );
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
      className="relative h-full w-full overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.55),transparent_44%),linear-gradient(145deg,#f8f3ff_0%,#efe6ff_48%,#e0d3fb_100%)]"
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,168,144,0.28),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(134,104,224,0.32),transparent_26%),radial-gradient(circle_at_50%_90%,rgba(108,214,183,0.2),transparent_32%)]" />
      <Canvas
        className="relative z-10 h-full w-full"
        dpr={[1, 1.75]}
        camera={{ fov: 28, position: [0, 0.25, 6.1] }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        style={{ cursor }}>
        <ambientLight intensity={1.2} />
        <directionalLight color="#fff3fc" intensity={1.55} position={[4.5, 4.5, 5]} />
        <directionalLight color="#8a63e5" intensity={0.9} position={[-4, 1.5, 3.5]} />
        <spotLight
          angle={0.4}
          color="#ffb09b"
          intensity={1.25}
          penumbra={0.75}
          position={[0, 5, 5]}
        />
        <BicycleModel
          dragRotationRef={dragRotationRef}
          dragVelocityRef={dragVelocityRef}
          hoverTargetRef={hoverTargetRef}
          isDraggingRef={isDraggingRef}
          isHoveringRef={isHoveringRef}
        />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] ring-1 ring-white/35" />
    </div>
  );
}

export function LoginHeroScene() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/65 bg-white/45 p-2 shadow-[0_30px_80px_rgba(111,82,167,0.22)] backdrop-blur-xl">
      <div className="relative aspect-[16/9] w-full">
        <HeroStage />
      </div>
    </div>
  );
}
