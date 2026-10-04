import { useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { Euler, Quaternion, Vector3, type Group, type ShaderMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import { Station, useStationRef } from './Station';
import { ANCHORS, firstStopOf } from '../../core/timeline';
import { engine } from '../../core/scroll';
import { clamp, easeOutCubic, smoothstep } from '../../core/math';
import { PCBVisualization, type ChipSpec } from '../pcb/PCBVisualization';
import { Chip } from '../objects/Chip';
import { Block } from '../objects/Block';
import { Scope } from '../objects/Scope';
import { Waveform } from '../objects/Waveform';
import { DataStream } from '../objects/DataStream';
import { Glows } from '../objects/Glows';
import { CellGrid } from '../objects/CellGrid';
import { C } from '../shared';

const STOP = firstStopOf('system');

/**
 * Assembly (exploded → integrated) and power-on progress. Both run during the flight into
 * the final stop, so the system is complete the moment the camera lands.
 */
function progress() {
  const a = engine.arrivalOf(STOP);
  if (engine.reduced) return { p: a >= 1 ? 1 : 0, q: a >= 1 ? 1 : 0 };
  return { p: smoothstep(0.1, 0.92, a), q: smoothstep(0.78, 1, a) };
}

const qa = new Quaternion();
const qb = new Quaternion();

function Assemble({
  from,
  to,
  rot = [0, 0, 0],
  toRot = [0, 0, 0],
  delay = 0,
  children,
}: {
  from: [number, number, number];
  to: [number, number, number];
  rot?: [number, number, number];
  toRot?: [number, number, number];
  delay?: number;
  children: ReactNode;
}) {
  const g = useRef<Group>(null);
  const station = useStationRef();
  const data = useMemo(
    () => ({
      a: new Vector3(...from),
      b: new Vector3(...to),
      ra: new Quaternion().setFromEuler(new Euler(...rot)),
      rb: new Quaternion().setFromEuler(new Euler(...toRot)),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useFrame(() => {
    if (!station.current?.visible || !g.current) return;
    const { p } = progress();
    const e = easeOutCubic(clamp((p - delay * 0.45) / 0.55));
    g.current.position.lerpVectors(data.a, data.b, e);
    qa.copy(data.ra);
    qb.copy(data.rb);
    g.current.quaternion.slerpQuaternions(qa, qb, e);
    g.current.scale.setScalar(0.8 + 0.2 * e);
  });
  return <group ref={g}>{children}</group>;
}

const ROUTE_CHIPS: ChipSpec[] = [
  { x: -2.4, z: 0.7, w: 1.5, d: 1.5 },
  { x: 1.4, z: -0.4, w: 2.0, d: 2.0 },
  { x: -3.1, z: -1.5, w: 0.8, d: 0.8 },
  { x: -0.7, z: 1.6, w: 1.0, d: 0.6 },
];

/** 08 — Final scene: every domain converges into one coherent electronic system. */
export function FinalStation({ density }: { density: number }) {
  const reveal = useMemo(() => ({ value: 0 }), []);
  const streamA = useRef<ShaderMaterial>(null);
  const streamB = useRef<ShaderMaterial>(null);
  const glow = useRef<ShaderMaterial>(null);

  return (
    <Station range={[STOP, STOP]} position={ANCHORS.system}>
      <PowerOn reveal={reveal} streams={[streamA, streamB]} glow={glow} />
      <Assemble from={[0, 0.5, 1.2]} to={[0, 0, 0]} rot={[0.3, 0.32, 0.06]}>
        <PCBVisualization
          size={[8.4, 5.2]}
          seed={909}
          density={density}
          chips={ROUTE_CHIPS}
          hideChips
          reveal={reveal}
          stagger={3}
          options={{ bundlesPerSide: [1, 2], tracesPerBundle: [3, 6], maxLen: 2.6, freeBundles: 14, smdCount: 36, powerTraces: 3 }}
        />
      </Assemble>
      <Assemble from={[-4.6, 2.3, 2.2]} to={[-2.4, 0, 0.7]} rot={[1.0, 0.4, -0.7]} delay={0.15}>
        <Chip size={[1.5, 1.5]} kind="qfp" pins={10} label="STM32" labelHeight={0.2} />
      </Assemble>
      <Assemble from={[4.4, 3.0, -1.4]} to={[1.4, 0, -0.4]} rot={[-0.8, 1.0, 0.5]} delay={0.25}>
        <Chip size={[2.0, 2.0]} kind="bga" label="FPGA" labelHeight={0.28} />
      </Assemble>
      <Assemble from={[-4.6, 1.2, -3.0]} to={[-3.1, 0, -1.5]} rot={[0.6, -1.2, 0.9]} delay={0.35}>
        <Chip size={[0.8, 0.8]} kind="qfn" pins={4} label="IMU" labelHeight={0.14} />
      </Assemble>
      <Assemble from={[2.2, 3.4, 3.0]} to={[-0.7, 0, 1.6]} rot={[-1.1, 0.3, 0.8]} delay={0.45}>
        <Chip size={[1.0, 0.6]} kind="soic" pins={4} label="FW" labelHeight={0.14} />
      </Assemble>
      <Assemble from={[0.6, 4.1, -1.8]} to={[1.4, 1.25, -0.4]} rot={[0.4, 1.6, 0]} delay={0.55}>
        <Block size={[0.7, 0.32, 0.5]} label="RTL" labelHeight={0.1} position={[-0.45, 0, 0]} />
        <Block size={[0.7, 0.32, 0.5]} label="CTRL" labelHeight={0.1} position={[0.45, 0, 0]} color="#ff8a3d" />
        <CellGrid dims={[10, 10]} pitch={0.15} mode="fabric" position={[0, -0.55, 0]} />
      </Assemble>
      <Assemble from={[4.6, 3.8, -0.6]} to={[2.9, 2.75, -2.7]} rot={[0, 1.1, 0.25]} toRot={[0, -0.25, 0]} delay={0.4}>
        <Scope size={[2.4, 1.4]} div={[10, 6]} label="MEASURE" sublabel="CH1 · CH2">
          <Waveform type="filtered" width={2.35} amp={0.3} freq={2} speed={0.3} thick={0.04} color={C.signal} position-y={0.25} />
          <Waveform type="uart" width={2.35} amp={0.12} freq={30} speed={2} thick={0.035} color={C.copper} position-y={-0.35} segments={420} />
        </Scope>
      </Assemble>
      {/* Data paths: sensor → MCU, firmware → MCU, MCU ↔ FPGA */}
      <DataStream from={[-3.1, 0.25, -1.5]} to={[-2.5, 0.35, 0.4]} count={12} speed={0.4} size={0.05} materialRef={streamA} />
      <DataStream from={[-0.7, 0.25, 1.6]} to={[-1.8, 0.35, 0.9]} count={12} speed={0.35} size={0.05} materialRef={streamB} color={C.copper} />
      <Glows
        points={[
          [-2.4, 0.45, 0.7],
          [1.4, 0.45, -0.4],
          [-3.1, 0.3, -1.5],
          [-0.7, 0.3, 1.6],
        ]}
        size={[1.6, 2.2, 0.9, 1]}
        color={C.signal}
        intensity={0}
        materialRef={glow}
      />
    </Station>
  );
}

function PowerOn({
  reveal,
  streams,
  glow,
}: {
  reveal: { value: number };
  streams: RefObject<ShaderMaterial | null>[];
  glow: RefObject<ShaderMaterial | null>;
}) {
  const station = useStationRef();
  useFrame(() => {
    if (!station.current?.visible) return;
    const { q } = progress();
    reveal.value = q * 18;
    for (const s of streams) if (s.current) s.current.uniforms.uLevel.value = q;
    if (glow.current) glow.current.uniforms.uIntensity.value = q * 0.9;
  });
  return null;
}
