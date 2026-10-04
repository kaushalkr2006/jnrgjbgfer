import { useMemo, useRef, type RefObject } from 'react';
import { Color, type Group, type ShaderMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import { Station, useStationRef } from './Station';
import { ANCHORS, stopRangeOf } from '../../core/timeline';
import { skillSystems } from '../../content/stack';
import { engine } from '../../core/scroll';
import { app } from '../../core/store';
import { frame } from '../../core/ticker';
import { clamp, damp, easeInOutCubic } from '../../core/math';
import { Board } from '../objects/Board';
import { Chip } from '../objects/Chip';
import { Glows } from '../objects/Glows';
import { Traces } from '../objects/Traces';
import { SpatialObject } from '../objects/SpatialObject';
import type { TracePath } from '../geometry/ribbons';
import { rectLines } from '../geometry/edges';
import { mats } from '../objects/materials';
import { C } from '../shared';

const R = 4.7;
const STEP = (Math.PI * 2) / skillSystems.length;

/** N points evenly distributed around a square perimeter (the chiplet's "pins"). */
function perimeter(n: number, half: number): [number, number, number][] {
  const total = half * 8;
  return Array.from({ length: n }, (_, i) => {
    const d = ((i + 0.5) / n) * total;
    const side = Math.floor(d / (half * 2));
    const t = d - side * half * 2 - half;
    const y = 0.32;
    if (side === 0) return [t, y, half];
    if (side === 1) return [half, y, -t];
    if (side === 2) return [-t, y, -half];
    return [-half, y, t];
  });
}

/** Interposer route from the core die to chiplet k, in the chiplet's local frame (+Z = outward). */
function routeFor(k: number): TracePath[] {
  return [-0.36, -0.12, 0.12, 0.36].map((o, i) => ({
    pts: [
      [o, 1.85 - R],
      [o, -1.45],
    ],
    width: 0.05,
    seed: (i * 0.23 + k * 0.17) % 1,
  }));
}

function Chiplet({ k, first }: { k: number; first: number }) {
  const sys = skillSystems[k];
  const lift = useRef<Group>(null);
  const traceMat = useRef<ShaderMaterial>(null);
  const pinMat = useRef<ShaderMaterial>(null);
  const station = useStationRef();
  const reveal = useMemo(() => ({ value: 0 }), []);
  const pins = useMemo(() => perimeter(sys.skills.length, 1.22), [sys.skills.length]);
  const delays = useMemo(() => pins.map((_, i) => i / pins.length), [pins]);
  const paths = useMemo(() => routeFor(k), [k]);
  const angle = k * STEP;

  useFrame(() => {
    if (!station.current?.visible) return;
    const sub = engine.stopFloat - first;
    const near = easeInOutCubic(clamp(1 - Math.abs(sub - k)));
    if (lift.current) lift.current.position.y = near * 0.55;
    const active = app.get().arrived === first + k;
    reveal.value = engine.reduced ? (active ? 1 : 0) : damp(reveal.value, active ? 1.15 : 0, active ? 2.4 : 6, frame.dt);
    if (traceMat.current) {
      traceMat.current.uniforms.uPulse.value = 0.4 + near * 2.2;
      traceMat.current.uniforms.uBase.value = 0.35 + near * 0.5;
    }
  });

  return (
    <group position={[Math.sin(angle) * R, 0, Math.cos(angle) * R]} rotation-y={angle}>
      <group ref={lift}>
        <SpatialObject lift={0.18} tilt={0.14} reach={1.4} onSelect={() => engine.toStop(first + k)}>
          <Chip
            size={[2.3, 2.3]}
            height={0.26}
            kind="qfn"
            pins={6}
            label={sys.code}
            labelHeight={0.42}
            edgeColor={k % 2 ? '#ff8a3d' : '#6ee7ff'}
            edgeOpacity={0.5}
          />
          <Glows points={pins} size={0.3} color={k % 2 ? C.copper : C.signal} intensity={1.05} delays={delays} reveal={reveal} materialRef={pinMat} />
        </SpatialObject>
      </group>
      <Traces
        paths={paths}
        materialRef={traceMat}
        color={new Color('#123842')}
        pulseColor={k % 2 ? C.copper : C.signal}
        speed={3}
        pulseLen={0.5}
        gap={3}
      />
    </group>
  );
}

/** 03 — Technical stack: six chiplets on an interposer, one per skill system. */
export function TechnicalStack() {
  const [first, last] = stopRangeOf('stack');
  const ring = useRef<Group>(null);
  const frameLines = useMemo(() => rectLines(16.5, 16.5, 0.01, 0.9), []);

  return (
    <Station range={[first, last]} position={ANCHORS.stack}>
      <StackRing ring={ring} first={first} />
      <group ref={ring}>
        <Board size={[13.5, 13.5]} color="#06080a" gridCell={0.34} edgeOpacity={0.3} />
        <Chip size={[3.1, 3.1]} kind="bga" height={0.32} label="ESE" labelHeight={0.5} edgeColor="#eef1f3" edgeOpacity={0.4} />
        {skillSystems.map((_, k) => (
          <Chiplet key={k} k={k} first={first} />
        ))}
      </group>
      <lineSegments geometry={frameLines} material={mats.edge('#eef1f3', 0.22)} />
    </Station>
  );
}

function StackRing({ ring, first }: { ring: RefObject<Group | null>; first: number }) {
  useFrame(() => {
    if (!ring.current) return;
    const sub = clamp(engine.stopFloat - first, 0, skillSystems.length - 1);
    ring.current.rotation.y = -sub * STEP;
  });
  return null;
}
