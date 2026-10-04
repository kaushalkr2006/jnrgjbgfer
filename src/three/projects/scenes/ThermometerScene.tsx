import { useMemo, useRef } from 'react';
import { Color, type MeshBasicMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import type { SceneProps } from '../ProjectScene';
import { useStationRef } from '../../stations/Station';
import { PCBVisualization } from '../../pcb/PCBVisualization';
import { Waveform } from '../../objects/Waveform';
import { Scope } from '../../objects/Scope';
import { Block } from '../../objects/Block';
import { Label } from '../../objects/Label';
import { Traces } from '../../objects/Traces';
import { Cable } from '../../objects/Cable';
import { unitBox } from '../../objects/Chip';
import { mats } from '../../objects/materials';
import type { TracePath } from '../../geometry/ribbons';
import { shared, C } from '../../shared';

const FREQ = 1.6;
const SPEED = 0.22;
const BIT_ON = new Color('#6ee7ff');
const BIT_OFF = new Color('#12262d');
const analogV = (x: number) => 0.8 * Math.sin(x * Math.PI) + 0.2 * Math.sin(x * 9);

/** PRJ.02 — Analog + digital thermometer: analog signal → ADC → bits → Verilog controller → scope. */
export function ThermometerScene({ density }: SceneProps) {
  const station = useStationRef();
  const bits = useRef<(MeshBasicMaterial | null)[]>([]);
  const bus = useMemo<TracePath[]>(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        pts: [
          [-0.25, -0.42 + i * 0.12],
          [0.95, -0.42 + i * 0.12],
        ],
        width: 0.035,
        seed: i / 8,
      })),
    [],
  );

  useFrame(() => {
    if (!station.current?.visible) return;
    // Newest ADC sample (right edge of the ADC panel) expressed as an 8-bit code.
    const xs = FREQ + shared.uTime.value * SPEED;
    const sample = Math.floor(xs * 6) / 6;
    const code = Math.max(0, Math.min(255, Math.round(((analogV(sample) + 1) / 2) * 255)));
    for (let b = 0; b < 8; b++) {
      const m = bits.current[b];
      if (m) m.color.copy((code >> (7 - b)) & 1 ? BIT_ON : BIT_OFF);
    }
  });

  return (
    <group>
      <group position={[0, 0.22, 0.55]}>
        <PCBVisualization
          size={[7.6, 2.6]}
          seed={202}
          density={density}
          boardColor="#08100d"
          chips={[{ x: -0.9, z: 0, w: 1.0, d: 1.0, kind: 'qfn', pins: 5, label: 'ADC', labelHeight: 0.2 }]}
          options={{
            bundlesPerSide: [1, 1],
            tracesPerBundle: [2, 4],
            maxLen: 1.6,
            freeBundles: 5,
            smdCount: 14,
            keepout: [
              { x: 0.4, z: 0, w: 1.6, d: 1.1 },
              { x: 1.9, z: 0, w: 1.6, d: 1.2 },
              { x: -3.0, z: 0, w: 0.8, d: 0.8 },
            ],
          }}
        />
        {/* Analog sensor */}
        <mesh position={[-3.0, 0.22, 0]} material={mats.dark()}>
          <cylinderGeometry args={[0.2, 0.2, 0.44, 24, 1, false, 0, Math.PI]} />
        </mesh>
        <Label text="SENSOR" height={0.12} rotation-x={-Math.PI / 2} position={[-3.0, 0.01, 0.45]} tint="#9fb3bf" />
        {/* Parallel data bus with live bit indicators */}
        <group position={[0.2, 0, 0]}>
          <Traces paths={bus} color={new Color('#123842')} pulseColor={C.signal} speed={2.4} pulseLen={0.3} gap={2} />
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} geometry={unitBox} position={[0.35, 0.03, -0.42 + i * 0.12]} scale={[0.16, 0.05, 0.08]}>
              <meshBasicMaterial
                ref={(m) => {
                  bits.current[i] = m;
                }}
                color="#12262d"
              />
            </mesh>
          ))}
          <Label text="DATA[7:0]" height={0.1} rotation-x={-Math.PI / 2} position={[0.35, 0.01, 0.62]} tint="#9fb3bf" />
        </group>
        <Block size={[1.3, 0.55, 1.0]} label="ctrl.v" color="#6ee7ff" position={[1.9, 0.3, 0]} labelHeight={0.17} />
      </group>

      {/* Signal chain instruments */}
      <Scope size={[2.0, 1.25]} div={[8, 5]} label="ANALOG IN" position={[-2.35, 2.15, -0.75]}>
        <Waveform type="analog" width={1.95} amp={0.42} freq={FREQ} speed={SPEED} thick={0.045} color={C.copper} />
      </Scope>
      <Scope size={[2.0, 1.25]} div={[8, 5]} label="ADC" sublabel="SAMPLED" position={[0, 2.15, -0.75]}>
        <Waveform type="analog" width={1.95} amp={0.42} freq={FREQ} speed={SPEED} thick={0.03} color={C.copper} opacity={0.3} glow={0} />
        <Waveform type="adc" width={1.95} amp={0.42} freq={FREQ} speed={SPEED} thick={0.045} color={C.signal} edge={0.04} segments={320} />
      </Scope>
      <Scope size={[2.0, 1.25]} div={[8, 5]} label="SCOPE" sublabel="CH1 · CH2" position={[2.35, 2.15, -0.75]}>
        <Waveform type="analog" width={1.95} amp={0.3} freq={FREQ * 0.6} speed={SPEED} thick={0.045} color={C.copper} position-y={0.22} />
        <Waveform type="clock" width={1.95} amp={0.1} freq={12} speed={0.8} thick={0.04} color={C.signal} position-y={-0.32} segments={300} />
      </Scope>
      <Cable
        points={[
          [2.35, 1.5, -0.75],
          [2.6, 1.0, -0.2],
          [2.3, 0.6, 0.3],
          [2.0, 0.6, 0.45],
        ]}
        radius={0.025}
      />
    </group>
  );
}
