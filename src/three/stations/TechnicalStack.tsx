import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  Color,
  Matrix4,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  type Group,
  type InstancedMesh,
  type LineBasicMaterial,
} from 'three';
import { useFrame } from '@react-three/fiber';
import { Station, useStationRef } from './Station';
import { ANCHORS, firstStopOf } from '../../core/timeline';
import { skillSystems } from '../../content/stack';
import { engine } from '../../core/scroll';
import { app } from '../../core/store';
import { selectSystem } from '../../core/stackSelection';
import { frame } from '../../core/ticker';
import { Spring, clamp, mulberry32 } from '../../core/math';
import { Glows } from '../objects/Glows';
import { Label } from '../objects/Label';
import { Traces } from '../objects/Traces';
import { SpatialObject } from '../objects/SpatialObject';
import { unitBox } from '../objects/Chip';
import { boxEdges } from '../geometry/edges';
import type { TracePath } from '../geometry/ribbons';
import { mats } from '../objects/materials';
import { cameraBias } from '../CameraRig';
import { shared, C } from '../shared';

const STOP = firstStopOf('stack');

/**
 * Floorplan of a die: each skill system is an IP block, sized like real macros (bigger
 * systems take more area). Coordinates are the block centre (x, z) and footprint (w, d).
 */
const FLOOR: { x: number; z: number; w: number; d: number }[] = [
  { x: 3.25, z: -2.05, w: 3.9, d: 2.9 }, // EMB  — 9 skills
  { x: -1.85, z: -2.05, w: 5.9, d: 2.9 }, // DIG  — 12 skills
  { x: -3.6, z: 1.15, w: 2.4, d: 2.9 }, // PCB  — 6
  { x: -0.85, z: 1.15, w: 2.7, d: 2.9 }, // DSP  — 6
  { x: 2.1, z: 1.15, w: 2.8, d: 2.9 }, // SW   — 7
  { x: 4.55, z: 1.15, w: 1.7, d: 2.9 }, // DSA  — 2
];
const SLAB = 0.07;

/* ---------------------------------------------------------------------------------------- */
/* Macro surface: standard-cell rows + guard ring, lit by selection, swept by a scan line     */
/* ---------------------------------------------------------------------------------------- */

const vertex = /* glsl */ `
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform vec2 uSize;
uniform float uActive;
uniform float uHover;
uniform float uTime;
uniform float uSeed;
varying vec2 vUv;
#include <fog_pars_fragment>
float h11(float n) { return fract(sin(n * 91.7 + uSeed * 13.1) * 43758.5453); }
float lines(float c, float pitch, float width) {
  float fw = max(fwidth(c), 1e-5);
  float d = abs(fract(c / pitch + 0.5) - 0.5) * pitch;
  float a = 1.0 - smoothstep(width * 0.5 - fw * 0.5, width * 0.5 + fw * 0.5, d);
  return mix(a, width / pitch, smoothstep(0.2, 0.6, fw / pitch));
}
void main() {
  vec2 p = (vUv - 0.5) * uSize;
  vec2 e = uSize * 0.5 - abs(p);
  float edge = min(e.x, e.y);
  float fw = fwidth(edge);
  float border = 1.0 - smoothstep(0.0, fw * 1.6, edge);
  float ring = 1.0 - smoothstep(0.0, fw * 1.4, abs(edge - 0.16));
  float inside = step(0.24, edge);

  float rowPitch = 0.11;
  float row = floor(p.y / rowPitch);
  float rows = lines(p.y, rowPitch, 0.012);
  float cellW = 0.16 + h11(row) * 0.32;
  float cells = lines(p.x + h11(row + 3.0), cellW, 0.01);
  float pattern = (rows * 0.55 + cells * 0.35) * inside;

  float a = uActive;
  float sweepX = fract(uTime * 0.22 + uSeed) * (uSize.x + 2.0) - 1.0 - uSize.x * 0.5;
  float scan = exp(-abs(p.x - sweepX) * 4.0) * a * inside;

  vec3 base = vec3(0.012, 0.014, 0.017);
  vec3 col = base
    + uColor * pattern * (0.06 + 0.42 * a + 0.12 * uHover)
    + uColor * border * (0.28 + 0.9 * a + 0.3 * uHover)
    + uColor * ring * (0.06 + 0.3 * a)
    + uColor * scan * 0.35;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

function macroMaterial(color: Color, size: [number, number], seed: number) {
  return new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      uTime: shared.uTime,
      uColor: { value: color.clone() },
      uSize: { value: size },
      uActive: { value: 0 },
      uHover: { value: 0 },
      uSeed: { value: seed },
    },
    fog: true,
  });
}

/** Pin positions laid out on a grid inside the block — one "pin" per skill. */
function pinLayout(n: number, w: number, d: number, seed: number) {
  const cols = Math.max(1, Math.round(Math.sqrt((n * w) / d)));
  const rows = Math.ceil(n / cols);
  const rng = mulberry32(seed);
  const iw = w - 0.9;
  const id = d - 0.9;
  return Array.from({ length: n }, (_, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = cols === 1 ? 0 : (c / (cols - 1) - 0.5) * iw;
    const z = rows === 1 ? 0 : (r / (rows - 1) - 0.5) * id;
    return { x, z, h: 0.55 + rng() * 0.75, delay: (i / n) * 0.55 };
  });
}

function MacroBlock({ k }: { k: number }) {
  const sys = skillSystems[k];
  const f = FLOOR[k];
  const station = useStationRef();
  const lift = useRef<Group>(null);
  const pinsRef = useRef<InstancedMesh>(null);
  const edgeMat = useRef<LineBasicMaterial>(null);
  const tipReveal = useMemo(() => ({ value: 0 }), []);
  const accent = k % 2 ? C.copper : C.signal;
  const material = useMemo(() => macroMaterial(accent, [f.w, f.d], k * 0.17 + 0.1), [accent, f.w, f.d, k]);
  const edges = useMemo(() => boxEdges([{ pos: [0, -SLAB / 2, 0], size: [f.w, SLAB, f.d] }]), [f.w, f.d]);
  const pins = useMemo(() => pinLayout(sys.skills.length, f.w, f.d, 31 + k * 7), [sys.skills.length, f.w, f.d, k]);
  const tips = useMemo(() => pins.map((p) => [p.x, p.h + 0.02, p.z] as [number, number, number]), [pins]);
  const tipDelays = useMemo(() => pins.map((p) => p.delay + 0.3), [pins]);
  const st = useRef({ level: new Spring(0, 90, 15), hover: 0, last: -1 });
  const m = useMemo(() => new Matrix4(), []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => edges.dispose(), [edges]);

  // Collapse all pins initially.
  useLayoutEffect(() => {
    const im = pinsRef.current;
    if (!im) return;
    pins.forEach((p, i) => {
      m.makeScale(0.035, 0.0001, 0.035);
      m.setPosition(p.x, 0, p.z);
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
  }, [pins, m]);

  useFrame(() => {
    if (!station.current?.visible) return;
    const s = st.current;
    const state = app.get();
    const selected = state.stackActive === k;
    const here = state.arrived === STOP;
    const target = selected ? (here ? 1 : 0.45) : 0;
    const level = engine.reduced ? target : clamp(s.level.step(target, frame.dt), 0, 1.2);
    if (engine.reduced) s.level.value = target;

    material.uniforms.uActive.value = Math.min(1, level);
    material.uniforms.uHover.value = s.hover;
    if (lift.current) lift.current.position.y = level * 0.28;
    if (edgeMat.current) edgeMat.current.opacity = 0.25 + Math.min(1, level) * 0.6;
    tipReveal.value = level;

    // Grow pins (only when something changed — at rest this is free).
    const im = pinsRef.current;
    if (im && Math.abs(level - s.last) > 0.0005) {
      pins.forEach((p, i) => {
        const g = clamp((level - p.delay) / 0.35);
        const e = 1 - Math.pow(1 - g, 3);
        m.makeScale(0.035, Math.max(0.0001, p.h * e), 0.035);
        m.setPosition(p.x, (p.h * e) / 2, p.z);
        im.setMatrixAt(i, m);
      });
      im.instanceMatrix.needsUpdate = true;
      s.last = level;
    }
  });

  return (
    <group position={[f.x, 0.02, f.z]}>
      <group ref={lift}>
        <SpatialObject
          lift={0.06}
          tilt={0.03}
          reach={Math.max(f.w, f.d) / 2}
          onSelect={() => selectSystem(k)}
          onHover={(over) => (st.current.hover = over ? 1 : 0)}
        >
          {/* slab body + outline */}
          <mesh geometry={unitBox} material={mats.dark()} position-y={-SLAB / 2} scale={[f.w, SLAB, f.d]} />
          <lineSegments geometry={edges}>
            <lineBasicMaterial ref={edgeMat} color={accent} transparent opacity={0.3} depthWrite={false} />
          </lineSegments>
          {/* macro surface */}
          <mesh material={material} rotation-x={-Math.PI / 2} position-y={0.001}>
            <planeGeometry args={[f.w, f.d]} />
          </mesh>
          {/* die markings */}
          <Label
            text={sys.code}
            height={0.3}
            rotation-x={-Math.PI / 2}
            position={[-f.w / 2 + 0.24, 0.004, -f.d / 2 + 0.36]}
            align="left"
            weight={600}
            tint={accent.getStyle()}
            opacity={0.95}
          />
          <Label
            text={sys.title}
            height={0.12}
            rotation-x={-Math.PI / 2}
            position={[-f.w / 2 + 0.26, 0.004, -f.d / 2 + 0.64]}
            align="left"
            tint="#8a98a2"
            opacity={0.9}
          />
          <Label
            text={`${String(sys.skills.length).padStart(2, '0')} PINS`}
            height={0.1}
            rotation-x={-Math.PI / 2}
            position={[f.w / 2 - 0.22, 0.004, f.d / 2 - 0.3]}
            align="right"
            tint="#5f6b74"
          />
          {/* one pin per skill, rising when the system is selected */}
          <instancedMesh ref={pinsRef} args={[unitBox, mats.flat(k % 2 ? '#b86a35' : '#3fb8cf'), pins.length]} frustumCulled={false} />
          <Glows points={tips} size={0.34} color={accent} intensity={1.3} delays={tipDelays} reveal={tipReveal} />
        </SpatialObject>
      </group>
    </group>
  );
}

/** Gutter routing: a spine between the rows, with a drop into every block. */
function useRoutes(): TracePath[] {
  return useMemo(() => {
    const spineZ = -0.45;
    const out: TracePath[] = [];
    for (const o of [-0.09, 0.09]) out.push({ pts: [[-5.2, spineZ + o], [5.8, spineZ + o]], width: 0.035, seed: o > 0 ? 0.2 : 0.7 });
    FLOOR.forEach((f, i) => {
      const edgeZ = f.z < spineZ ? f.z + f.d / 2 : f.z - f.d / 2;
      for (const o of [-0.12, 0.12]) out.push({ pts: [[f.x + o, spineZ], [f.x + o, edgeZ]], width: 0.03, seed: (i * 0.17 + (o > 0 ? 0.5 : 0)) % 1 });
    });
    return out;
  }, []);
}

/** Frames the camera on the selected block — a glide across the floorplan, no rotation. */
function FocusCamera() {
  useFrame(() => {
    const near = clamp(1 - Math.abs(engine.stopFloat - STOP));
    const f = FLOOR[app.get().stackActive];
    // Pure translation (camera and target move together): a glide, never a rotation.
    const gx = (f.x - 0.3) * 0.85 * near;
    const gz = (f.z + 0.4) * 0.45 * near;
    cameraBias.target.x += gx;
    cameraBias.target.z += gz;
    cameraBias.pos.x += gx;
    cameraBias.pos.z += gz;
  });
  return null;
}

/** 03 — Technical stack: a die floorplan; each skill system is an IP block with skill pins. */
export function TechnicalStack() {
  const routes = useRoutes();
  return (
    <Station range={[STOP, STOP]} position={ANCHORS.stack}>
      <FocusCamera />
      {skillSystems.map((_, k) => (
        <MacroBlock key={k} k={k} />
      ))}
      <Traces paths={routes} level={0.012} color={new Color('#123842')} pulseColor={C.signal} speed={2.6} pulseLen={0.5} gap={4} />
      <Label
        text="FLOORPLAN — SKILL SYSTEMS"
        height={0.12}
        rotation-x={-Math.PI / 2}
        position={[-5.25, 0.02, 3.05]}
        align="left"
        tint="#5f6b74"
      />
      <Glows points={[[5.8, 0.05, -0.45]]} size={0.5} color={C.signal} intensity={0.8} flicker={0.6} />
    </Station>
  );
}

