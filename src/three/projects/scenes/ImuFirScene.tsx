import { useMemo, useRef } from 'react';
import { Color, type Group } from 'three';
import { useFrame } from '@react-three/fiber';
import type { SceneProps } from '../ProjectScene';
import { useStationRef } from '../../stations/Station';
import { PCBVisualization } from '../../pcb/PCBVisualization';
import { Waveform } from '../../objects/Waveform';
import { Scope } from '../../objects/Scope';
import { Block } from '../../objects/Block';
import { Label } from '../../objects/Label';
import { Traces } from '../../objects/Traces';
import { DataStream } from '../../objects/DataStream';
import { Glows } from '../../objects/Glows';
import { unitBox } from '../../objects/Chip';
import { boxEdges } from '../../geometry/edges';
import { mats } from '../../objects/materials';
import type { TracePath } from '../../geometry/ribbons';
import { shared, C } from '../../shared';

const TAPS = 8;
const TAP_X = (i: number) => -0.75 + i * 0.44;
const ROW_Z = 0.7;
const ROW_Y = 0.45;

/** Windowed-sinc shaped bars — a visual motif, not a design specification. */
const COEFFS = (() => {
  const raw = Array.from({ length: TAPS }, (_, n) => {
    const m = n - (TAPS - 1) / 2;
    const sinc = m === 0 ? 1 : Math.sin(Math.PI * 0.32 * m) / (Math.PI * 0.32 * m);
    const hamming = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (TAPS - 1));
    return sinc * hamming;
  });
  const max = Math.max(...raw.map(Math.abs));
  return raw.map((v) => v / max);
})();

function OrientationGizmo() {
  const g = useRef<Group>(null);
  const cube = useMemo(() => boxEdges([{ pos: [0, 0, 0], size: [0.55, 0.55, 0.55] }]), []);
  useFrame(() => {
    if (!g.current) return;
    const t = shared.uTime.value;
    g.current.rotation.set(0.45 * Math.sin(t * 0.9) + 0.15 * Math.sin(t * 2.1), t * 0.35, 0.35 * Math.sin(t * 0.7 + 1));
  });
  const axes: { dir: [number, number, number]; color: string; rot: [number, number, number] }[] = [
    { dir: [1, 0, 0], color: '#ff8a3d', rot: [0, 0, -Math.PI / 2] },
    { dir: [0, 1, 0], color: '#6ee7ff', rot: [0, 0, 0] },
    { dir: [0, 0, 1], color: '#eef1f3', rot: [Math.PI / 2, 0, 0] },
  ];
  return (
    <group ref={g}>
      <lineSegments geometry={cube} material={mats.edge('#6ee7ff', 0.5)} />
      {axes.map((a) => (
        <group key={a.color} rotation={a.rot}>
          <mesh position-y={0.36} material={mats.flat(a.color)}>
            <cylinderGeometry args={[0.012, 0.012, 0.72, 6]} />
          </mesh>
          <mesh position-y={0.76} material={mats.flat(a.color)}>
            <coneGeometry args={[0.045, 0.12, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** PRJ.03 — IMU / sensor logger + FIR: motion → samples over SPI/I²C → tap-delay FIR → filtered output. */
export function ImuFirScene({ density }: SceneProps) {
  const station = useStationRef();
  const sampler = useRef<Group>(null);
  const line = useMemo<TracePath[]>(() => {
    const out: TracePath[] = [{ pts: [[TAP_X(0) - 0.35, 0.16], [TAP_X(TAPS - 1) + 0.55, 0.16]], width: 0.03, seed: 0.2 }];
    for (let i = 0; i < TAPS; i++) out.push({ pts: [[TAP_X(i), ROW_Y - 0.19], [TAP_X(i), 0.16]], width: 0.025, seed: i / TAPS });
    out.push({ pts: [[TAP_X(0) - 0.35, ROW_Y], [TAP_X(TAPS - 1) + 0.55, ROW_Y]], width: 0.03, seed: 0.6 });
    return out;
  }, []);

  useFrame(() => {
    if (!station.current?.visible || !sampler.current) return;
    const f = (shared.uTime.value * 0.55) % 1;
    sampler.current.position.x = TAP_X(0) + f * (TAP_X(TAPS - 1) - TAP_X(0));
  });

  return (
    <group>
      <group position={[-2.75, 0.22, ROW_Z]}>
        <PCBVisualization
          size={[2.3, 1.9]}
          seed={303}
          density={density}
          boardColor="#08100d"
          chips={[{ x: 0, z: 0, w: 0.9, d: 0.9, kind: 'qfn', pins: 4, label: 'IMU', labelHeight: 0.18 }]}
          options={{ bundlesPerSide: [1, 1], tracesPerBundle: [2, 3], maxLen: 0.8, freeBundles: 2, smdCount: 6 }}
        />
      </group>
      <group position={[-2.75, 1.5, ROW_Z]}>
        <OrientationGizmo />
      </group>

      <DataStream from={[-2.2, 0.5, ROW_Z]} to={[-1.15, 0.5, ROW_Z]} count={16} speed={0.42} size={0.05} />
      <Label text="SPI / I²C" height={0.11} position={[-1.68, 0.78, ROW_Z]} tint="#9fb3bf" />

      {/* Tap-delay line */}
      <group position-z={ROW_Z}>
        <Traces paths={line} plane="xy" level={0} color={new Color('#123842')} pulseColor={C.signal} speed={2.2} pulseLen={0.4} gap={2} />
      </group>
      {COEFFS.map((c, i) => {
        const h = Math.max(0.05, Math.abs(c) * 0.85);
        return (
          <group key={i} position={[TAP_X(i), 0, ROW_Z]}>
            <Block size={[0.34, 0.34, 0.34]} label="z⁻¹" labelHeight={0.11} position-y={ROW_Y} color="#6ee7ff" fill={0.08} />
            <mesh geometry={unitBox} material={mats.flat(c >= 0 ? '#ff8a3d' : '#7a3a14')} position-y={0.74 + h / 2} scale={[0.07, h, 0.07]} />
          </group>
        );
      })}
      <Block size={[0.42, 0.42, 0.42]} label="Σ" labelHeight={0.2} position={[TAP_X(TAPS - 1) + 0.62, ROW_Y, ROW_Z]} color="#ff8a3d" />
      <group ref={sampler} position={[TAP_X(0), ROW_Y + 0.27, ROW_Z + 0.2]}>
        <Glows points={[[0, 0, 0]]} size={0.5} color={C.signal} intensity={1.4} />
      </group>
      <Label text="FIR · TAP-DELAY LINE" height={0.1} rotation-x={-Math.PI / 2} position={[TAP_X(0) - 0.3, 0.01, ROW_Z + 0.55]} align="left" tint="#7f8f99" />

      {/* Raw vs filtered */}
      <Scope size={[2.3, 1.5]} div={[8, 6]} label="RAW · XYZ" position={[-1.7, 2.35, -0.85]}>
        <Waveform type="noisy" width={2.25} amp={0.15} freq={2.2} speed={0.3} thick={0.035} color={C.signal} seed={1} position-y={0.42} />
        <Waveform type="noisy" width={2.25} amp={0.15} freq={2.2} speed={0.3} thick={0.035} color={C.copper} seed={2} phase={0.7} />
        <Waveform type="noisy" width={2.25} amp={0.15} freq={2.2} speed={0.3} thick={0.035} color={C.ink} seed={3} phase={1.4} position-y={-0.42} opacity={0.7} />
      </Scope>
      <Scope size={[2.5, 1.5]} div={[8, 6]} label="FIR OUT" sublabel="FILTERED" position={[1.35, 2.35, -0.85]}>
        <Waveform type="noisy" width={2.45} amp={0.42} freq={1.6} speed={0.3} thick={0.03} color={C.signal} seed={1} opacity={0.22} glow={0} />
        <Waveform type="filtered" width={2.45} amp={0.42} freq={1.6} speed={0.3} thick={0.05} color={C.signal} seed={1} />
      </Scope>
    </group>
  );
}
