import { useMemo, useRef } from 'react';
import { type LineBasicMaterial, type MeshBasicMaterial, type ShaderMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import type { SceneProps } from '../ProjectScene';
import { useStationRef } from '../../stations/Station';
import { PCBVisualization } from '../../pcb/PCBVisualization';
import { Waveform } from '../../objects/Waveform';
import { Scope } from '../../objects/Scope';
import { DataStream } from '../../objects/DataStream';
import { Glows } from '../../objects/Glows';
import { Label } from '../../objects/Label';
import { Cable } from '../../objects/Cable';
import { Block } from '../../objects/Block';
import { Panel } from '../../objects/Panel';
import { unitBox } from '../../objects/Chip';
import { mats } from '../../objects/materials';
import { rectLines } from '../../geometry/edges';
import { shared, C } from '../../shared';
import { damp } from '../../../core/math';
import { frame } from '../../../core/ticker';

const STREAM_SPEED = 0.16;
const GROUPS = 3;

/** PRJ.01 — STM32 UART + LED control: UART frames stream into an STM32 that drives an LED. */
export function Stm32UartScene({ act, density }: SceneProps) {
  const station = useStationRef();
  const led = useRef<ShaderMaterial>(null);
  const ledBody = useRef<MeshBasicMaterial>(null);
  const debugRing = useRef<LineBasicMaterial>(null);
  const st = useRef({ on: true, flash: 0, prevU: [0, 0, 0] as number[] });
  const ring = useMemo(() => rectLines(2.05, 2.05, 0.02, 0.28), []);

  useFrame(() => {
    if (!station.current?.visible) return;
    const s = st.current;
    const t = shared.uTime.value;
    // Toggle the LED exactly when a UART packet reaches the header.
    for (let g = 0; g < GROUPS; g++) {
      const u = (g * 0.22 + 7 * 0.018 + t * STREAM_SPEED) % 1;
      if (s.prevU[g] < 0.9 && u >= 0.9) {
        s.on = !s.on;
        s.flash = 1;
      }
      s.prevU[g] = u;
    }
    s.flash = damp(s.flash, 0, 5, frame.dt);
    const level = 0.35 + act.current.level * 0.65;
    if (led.current) led.current.uniforms.uIntensity.value = (s.on ? 1.4 : 0.08) * level;
    if (ledBody.current) ledBody.current.color.set(s.on ? '#ffb27a' : '#3a2416');
    if (debugRing.current) debugRing.current.opacity = 0.25 + s.flash * 0.6;
  });

  return (
    <group>
      {/* Development board */}
      <group position={[0.5, 0.22, 0.4]}>
        <PCBVisualization
          size={[5.6, 3.4]}
          seed={101}
          density={density}
          boardColor="#08100d"
          chips={[{ x: 0.2, z: 0, w: 1.5, d: 1.5, kind: 'qfp', pins: 10, label: 'STM32', labelHeight: 0.2 }]}
          options={{
            bundlesPerSide: [1, 2],
            tracesPerBundle: [2, 5],
            maxLen: 2.2,
            freeBundles: 6,
            smdCount: 14,
            keepout: [
              { x: 1.9, z: 0.95, w: 0.7, d: 0.6 },
              { x: -2.3, z: 0, w: 0.6, d: 1.4 },
            ],
          }}
        />
        {/* LED */}
        <mesh geometry={unitBox} position={[1.9, 0.08, 0.95]} scale={[0.32, 0.16, 0.2]}>
          <meshBasicMaterial ref={ledBody} color="#ffb27a" />
        </mesh>
        <Glows points={[[1.9, 0.25, 0.95]]} size={1.3} color={C.copper} intensity={1.4} materialRef={led} />
        <Label text="LED" height={0.12} rotation-x={-Math.PI / 2} position={[1.9, 0.01, 1.32]} tint="#9fb3bf" />
        {/* UART header */}
        <mesh geometry={unitBox} material={mats.dark()} position={[-2.3, 0.12, 0]} scale={[0.32, 0.24, 1.25]} />
        {[-0.45, -0.15, 0.15, 0.45].map((z) => (
          <mesh key={z} geometry={unitBox} material={mats.pin()} position={[-2.3, 0.38, z]} scale={[0.05, 0.42, 0.05]} />
        ))}
        <Label text="UART" height={0.12} rotation-x={-Math.PI / 2} position={[-2.3, 0.01, 0.85]} tint="#9fb3bf" />
        <lineSegments geometry={ring} position={[0.2, 0, 0]}>
          <lineBasicMaterial ref={debugRing} color="#6ee7ff" transparent opacity={0.3} />
        </lineSegments>
      </group>

      {/* Host terminal → UART stream */}
      <Panel size={[1.5, 1.1]} mode="log" label="HOST" position={[-4.1, 1.75, 0.2]} rotation-y={0.35} seed={3} />
      <DataStream from={[-3.4, 1.35, 0.35]} to={[-1.8, 0.62, 0.4]} count={GROUPS * 8} speed={STREAM_SPEED} size={0.065} arc={0.25} />

      {/* Signal view */}
      <Scope size={[4.4, 1.1]} div={[16, 4]} label="UART · TX" sublabel="CH1" position={[0.6, 2.55, -1.2]}>
        <Waveform type="uart" width={4.3} amp={0.32} freq={34} speed={2.6} thick={0.05} color={C.signal} segments={520} seed={2} />
      </Scope>

      {/* Embedded debug probe */}
      <Block size={[0.8, 0.28, 0.5]} label="SWD" color="#ff8a3d" position={[-1.9, 0.3, -2.4]} labelHeight={0.13} />
      <Cable
        points={[
          [-1.5, 0.3, -2.25],
          [-0.9, 0.5, -1.9],
          [-0.2, 0.42, -1.2],
          [0.1, 0.3, -0.75],
        ]}
        radius={0.028}
      />
      <Label text="DEBUG" height={0.11} rotation-x={-Math.PI / 2} position={[0.7, 0.24, -0.62]} tint="#6ee7ff" opacity={0.8} />
    </group>
  );
}
