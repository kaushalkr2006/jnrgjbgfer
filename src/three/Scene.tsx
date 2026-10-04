import { useEffect, useRef } from 'react';
import { NoToneMapping, type Object3D } from 'three';
import { Canvas, advance, useFrame, useThree } from '@react-three/fiber';
import { TIERS, type Tier } from '../core/quality';
import { addTick, frame } from '../core/ticker';
import { engine } from '../core/scroll';
import { app } from '../core/store';
import { STOPS, firstStopOf } from '../core/timeline';
import { projects } from '../content/projects';
import { shared } from './shared';
import { clamp } from '../core/math';
import { CameraRig } from './CameraRig';
import { Atmosphere } from './Atmosphere';
import { SystemBus } from './SystemBus';
import { HeroStation } from './stations/HeroStation';
import { IdentityStation } from './stations/IdentityStation';
import { TechnicalStack } from './stations/TechnicalStack';
import { FlowStation } from './stations/FlowStation';
import { CareerStation } from './stations/CareerStation';
import { EvidenceStation } from './stations/EvidenceStation';
import { FinalStation } from './stations/FinalStation';
import { ProjectScene } from './projects/ProjectScene';

const INTRO_SECONDS = 2.8;

/** Drives R3F from the shared ticker so camera, DOM and render use the same scroll sample. */
function FrameDriver() {
  const state = useRef({ introStart: -1 });
  useEffect(
    () =>
      addTick((t, dt) => {
        shared.uTime.value += engine.reduced ? 0 : dt;
        const s = state.current;
        if (app.get().glReady) {
          if (s.introStart < 0) s.introStart = t;
          shared.uIntro.value = engine.reduced ? 1 : clamp((t - s.introStart) / INTRO_SECONDS);
        }
        advance(t);
      }, 100),
    [],
  );
  return null;
}

/** Adaptive resolution: steps the pixel ratio down if frame time stays high. */
function PerfGovernor({ min, max }: { min: number; max: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const st = useRef({ ema: 1 / 60, slow: 0, dpr: Math.min(window.devicePixelRatio || 1, max), cooldown: 2.5 });
  useFrame(() => {
    const s = st.current;
    const dt = frame.dt;
    s.ema = s.ema * 0.94 + dt * 0.06;
    s.cooldown -= dt;
    if (s.cooldown > 0) return;
    if (s.ema > 1 / 48) {
      s.slow += dt;
      if (s.slow > 1 && s.dpr > min) {
        s.dpr = Math.max(min, Math.round((s.dpr - 0.25) * 100) / 100);
        setDpr(s.dpr);
        s.slow = 0;
        s.cooldown = 1.5;
      }
    } else s.slow = Math.max(0, s.slow - dt * 0.5);
  });
  return null;
}

/**
 * Compiles every shader and uploads every buffer/texture once, behind the (still hidden)
 * canvas, so no station causes a hitch the first time the camera reaches it.
 */
function Prewarm() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if (/[?&]debug\b/.test(window.location.search)) (window as unknown as { __gl: unknown }).__gl = gl;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const hidden: Object3D[] = [];
        const culled: Object3D[] = [];
        scene.traverse((o) => {
          if (!o.visible) {
            hidden.push(o);
            o.visible = true;
          }
          if (o.frustumCulled) {
            culled.push(o);
            o.frustumCulled = false;
          }
        });
        try {
          gl.compile(scene, camera);
          gl.render(scene, camera);
        } finally {
          hidden.forEach((o) => (o.visible = false));
          culled.forEach((o) => (o.frustumCulled = true));
          app.set({ glReady: true });
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [gl, scene, camera]);
  return null;
}

export default function Scene({ tier }: { tier: Tier }) {
  const t = TIERS[tier];
  const first = firstStopOf('projects');
  return (
    <Canvas
      frameloop="never"
      dpr={[t.dprMin, t.dprMax]}
      flat
      gl={{ antialias: t.antialias, powerPreference: 'high-performance', alpha: false, stencil: false, toneMapping: NoToneMapping }}
      camera={{ fov: 42, near: 0.1, far: 160, position: STOPS[0].cam }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <FrameDriver />
      <PerfGovernor min={t.dprMin} max={t.dprMax} />
      <Atmosphere envMap={t.envMap} />
      <CameraRig parallax={t.parallax} />
      <SystemBus />
      <HeroStation density={t.density} />
      <IdentityStation cellPx={t.voxelPx} />
      <TechnicalStack />
      {projects.map((p, i) => (
        <ProjectScene key={p.id} project={p} stop={first + i} density={t.density} />
      ))}
      <FlowStation />
      <CareerStation />
      <EvidenceStation />
      <FinalStation density={t.density} />
      <Prewarm />
    </Canvas>
  );
}
