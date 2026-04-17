"use client";

import { Player } from "@remotion/player";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const HERO_FPS = 30;
const HERO_DURATION_IN_FRAMES = 360;
const HERO_WIDTH = 1280;
const HERO_HEIGHT = 720;

function Hero3DComposition() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const progress = frame / HERO_DURATION_IN_FRAMES;
  const cameraZ = interpolate(frame, [0, fps * 3], [8.4, 6.8], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const leadRotation = frame * 0.02;
  const ringSpin = frame * 0.012;
  const pulse = spring({
    fps,
    frame,
    config: {
      damping: 20,
      stiffness: 90,
      mass: 1
    }
  });
  const glowScale = 1 + pulse * 0.12;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 18% 20%, rgba(255, 190, 162, 0.45), transparent 38%), radial-gradient(circle at 82% 15%, rgba(136, 106, 224, 0.42), transparent 35%), linear-gradient(145deg, #f7f0ff 0%, #ece2ff 46%, #e5dbff 100%)"
      }}>
      <ThreeCanvas width={width} height={height}>
        <ambientLight intensity={0.52} />
        <directionalLight intensity={0.95} position={[4, 5, 5]} />
        <pointLight color="#8a63e5" intensity={1.4} position={[-4, 2.5, 3]} />
        <pointLight color="#ff9c89" intensity={1.1} position={[3.5, -2, 2]} />

        <group position={[0, -0.2, 0]} rotation={[0.15, ringSpin, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.6, 0.08, 18, 140]} />
            <meshStandardMaterial color="#a98cf4" emissive="#8d6ce2" emissiveIntensity={0.3} />
          </mesh>
          <mesh rotation={[Math.PI / 2, Math.PI / 3, 0]}>
            <torusGeometry args={[1.85, 0.06, 18, 110]} />
            <meshStandardMaterial color="#f6ab95" emissive="#e78f78" emissiveIntensity={0.22} />
          </mesh>
        </group>

        <mesh position={[0, 0, 0]} rotation={[0.1, leadRotation, 0.18]} scale={glowScale}>
          <icosahedronGeometry args={[1.25, 1]} />
          <meshStandardMaterial
            color="#7d58d6"
            emissive="#6c47cb"
            emissiveIntensity={0.4 + progress * 0.18}
            metalness={0.35}
            roughness={0.35}
          />
        </mesh>

        <mesh position={[2.6, 1.15, -0.8]} rotation={[leadRotation * 0.85, 0.4, 0.15]}>
          <octahedronGeometry args={[0.52]} />
          <meshStandardMaterial color="#ffd8cb" metalness={0.18} roughness={0.42} />
        </mesh>

        <mesh position={[-2.3, -1.05, -1.15]} rotation={[0.2, -leadRotation * 1.15, 0.36]}>
          <dodecahedronGeometry args={[0.58]} />
          <meshStandardMaterial color="#bda4ff" metalness={0.15} roughness={0.45} />
        </mesh>

        <perspectiveCamera makeDefault fov={35} position={[0, 0.25, cameraZ]} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
}

export function LoginHeroScene() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/65 bg-white/45 p-2 shadow-[0_30px_80px_rgba(111,82,167,0.22)] backdrop-blur-xl">
      <Player
        autoPlay
        component={Hero3DComposition}
        compositionHeight={HERO_HEIGHT}
        compositionWidth={HERO_WIDTH}
        controls={false}
        durationInFrames={HERO_DURATION_IN_FRAMES}
        fps={HERO_FPS}
        loop
        style={{
          width: "100%",
          aspectRatio: `${HERO_WIDTH} / ${HERO_HEIGHT}`,
          borderRadius: "1.5rem",
          overflow: "hidden"
        }}
      />
      <div className="pointer-events-none absolute inset-0 rounded-[1.65rem] ring-1 ring-white/35" />
    </div>
  );
}
