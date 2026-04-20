"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group, Object3D } from "three";
import { Box3, MathUtils, Vector3 } from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

const MODEL_ROOT = "/models/racing-bicycle";
const MODEL_URL = `${MODEL_ROOT}/racing-bicycle.obj`;
const MATERIAL_URL = `${MODEL_ROOT}/racing-bicycle.mtl`;

function BicycleModel() {
  const groupRef = useRef<Group | null>(null);
  const hoverTarget = useRef({ x: 0, y: 0 });
  const isHovering = useRef(false);
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
    const idleLift = -0.16 + Math.sin(clock.elapsedTime * 0.9) * 0.03;
    const idleTiltX = 0.06 + Math.sin(clock.elapsedTime * 0.75) * 0.015;
    const idleTiltY = -0.9 + Math.sin(clock.elapsedTime * 0.45) * 0.05;
    const hoverTiltX = idleTiltX + hoverTarget.current.y * 0.2;
    const hoverTiltY = idleTiltY + hoverTarget.current.x * 0.38;
    const hoverTiltZ = hoverTarget.current.x * 0.06;

    group.rotation.x = MathUtils.lerp(group.rotation.x, isHovering.current ? hoverTiltX : idleTiltX, smoothing);
    group.rotation.y = MathUtils.lerp(group.rotation.y, isHovering.current ? hoverTiltY : idleTiltY, smoothing);
    group.rotation.z = MathUtils.lerp(group.rotation.z, isHovering.current ? hoverTiltZ : 0.01, smoothing);
    group.position.y = MathUtils.lerp(group.position.y, isHovering.current ? -0.12 : idleLift, smoothing);
  });

  return (
    <group
      ref={groupRef}
      position={[0, -0.16, 0]}
      onPointerEnter={(event) => {
        event.stopPropagation();
        isHovering.current = true;
      }}
      onPointerLeave={(event) => {
        event.stopPropagation();
        isHovering.current = false;
      }}
      onPointerMove={(event) => {
        event.stopPropagation();
        isHovering.current = true;
        hoverTarget.current = {
          x: event.pointer.x,
          y: -event.pointer.y
        };
      }}>
      {model ? <primitive object={model} /> : null}
    </group>
  );
}

function HeroStage() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.55),transparent_44%),linear-gradient(145deg,#f8f3ff_0%,#efe6ff_48%,#e0d3fb_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,168,144,0.28),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(134,104,224,0.32),transparent_26%),radial-gradient(circle_at_50%_90%,rgba(108,214,183,0.2),transparent_32%)]" />
      <Canvas
        className="relative z-10 h-full w-full"
        dpr={[1, 1.75]}
        camera={{ fov: 28, position: [0, 0.25, 6.1] }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        style={{ cursor: "grab" }}>
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
        <BicycleModel />
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
