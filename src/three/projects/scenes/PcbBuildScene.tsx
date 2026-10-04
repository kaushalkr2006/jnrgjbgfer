import { useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, type Group, type LineBasicMaterial, type ShaderMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import type { SceneProps } from '../ProjectScene';
import { useStationRef } from '../../stations/Station';
import { PCBVisualization, type ChipSpec } from '../../pcb/PCBVisualization';
import { Chip } from '../../objects/Chip';
import { Label } from '../../objects/Label';
import { Scope } from '../../objects/Scope';
import { Waveform } from '../../objects/Waveform';
import { Glows } from '../../objects/Glows';
import { unitBox } from '../../objects/Chip';
import { rectLines } from '../../geometry/edges';
import { mats } from '../../objects/materials';
import { C } from '../../shared';
import { clamp, easeInOutCubic, easeOutCubic, lerp, smoothstep } from '../../../core/math';

const BOARD = { x: 0, y: 0.22, z: 0.35 };
const SHEET_Z = -0.75;

interface Part {
  chip?: ChipSpec;
  passive?: { w: number; d: number };
  pcb: [number, number];
  sch: [number, number];
}

const PARTS: Part[] = [
  { chip: { x: -0.9, z: 0.1, w: 1.3, d: 1.3, kind: 'qfp', pins: 8, label: 'MCU' }, pcb: [-0.9, 0.1], sch: [-0.9, 2.3] },
  { chip: { x: 1.4, z: -0.7, w: 0.8, d: 0.8, kind: 'qfn', pins: 4, label: 'SNS' }, pcb: [1.4, -0.7], sch: [1.4, 2.75] },
  { chip: { x: -2.4, z: -0.9, w: 0.9, d: 0.6, kind: 'soic', pins: 3, label: 'PWR' }, pcb: [-2.4, -0.9], sch: [-2.7, 1.65] },
  { chip: { x: 2.5, z: 0.95, w: 1.0, d: 0.42, kind: 'soic', pins: 4, label: 'J1' }, pcb: [2.5, 0.95], sch: [2.65, 1.7] },
  { passive: { w: 0.34, d: 0.16 }, pcb: [-1.95, 0.6], sch: [-2.0, 2.85] },
  { passive: { w: 0.34, d: 0.16 }, pcb: [0.35, 0.95], sch: [0.2, 3.0] },
  { passive: { w: 0.34, d: 0.16 }, pcb: [0.4, -0.75], sch: [0.25, 2.2] },
  { passive: { w: 0.16, d: 0.34 }, pcb: [1.65, 0.45], sch: [1.6, 1.75] },
  { passive: { w: 0.34, d: 0.16 }, pcb: [-2.6, 0.05], sch: [-2.65, 2.35] },
  { passive: { w: 0.16, d: 0.34 }, pcb: [-0.2, -1.2], sch: [-0.6, 1.55] },
];

const NETS: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [2, 1],
  [4, 0],
  [5, 0],
  [6, 1],
  [7, 3],
  [8, 2],
  [9, 0],
];

function schematicWires() {
  const pts: number[] = [];
  for (const [a, b] of NETS) {
    const A = PARTS[a].sch;
    const B = PARTS[b].sch;
    pts.push(A[0], A[1], 0, B[0], A[1], 0, B[0], A[1], 0, B[0], B[1], 0);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
  return g;
}

/** PRJ.06 — Custom sensor / control PCB: schematic transforms into a routed, powered, probed board. */
export function PcbBuildScene({ act, density }: SceneProps) {
  const station = useStationRef();
  const parts = useRef<(Group | null)[]>([]);
  const wireMat = useRef<LineBasicMaterial>(null);
  const sheetMat = useRef<LineBasicMaterial>(null);
  const probe = useRef<Group>(null);
  const readout = useRef<Group>(null);
  const tp = useRef<ShaderMaterial>(null);
  const reveal = useMemo(() => ({ value: 0 }), []);
  const rise = useMemo(() => ({ value: 0 }), []);
  const wires = useMemo(schematicWires, []);
  const sheet = useMemo(() => rectLines(6.6, 2.2, 0, 0), []);
  const chips = useMemo(() => PARTS.filter((p) => p.chip).map((p) => p.chip!), []);

  useFrame(() => {
    if (!station.current?.visible) return;
    const t = act.current.t;
    PARTS.forEach((p, k) => {
      const g = parts.current[k];
      if (!g) return;
      const m = easeInOutCubic(clamp((t - 0.6 - k * 0.07) / 1.1));
      g.position.set(lerp(p.sch[0], BOARD.x + p.pcb[0], m), lerp(p.sch[1], BOARD.y, m) + Math.sin(m * Math.PI) * 0.5, lerp(SHEET_Z, BOARD.z + p.pcb[1], m));
      g.rotation.x = lerp(Math.PI / 2, 0, m);
      g.scale.set(1, lerp(0.08, 1, m), 1);
    });
    const fade = 1 - smoothstep(0.5, 1.5, t);
    if (wireMat.current) wireMat.current.opacity = fade * 0.75;
    if (sheetMat.current) sheetMat.current.opacity = fade * 0.4;
    reveal.value = Math.max(0, t - 1.9) * 7;
    rise.value = smoothstep(1.7, 2.7, t) * 1.2;
    const pr = easeOutCubic(clamp((t - 3.3) / 0.8));
    if (probe.current) probe.current.position.y = lerp(2.6, 0.5, pr);
    if (readout.current) readout.current.scale.setScalar(Math.max(0.0001, easeOutCubic(clamp((t - 3.9) / 0.6))));
    if (tp.current) tp.current.uniforms.uIntensity.value = smoothstep(3.8, 4.2, t) * 1.5;
  });

  const TP: [number, number, number] = [BOARD.x + 2.0, BOARD.y + 0.04, BOARD.z - 1.15];

  return (
    <group>
      <group position={[BOARD.x, BOARD.y, BOARD.z]}>
        <PCBVisualization
          size={[6.2, 3.6]}
          seed={606}
          density={density}
          boardColor="#08100d"
          chips={chips}
          hideChips
          reveal={reveal}
          rise={rise}
          stagger={2}
          options={{ bundlesPerSide: [1, 3], tracesPerBundle: [3, 6], maxLen: 2.4, freeBundles: 12, smdCount: 0, powerTraces: 3 }}
        />
      </group>

      {/* Parts: schematic symbol → placed footprint */}
      {PARTS.map((p, k) => (
        <group
          key={k}
          ref={(g) => {
            parts.current[k] = g;
          }}
        >
          {p.chip ? (
            <Chip size={[p.chip.w, p.chip.d]} kind={p.chip.kind} pins={p.chip.pins} label={p.chip.label} labelHeight={0.16} edgeColor="#eef1f3" edgeOpacity={0.55} />
          ) : (
            <>
              <mesh geometry={unitBox} material={mats.smd()} position-y={0.06} scale={[p.passive!.w, 0.12, p.passive!.d]} />
              <lineSegments geometry={rectLines(p.passive!.w + 0.04, p.passive!.d + 0.04, 0.125)} material={mats.edge('#eef1f3', 0.6)} />
            </>
          )}
        </group>
      ))}

      {/* Schematic sheet */}
      <group position={[0, 2.3, SHEET_Z]}>
        <lineSegments geometry={sheet} rotation-x={Math.PI / 2}>
          <lineBasicMaterial ref={sheetMat} color="#eef1f3" transparent opacity={0.4} depthWrite={false} />
        </lineSegments>
      </group>
      <lineSegments geometry={wires} position-z={SHEET_Z - 0.01}>
        <lineBasicMaterial ref={wireMat} color="#eef1f3" transparent opacity={0.75} depthWrite={false} />
      </lineSegments>

      {/* Bring-up: probe on a test point + readout */}
      <Glows points={[TP]} size={0.5} color={C.copper} materialRef={tp} intensity={0} />
      <Label text="TP1" height={0.1} rotation-x={-Math.PI / 2} position={[TP[0] + 0.3, BOARD.y + 0.01, TP[2]]} tint="#9fb3bf" />
      <group ref={probe} position={[TP[0], 2.6, TP[2]]}>
        <mesh position-y={0.12} rotation-x={Math.PI} material={mats.pin()}>
          <coneGeometry args={[0.04, 0.24, 12]} />
        </mesh>
        <mesh position-y={0.62} material={mats.flat('#b8452a')}>
          <cylinderGeometry args={[0.07, 0.07, 0.8, 16]} />
        </mesh>
      </group>
      <group ref={readout} position={[3.35, 1.75, -1.25]}>
        <Scope size={[1.7, 1.0]} div={[8, 5]} label="BRING-UP" sublabel="TP1">
          <Waveform type="sine" width={1.65} amp={0.12} freq={3} speed={0.6} thick={0.035} color={C.copper} />
        </Scope>
      </group>
      <Label text="SCHEMATIC — PCB" height={0.11} position={[-3.3, 3.55, SHEET_Z]} align="left" tint="#7f8f99" />
    </group>
  );
}
