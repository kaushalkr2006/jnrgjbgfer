import { useMemo } from 'react';
import { Color } from 'three';
import type { SceneProps } from '../ProjectScene';
import { PCBVisualization } from '../../pcb/PCBVisualization';
import { Waveform } from '../../objects/Waveform';
import { Scope } from '../../objects/Scope';
import { Block } from '../../objects/Block';
import { Label } from '../../objects/Label';
import { Traces } from '../../objects/Traces';
import { CellGrid } from '../../objects/CellGrid';
import { Cable } from '../../objects/Cable';
import { boxEdges, rectLines } from '../../geometry/edges';
import { mats } from '../../objects/materials';
import type { TracePath } from '../../geometry/ribbons';
import { C } from '../../shared';

const FAB = { x: -0.8, y: 1.42, z: 0.6, dims: [14, 14] as [number, number], pitch: 0.13 };
const BLOCK_Y = 2.6;
const BLOCKS = [
  { x: -2.25, label: 'UART' },
  { x: -0.8, label: 'CTRL' },
  { x: 0.65, label: 'DISPLAY' },
];

/** PRJ.04 — FPGA UART / display subsystem: RTL blocks synthesise onto fabric, drive a display. */
export function FpgaDisplayScene({ density }: SceneProps) {
  const fabricFrame = useMemo(() => rectLines(14 * 0.13 + 0.12, 14 * 0.13 + 0.12, 0, 0.18), []);
  const displayBezel = useMemo(() => boxEdges([{ pos: [0, 0, 0], size: [2.1, 1.12, 0.08] }]), []);

  const routes = useMemo<TracePath[]>(() => {
    const out: TracePath[] = [];
    // block-to-block buses
    for (let i = 0; i < BLOCKS.length - 1; i++) {
      for (const dy of [-0.1, 0.1]) {
        out.push({ pts: [[BLOCKS[i].x + 0.5, BLOCK_Y + dy], [BLOCKS[i + 1].x - 0.5, BLOCK_Y + dy]], width: 0.03, seed: (i + dy + 1) / 3 });
      }
    }
    // synthesis mapping: block → fabric region
    BLOCKS.forEach((b, i) => {
      const rx = FAB.x + (i - 1) * 0.6;
      out.push({ pts: [[b.x, BLOCK_Y - 0.27], [b.x, BLOCK_Y - 0.55], [rx, FAB.y + 0.2], [rx, FAB.y + 0.05]], width: 0.025, seed: i / 3 + 0.1 });
    });
    return out;
  }, []);

  const lanes = [
    { label: 'CLK', type: 'clock' as const, freq: 22, speed: 0.9, color: C.ink, y: 0.56 },
    { label: 'RX', type: 'uart' as const, freq: 30, speed: 2.2, color: C.signal, y: 0.19 },
    { label: 'DATA', type: 'digital' as const, freq: 8, speed: 0.55, color: C.signal, y: -0.19 },
    { label: 'VLD', type: 'strobe' as const, freq: 8, speed: 0.55, color: C.copper, y: -0.56 },
  ];

  return (
    <group position-x={-0.5}>
      <group position={[-0.4, 0.22, 0.6]}>
        <PCBVisualization
          size={[5.8, 3.2]}
          seed={404}
          density={density}
          boardColor="#08100d"
          chips={[{ x: -0.4, z: 0, w: 1.9, d: 1.9, kind: 'bga', label: 'FPGA', labelHeight: 0.26 }]}
          options={{ bundlesPerSide: [1, 2], tracesPerBundle: [3, 6], maxLen: 2, freeBundles: 6, smdCount: 16 }}
        />
      </group>

      {/* Exploded fabric view above the FPGA */}
      <CellGrid dims={FAB.dims} pitch={FAB.pitch} mode="fabric" position={[FAB.x, FAB.y, FAB.z]} />
      <lineSegments geometry={fabricFrame} position={[FAB.x, FAB.y, FAB.z]} material={mats.edge('#6ee7ff', 0.5)} />

      {/* RTL blocks + routing + synthesis mapping */}
      {BLOCKS.map((b) => (
        <Block key={b.label} size={[1.0, 0.5, 0.6]} label={b.label} labelHeight={0.13} position={[b.x, BLOCK_Y, FAB.z]} />
      ))}
      <group position-z={FAB.z}>
        <Traces paths={routes} plane="xy" level={0} color={new Color('#123842')} pulseColor={C.signal} speed={1.8} pulseLen={0.35} gap={1.4} />
      </group>
      <Label text="RTL — SYNTHESIS — FABRIC" height={0.1} position={[FAB.x, BLOCK_Y + 0.5, FAB.z]} tint="#7f8f99" />

      {/* Simulation waveform viewer */}
      <Scope size={[2.7, 1.65]} div={[12, 4]} label="SIMULATION" sublabel="TIMING" position={[2.65, 2.45, -1.1]}>
        {lanes.map((l) => (
          <group key={l.label} position-y={l.y}>
            <Label text={l.label} height={0.08} align="left" position={[-1.3, 0.11, 0]} tint="#7f8f99" />
            <Waveform type={l.type} width={2.1} amp={0.1} freq={l.freq} speed={l.speed} thick={0.03} color={l.color} position-x={0.22} segments={360} seed={4} glow={0.5} />
          </group>
        ))}
      </Scope>

      {/* Display interface */}
      <group position={[3.15, 0.95, -0.2]} rotation-y={-0.3}>
        <CellGrid dims={[28, 14]} pitch={0.07} mode="display" rotation-x={Math.PI / 2} />
        <lineSegments geometry={displayBezel} material={mats.edge('#eef1f3', 0.4)} />
        <Label text="DISPLAY" height={0.09} align="left" position={[-1.05, 0.68, 0]} tint="#9fb3bf" />
      </group>
      <Cable
        points={[
          [2.1, 0.26, 0.4],
          [2.6, 0.32, 0.3],
          [2.95, 0.42, 0.05],
          [3.1, 0.42, -0.15],
        ]}
        radius={0.035}
      />
    </group>
  );
}
