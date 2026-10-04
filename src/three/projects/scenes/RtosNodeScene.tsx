import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, RingGeometry, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import type { SceneProps } from '../ProjectScene';
import { useStationRef } from '../../stations/Station';
import { PCBVisualization } from '../../pcb/PCBVisualization';
import { Waveform } from '../../objects/Waveform';
import { Panel } from '../../objects/Panel';
import { Chip } from '../../objects/Chip';
import { Label } from '../../objects/Label';
import { Traces } from '../../objects/Traces';
import { Glows } from '../../objects/Glows';
import type { TracePath } from '../../geometry/ribbons';
import { mats } from '../../objects/materials';
import { shared, C } from '../../shared';
import { frame } from '../../../core/ticker';

const ring = new RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
const LOOP = { x: 2.6, y: 1.5, z: -0.2, r: 0.7 };
const LOOP_NODES = [
  { a: Math.PI / 2, label: 'SENSE' },
  { a: Math.PI / 2 - (2 * Math.PI) / 3, label: 'CONTROL' },
  { a: Math.PI / 2 + (2 * Math.PI) / 3, label: 'ACTUATE' },
];
const MCU = { x: -0.6, z: 0.35 };

/** PRJ.05 — FreeRTOS control node: scheduler timeline, interrupt events, control loop, CAN, logging. */
export function RtosNodeScene({ density }: SceneProps) {
  const station = useStationRef();
  const isrRing = useRef<Mesh>(null);
  const isrMat = useRef<MeshBasicMaterial>(null);
  const runner = useRef<Group>(null);
  const st = useRef({ slot: -1, isr: 0 });

  const can = useMemo<TracePath[]>(
    () => [
      { pts: [[-3.6, 2.3], [3.6, 2.3]], width: 0.045, seed: 0.1 },
      { pts: [[-3.6, 2.46], [3.6, 2.46]], width: 0.045, seed: 0.6 },
      { pts: [[MCU.x, 1.9], [MCU.x, 2.3]], width: 0.035, seed: 0.3 },
      { pts: [[MCU.x + 0.2, 1.9], [MCU.x + 0.2, 2.46]], width: 0.035, seed: 0.8 },
    ],
    [],
  );
  const loopPts = useMemo(
    () => LOOP_NODES.map((n) => [Math.cos(n.a) * LOOP.r, Math.sin(n.a) * LOOP.r, 0] as [number, number, number]),
    [],
  );

  useFrame(() => {
    if (!station.current?.visible) return;
    const t = shared.uTime.value;
    const s = st.current;
    // Same scheduler maths as the Gantt shader: slot under the "now" cursor (x = 0.8).
    const slot = Math.floor(0.8 * 16 + t * 2);
    if (slot !== s.slot) {
      s.slot = slot;
      if (((slot % 7) + 7) % 7 === 3) s.isr = 1;
    }
    s.isr = Math.max(0, s.isr - frame.dt * 1.5);
    if (isrRing.current && isrMat.current) {
      const k = 1 - s.isr;
      isrRing.current.scale.setScalar(0.6 + k * 1.6);
      isrMat.current.opacity = s.isr * 0.9;
    }
    if (runner.current) {
      const a = Math.PI / 2 - t * 1.4;
      runner.current.position.set(Math.cos(a) * LOOP.r, Math.sin(a) * LOOP.r, 0);
    }
  });

  return (
    <group>
      <group position={[0, 0.22, 0]}>
        <PCBVisualization
          size={[5.4, 3.0]}
          seed={505}
          density={density}
          boardColor="#08100d"
          position={[-0.5, 0, 0.35]}
          chips={[{ x: MCU.x + 0.5, z: 0, w: 1.4, d: 1.4, kind: 'qfp', pins: 9, label: 'MCU', labelHeight: 0.2 }]}
          options={{ bundlesPerSide: [1, 2], tracesPerBundle: [2, 5], maxLen: 1.8, freeBundles: 6, smdCount: 16 }}
        />
        <mesh ref={isrRing} geometry={ring} position={[MCU.x, 0.04, MCU.z]}>
          <meshBasicMaterial ref={isrMat} color="#ff8a3d" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      {/* RTOS task flow */}
      <Panel size={[3.4, 1.45]} mode="gantt" label="RTOS · SCHEDULER" position={[-1.05, 2.45, -0.95]}>
        {['TASK A', 'TASK B', 'TASK C', 'ISR'].map((l, i) => (
          <Label key={l} text={l} height={0.085} align="right" position={[-1.78, 0.54 - i * 0.362, 0.01]} tint={i === 3 ? '#ff8a3d' : '#7f8f99'} />
        ))}
      </Panel>

      {/* CAN bus with differential signalling */}
      <Traces paths={can} level={0.012} color={new Color('#3a1c0a')} pulseColor={C.copper} speed={4} pulseLen={0.5} gap={3} />
      <Chip size={[0.6, 0.42]} kind="soic" pins={4} label="NODE" labelHeight={0.09} position={[3.95, 0, 2.38]} />
      <Chip size={[0.6, 0.42]} kind="soic" pins={4} label="NODE" labelHeight={0.09} position={[-3.95, 0, 2.38]} />
      <group position={[0.7, 0, 2.75]}>
        <Waveform type="digital" width={3.8} amp={0.09} freq={12} speed={1.2} thick={0.028} color={C.copper} seed={9} position-y={0.66} segments={400} />
        <Waveform type="digital" width={3.8} amp={-0.09} freq={12} speed={1.2} thick={0.028} color={C.signal} seed={9} position-y={0.44} segments={400} />
        <Label text="CAN_H" height={0.085} align="right" position={[-2.05, 0.66, 0]} tint="#ff8a3d" />
        <Label text="CAN_L" height={0.085} align="right" position={[-2.05, 0.44, 0]} tint="#6ee7ff" />
      </group>

      {/* Sensor / control loop */}
      <group position={[LOOP.x, LOOP.y, LOOP.z]}>
        <mesh material={mats.flat('#6ee7ff', 0.5)}>
          <torusGeometry args={[LOOP.r, 0.01, 6, 96]} />
        </mesh>
        <Glows points={loopPts} size={0.38} color={C.signal} intensity={1.1} />
        {LOOP_NODES.map((n, i) => (
          <Label
            key={n.label}
            text={n.label}
            height={0.1}
            align={Math.cos(n.a) > 0.1 ? 'left' : Math.cos(n.a) < -0.1 ? 'right' : 'center'}
            position={[Math.cos(n.a) * (LOOP.r + 0.2), Math.sin(n.a) * (LOOP.r + 0.2) + (i === 0 ? 0.08 : 0), 0]}
            tint="#9fb3bf"
          />
        ))}
        <group ref={runner}>
          <Glows points={[[0, 0, 0]]} size={0.45} color={C.copper} intensity={1.6} />
        </group>
      </group>

      {/* System log */}
      <Panel size={[1.35, 1.6]} mode="log" label="LOG" position={[-3.75, 1.35, 0.1]} rotation-y={0.38} seed={7} />
    </group>
  );
}
