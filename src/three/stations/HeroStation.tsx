import { useMemo, useRef } from 'react';
import { Color, type ShaderMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import { Station } from './Station';
import { PCBVisualization, type ChipSpec } from '../pcb/PCBVisualization';
import { Waveform } from '../objects/Waveform';
import { rectLines } from '../geometry/edges';
import { mats } from '../objects/materials';
import { shared, C } from '../shared';
import { smoothstep } from '../../core/math';

const Z = -10; // board centre (world z); local z = world z + 10

const CHIPS: ChipSpec[] = [
  { x: 0, z: 10, w: 12, d: 4.6, kind: 'qfp', pins: 26, height: 0.32 },
  { x: -10.5, z: 4.9, w: 3.2, d: 3.2, kind: 'qfp', pins: 12, label: 'STM32' },
  { x: 9.5, z: 2.4, w: 4, d: 4, kind: 'bga', label: 'FPGA', height: 0.2 },
  { x: -11, z: 14.3, w: 2, d: 2, kind: 'qfn', pins: 6, label: 'ADC' },
  { x: 11, z: 13.8, w: 1.6, d: 1.6, kind: 'qfn', pins: 4, label: 'IMU' },
  { x: -6, z: -5.3, w: 1.6, d: 2.4, kind: 'soic', pins: 4, label: 'CAN' },
  { x: 6.5, z: -7, w: 2.4, d: 1.6, kind: 'soic', pins: 4, label: 'MEM' },
  { x: 0, z: -13.8, w: 4.4, d: 4.4, kind: 'bga', label: 'DSP', height: 0.22 },
  { x: 12, z: -14.6, w: 2.6, d: 2.6, kind: 'qfp', pins: 10, label: 'MCU' },
  { x: -12, z: -15.5, w: 2.2, d: 2.2, kind: 'qfn', pins: 5, label: 'PWR' },
];

/**
 * 01 — Opening. A large board assembles beneath the name: traces route outward from the
 * central package, components rise, signals start flowing. The camera then dives across it.
 */
export function HeroStation({ density }: { density: number }) {
  const reveal = useMemo(() => ({ value: 0 }), []);
  const waveA = useRef<ShaderMaterial>(null);
  const waveB = useRef<ShaderMaterial>(null);
  const brackets = useMemo(() => rectLines(13.6, 6.2, 0.01, 0.7), []);
  const frameLines = useMemo(() => rectLines(15.4, 10.6, 0.01, 0.35), []);

  useFrame(() => {
    const k = shared.uIntro.value;
    reveal.value = k * 34;
    const w = smoothstep(0.55, 0.95, k);
    if (waveA.current) waveA.current.uniforms.uOpacity.value = w * 0.9;
    if (waveB.current) waveB.current.uniforms.uOpacity.value = w * 0.7;
  });

  return (
    <Station range={[0, 1]}>
      <PCBVisualization
        position={[0, 0, Z]}
        size={[36, 40]}
        chips={CHIPS}
        seed={7}
        density={density}
        reveal={reveal}
        stagger={7}
        rise={shared.uIntro}
        options={{
          bundlesPerSide: [1, 3],
          tracesPerBundle: [3, 8],
          maxLen: 7,
          freeBundles: 46,
          smdCount: 90,
          powerTraces: 4,
          keepout: [
            { x: 0, z: 10 - 4.4, w: 12, d: 0.8 },
            { x: 0, z: 10 + 4.4, w: 12, d: 0.8 },
          ],
        }}
      />
      {/* Digital signals flanking the name package */}
      <Waveform
        materialRef={waveA}
        type="clock"
        width={11}
        amp={0.12}
        freq={18}
        speed={0.5}
        thick={0.05}
        color={C.signal}
        opacity={0}
        rotation-x={-Math.PI / 2}
        position={[0, 0.05, -4.4]}
        segments={420}
      />
      <Waveform
        materialRef={waveB}
        type="uart"
        width={11}
        amp={0.12}
        freq={44}
        speed={1.6}
        thick={0.05}
        color={new Color('#ff8a3d')}
        opacity={0}
        rotation-x={-Math.PI / 2}
        position={[0, 0.05, 4.4]}
        segments={520}
        seed={4}
      />
      <lineSegments geometry={brackets} material={mats.edge('#eef1f3', 0.5)} />
      <lineSegments geometry={frameLines} material={mats.edge('#6ee7ff', 0.25)} />
    </Station>
  );
}
