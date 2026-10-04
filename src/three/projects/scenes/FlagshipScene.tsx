import { useMemo, useRef, type RefObject } from 'react';
import { Color, type Group } from 'three';
import { useFrame } from '@react-three/fiber';
import type { SceneProps } from '../ProjectScene';
import { useStationRef } from '../../stations/Station';
import { PCBVisualization } from '../../pcb/PCBVisualization';
import { Block } from '../../objects/Block';
import { Chip, unitBox } from '../../objects/Chip';
import { Label } from '../../objects/Label';
import { CellGrid } from '../../objects/CellGrid';
import { Scope } from '../../objects/Scope';
import { Waveform } from '../../objects/Waveform';
import { Traces } from '../../objects/Traces';
import { mats } from '../../objects/materials';
import type { TracePath } from '../../geometry/ribbons';
import { shared, C } from '../../shared';
import { lerp, mulberry32 } from '../../../core/math';

const W = 4.4;
const D = 2.8;
const BASE_Y = 0.32;
const LAYERS = ['PCB', 'FIRMWARE', 'RTL / LINUX', 'VERIFICATION', 'MEASURED RESULTS'];

function CodeLines() {
  const lines = useMemo(() => {
    const rng = mulberry32(8);
    return Array.from({ length: 9 }, (_, i) => ({ indent: Math.floor(rng() * 3) * 0.18, len: 0.6 + rng() * 1.3, z: -0.95 + i * 0.24 }));
  }, []);
  return (
    <group position={[0.1, 0.02, 0]}>
      {lines.map((l, i) => (
        <mesh key={i} geometry={unitBox} material={mats.flat(i % 4 === 0 ? '#6ee7ff' : '#2b4651')} position={[l.indent + l.len / 2, 0.01, l.z]} scale={[l.len, 0.02, 0.07]} />
      ))}
    </group>
  );
}

/** PRJ.08 — Integrated flagship: an exploded system architecture spanning every domain. */
export function FlagshipScene({ act, density }: SceneProps) {
  const station = useStationRef();
  const layers = useRef<(Group | null)[]>([]);
  const risers = useRef<Group>(null);
  const riserPaths = useMemo<TracePath[]>(
    () =>
      [-2.05, -1.9, 1.9, 2.05].map((x, i) => ({
        pts: [
          [x, 0],
          [x, 1],
        ],
        width: 0.03,
        seed: i / 4,
      })),
    [],
  );

  useFrame(() => {
    if (!station.current?.visible) return;
    const t = shared.uTime.value;
    const spacing = lerp(0.4, 0.7, act.current.level) + Math.sin(t * 0.6) * 0.03;
    layers.current.forEach((g, k) => {
      if (g) g.position.y = BASE_Y + k * spacing;
    });
    if (risers.current) risers.current.scale.y = Math.max(0.01, spacing * (LAYERS.length - 1));
  });

  const setLayer = (k: number) => (g: Group | null) => {
    layers.current[k] = g;
  };

  return (
    <group position={[0.3, 0, 0.1]}>
      {/* L0 — PCB */}
      <group ref={setLayer(0)}>
        <PCBVisualization
          size={[W, D]}
          seed={808}
          density={density * 0.8}
          boardColor="#08100d"
          chips={[
            { x: -1.2, z: 0, w: 0.8, d: 0.8, kind: 'qfp', pins: 6 },
            { x: 0.9, z: 0.2, w: 0.9, d: 0.9, kind: 'bga' },
          ]}
          options={{ bundlesPerSide: [1, 1], tracesPerBundle: [2, 4], maxLen: 1.2, freeBundles: 4, smdCount: 10 }}
        />
      </group>
      {/* L1 — Firmware */}
      <group ref={setLayer(1)}>
        <Block size={[W, 0.03, D]} color="#6ee7ff" fill={0.03} edge={0.45} />
        <Chip size={[0.9, 0.9]} kind="qfp" pins={7} label="MCU" labelHeight={0.14} position={[-1.45, 0.02, 0]} />
        <CodeLines />
      </group>
      {/* L2 — RTL / Linux */}
      <group ref={setLayer(2)}>
        <Block size={[W, 0.03, D]} color="#6ee7ff" fill={0.03} edge={0.45} />
        <Chip size={[1.0, 1.0]} kind="bga" label="FPGA" labelHeight={0.14} position={[-1.45, 0.02, 0]} />
        <CellGrid dims={[12, 7]} pitch={0.15} mode="fabric" position={[0.7, 0.03, 0]} seed={9} />
      </group>
      {/* L3 — Verification */}
      <group ref={setLayer(3)}>
        <Block size={[W, 0.03, D]} color="#eef1f3" fill={0.03} edge={0.4} />
        <CellGrid dims={[14, 7]} pitch={0.15} mode="memory" position={[0.2, 0.03, 0]} seed={4} color={C.signal} />
      </group>
      {/* L4 — Measured results (pending) */}
      <group ref={setLayer(4)}>
        <Block size={[W, 0.03, D]} color="#ff8a3d" fill={0.03} edge={0.45} />
        <group position={[0.2, 0.55, -0.6]}>
          <Scope size={[1.9, 0.95]} div={[8, 4]} label="RESULTS" sublabel="PENDING">
            <Waveform type="sine" width={1.85} amp={0.0} freq={2} speed={0.4} thick={0.025} color={C.copper} opacity={0.5} glow={0} />
          </Scope>
        </group>
      </group>

      {/* Layer labels */}
      {LAYERS.map((name, k) => (
        <LayerLabel key={name} k={k} name={name} layers={layers} />
      ))}

      {/* Vertical interconnect */}
      <group ref={risers} position={[0, BASE_Y, D / 2 - 0.1]}>
        <Traces paths={riserPaths} plane="xy" level={0} color={new Color('#123842')} pulseColor={C.signal} speed={0.9} pulseLen={0.12} gap={0.6} />
      </group>
    </group>
  );
}

function LayerLabel({ k, name, layers }: { k: number; name: string; layers: RefObject<(Group | null)[]> }) {
  const g = useRef<Group>(null);
  useFrame(() => {
    const layer = layers.current[k];
    if (g.current && layer) g.current.position.y = layer.position.y + 0.1;
  });
  return (
    <group ref={g} position={[-W / 2 - 0.15, 0, D / 2]}>
      <Label text={name} height={0.12} align="right" tint={k === 4 ? '#ff8a3d' : '#9fb3bf'} />
      <mesh geometry={unitBox} material={mats.flat('#3d4c55')} position={[0.08, -0.1, 0]} scale={[0.16, 0.006, 0.006]} />
    </group>
  );
}
