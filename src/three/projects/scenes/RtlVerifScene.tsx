import { createRef, useMemo, useRef, type RefObject } from 'react';
import { Color, type ShaderMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import type { SceneProps } from '../ProjectScene';
import { useStationRef } from '../../stations/Station';
import { Block, type BlockHandles } from '../../objects/Block';
import { Label } from '../../objects/Label';
import { Scope } from '../../objects/Scope';
import { Waveform } from '../../objects/Waveform';
import { Traces } from '../../objects/Traces';
import { Glows } from '../../objects/Glows';
import { CellGrid } from '../../objects/CellGrid';
import { boxEdges, rectLines } from '../../geometry/edges';
import { mats } from '../../objects/materials';
import type { TracePath } from '../../geometry/ribbons';
import { shared, C } from '../../shared';
import { clamp, smoothstep } from '../../../core/math';

const Z = 0.4;
const BUS_Y = 0.95;
const UNITS = [
  { x: -1.45, label: 'MANAGER' },
  { x: 0.05, label: 'SUB 0' },
  { x: 1.55, label: 'SUB 1' },
];

/** PRJ.07 — RTL subsystem + verification: AMBA-style architecture inside a verification loop. */
export function RtlVerifScene({ act }: SceneProps) {
  const station = useStationRef();
  const handles = useMemo(() => UNITS.map(() => createRef<BlockHandles>()) as RefObject<BlockHandles | null>[], []);
  const gates = useMemo(() => UNITS.map(() => createRef<ShaderMaterial>()) as RefObject<ShaderMaterial | null>[], []);
  const coverage = useRef<ShaderMaterial>(null);
  const dut = useMemo(() => rectLines(4.9, 1.75, 0, 0.3), []);
  const covFrame = useMemo(() => boxEdges([{ pos: [0, 0, 0], size: [1.85, 1.13, 0.04] }]), []);

  const flow = useMemo<TracePath[]>(() => {
    const out: TracePath[] = [
      { pts: [[-2.95, 1.3], [-2.5, 1.3]], width: 0.04, seed: 0.1 },
      { pts: [[2.5, 1.3], [2.95, 1.3]], width: 0.04, seed: 0.4 },
      { pts: [[3.4, 1.0], [3.4, 0.35], [-3.4, 0.35], [-3.4, 1.0]], width: 0.04, seed: 0.7 },
    ];
    UNITS.forEach((u, i) => out.push({ pts: [[u.x, 1.35], [u.x, BUS_Y + 0.05]], width: 0.035, seed: 0.2 + i * 0.25 }));
    return out;
  }, []);

  useFrame(() => {
    if (!station.current?.visible) return;
    const t = shared.uTime.value;
    // RTL ⇄ synthesised view cycle.
    const p = (t / 7) % 1;
    const synth = smoothstep(0.45, 0.55, p) * (1 - smoothstep(0.92, 1, p));
    handles.forEach((h) => {
      if (!h.current) return;
      h.current.fill.opacity = 0.07 * (1 - synth) + 0.015;
      h.current.edge.opacity = 0.8 - synth * 0.55;
    });
    gates.forEach((g) => {
      if (g.current) g.current.uniforms.uLevel.value = 0.15 + synth * 0.85;
    });
    if (coverage.current) coverage.current.uniforms.uFill.value = clamp((act.current.t - 0.3) / 4);
  });

  return (
    <group position-x={-0.45}>
      {/* Architecture */}
      <Block size={[4.3, 0.1, 0.36]} color="#ff8a3d" fill={0.25} edge={0.9} position={[0, BUS_Y, Z]} />
      <Label text="AMBA" height={0.11} align="left" position={[-2.15, BUS_Y - 0.2, Z + 0.2]} tint="#ff8a3d" />
      {UNITS.map((u, i) => (
        <group key={u.label}>
          <Block size={[1.05, 0.6, 0.6]} label={u.label} labelHeight={0.11} position={[u.x, 1.65, Z]} handlesRef={handles[i]} />
          <CellGrid
            dims={[7, 4]}
            pitch={0.13}
            mode="fabric"
            seed={i + 2}
            position={[u.x, 0.03, Z + 0.1]}
            materialRef={gates[i]}
          />
        </group>
      ))}
      <lineSegments geometry={dut} position={[0, 1.32, Z]} rotation-x={Math.PI / 2} material={mats.edge('#eef1f3', 0.45)} />
      <Label text="DUT · RTL SUBSYSTEM" height={0.1} align="left" position={[-2.45, 2.32, Z]} tint="#9fb3bf" />

      {/* Verification flow */}
      <Block size={[0.9, 0.5, 0.5]} label="STIM" color="#eef1f3" labelHeight={0.12} position={[-3.4, 1.3, Z]} />
      <Block size={[0.9, 0.5, 0.5]} label="CHECK" color="#ff8a3d" labelHeight={0.12} position={[3.4, 1.3, Z]} />
      <group position-z={Z}>
        <Traces paths={flow} plane="xy" level={0} color={new Color('#123842')} pulseColor={C.signal} speed={2.6} pulseLen={0.5} gap={2.5} />
      </group>

      {/* Waveforms + assertion events */}
      <Scope size={[3.1, 1.3]} div={[12, 4]} label="WAVES" sublabel="ASSERTIONS" position={[-1.35, 3.05, -0.9]}>
        <Waveform type="clock" width={2.95} amp={0.08} freq={24} speed={0.9} thick={0.028} color={C.ink} position-y={0.36} segments={420} glow={0.4} />
        <Waveform type="digital" width={2.95} amp={0.1} freq={10} speed={0.5} thick={0.03} color={C.signal} position-y={0.02} segments={360} seed={6} />
        <Waveform type="strobe" width={2.95} amp={0.1} freq={10} speed={0.5} thick={0.03} color={C.copper} position-y={-0.36} segments={360} seed={6} />
        <Glows
          points={[
            [-1.1, 0.55, 0.01],
            [-0.35, 0.55, 0.01],
            [0.45, 0.55, 0.01],
            [1.15, 0.55, 0.01],
          ]}
          size={0.26}
          color={new Color('#9dff8a')}
          intensity={1.2}
          flicker={0.85}
        />
      </Scope>

      {/* Coverage bins */}
      <group position={[1.95, 3.05, -0.9]}>
        <CellGrid dims={[10, 6]} pitch={0.17} mode="coverage" rotation-x={Math.PI / 2} materialRef={coverage} color={C.signal} color2={C.copper} />
        <lineSegments geometry={covFrame} material={mats.edge('#6ee7ff', 0.3)} />
        <Label text="COVERAGE" height={0.13} align="left" position={[-0.92, 0.72, 0]} tint="#9fb3bf" />
      </group>
      <Label text="RTL — SYNTHESIS" height={0.09} rotation-x={-Math.PI / 2} position={[-2.1, 0.02, Z + 0.75]} align="left" tint="#7f8f99" />
    </group>
  );
}
