import { useMemo, useRef } from 'react';
import { Color, RingGeometry, type ShaderMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import { Station, useStationRef } from './Station';
import { ANCHORS, FLOW_LANE_Z, stopRangeOf } from '../../core/timeline';
import { flowTracks } from '../../content/flow';
import { engine } from '../../core/scroll';
import { app } from '../../core/store';
import { frame } from '../../core/ticker';
import { clamp, damp } from '../../core/math';
import { Board } from '../objects/Board';
import { Chip } from '../objects/Chip';
import { Glows } from '../objects/Glows';
import { Traces } from '../objects/Traces';
import { offsetPolyline, type TracePath, type V2 } from '../geometry/ribbons';
import { mats } from '../objects/materials';
import { C } from '../shared';
import { useProjectedAnchors } from '../useProjectedAnchors';

export const FLOW_X0 = -6.2;
export const FLOW_X1 = 3.9;
const CHIP_X = 6.6;
const pad = new RingGeometry(0.6, 1, 20).rotateX(-Math.PI / 2);

function Lane({ k, first }: { k: number; first: number }) {
  const station = useStationRef();
  const track = flowTracks[k];
  const z = FLOW_LANE_Z[k];
  const trace = useRef<ShaderMaterial>(null);
  const glow = useRef<ShaderMaterial>(null);
  const reveal = useMemo(() => ({ value: 1 }), []);
  const st = useRef({ active: false, level: 0 });

  const paths = useMemo<TracePath[]>(() => {
    const zEnd = z * 0.16;
    const center: V2[] = [
      [FLOW_X0 - 5, z],
      [FLOW_X1, z],
      [FLOW_X1 + Math.abs(zEnd - z), zEnd],
      [CHIP_X - 1.15, zEnd],
    ];
    return [-0.13, 0, 0.13].map((o, i) => ({ pts: offsetPolyline(center, o), width: 0.045, seed: (i * 0.31 + k * 0.17) % 1 }));
  }, [k, z]);

  const nodes = useMemo(() => {
    const n = track.steps.length;
    return track.steps.map((_, i) => [FLOW_X0 + (i * (FLOW_X1 - FLOW_X0)) / (n - 1), 0.08, z] as [number, number, number]);
  }, [track.steps, z]);
  const delays = useMemo(() => nodes.map((_, i) => i / nodes.length), [nodes]);

  useFrame(() => {
    if (!station.current?.visible) return;
    const s = st.current;
    const active = app.get().arrived === first + k;
    if (active && !s.active) reveal.value = 0;
    s.active = active;
    s.level = damp(s.level, active ? 1 : 0, 5, frame.dt);
    reveal.value = engine.reduced ? 1.2 : active ? Math.min(1.2, reveal.value + frame.dt * 0.55) : 1.2;
    const near = clamp(1 - Math.abs(engine.stopFloat - (first + k)));
    const lvl = Math.max(s.level, near * 0.6);
    if (trace.current) {
      trace.current.uniforms.uPulse.value = 0.5 + lvl * 2.4;
      trace.current.uniforms.uBase.value = 0.3 + lvl * 0.6;
    }
    if (glow.current) glow.current.uniforms.uIntensity.value = 0.12 + lvl * 1.1;
  });

  const color = k % 2 ? C.copper : C.signal;
  return (
    <group>
      <Traces paths={paths} materialRef={trace} color={new Color(k % 2 ? '#3a1c0a' : '#123842')} pulseColor={color} speed={4.5} pulseLen={0.9} gap={6} />
      {nodes.map((p, i) => (
        <mesh key={i} geometry={pad} position={p} scale={0.16} material={mats.flat(k % 2 ? '#7a3a14' : '#1f5866')} />
      ))}
      <Glows points={nodes} size={0.6} color={color} delays={delays} reveal={reveal} materialRef={glow} />
    </group>
  );
}

/** Projects lane heads and step nodes to screen space for the DOM system-map labels. */
function FlowAnchors() {
  const station = useStationRef();
  const { ids, pts } = useMemo(() => {
    const ids: string[] = [];
    const pts: [number, number, number][] = [];
    flowTracks.forEach((t, k) => {
      const z = FLOW_LANE_Z[k];
      ids.push(`flow-h-${k}`);
      pts.push([FLOW_X0 - 0.7, 0, z]);
      t.steps.forEach((_, i) => {
        ids.push(`flow-${k}-${i}`);
        pts.push([FLOW_X0 + (i * (FLOW_X1 - FLOW_X0)) / (t.steps.length - 1), 0, z]);
      });
    });
    return { ids, pts };
  }, []);
  useProjectedAnchors(ids, pts, station);
  return null;
}

/** 05 — Engineering flow: four development tracks converging into one integrated system. */
export function FlowStation() {
  const [first, last] = stopRangeOf('flow');
  return (
    <Station range={[first, last]} position={ANCHORS.flow}>
      <Board size={[20, 8.6]} color="#030405" gridCell={0.5} edgeOpacity={0.12} position={[0.2, -0.02, 0]} />
      <FlowAnchors />
      {flowTracks.map((_, k) => (
        <Lane key={k} k={k} first={first} />
      ))}
      <Chip size={[2.3, 2.3]} kind="bga" label="SYSTEM" labelHeight={0.32} position={[CHIP_X, 0, 0]} edgeColor="#eef1f3" edgeOpacity={0.5} />
    </Station>
  );
}
