import { useEffect, useMemo, type RefObject } from 'react';
import { BufferAttribute, BufferGeometry, type ShaderMaterial } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { waveformMaterial, type WaveformOptions } from '../materials/waveform';

type GroupProps = Omit<ThreeElements['group'], 'ref' | 'type'>;

interface WaveformProps extends Omit<WaveformOptions, 'segments'>, GroupProps {
  segments?: number;
  materialRef?: RefObject<ShaderMaterial | null>;
}

const geometryCache = new Map<number, BufferGeometry>();

function ribbon(segments: number) {
  const hit = geometryCache.get(segments);
  if (hit) return hit;
  const n = segments + 1;
  const aX = new Float32Array(n * 2);
  const aSide = new Float32Array(n * 2);
  const index = new Uint16Array(segments * 6);
  for (let i = 0; i < n; i++) {
    aX[i * 2] = aX[i * 2 + 1] = i / segments;
    aSide[i * 2] = 1;
    aSide[i * 2 + 1] = -1;
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(n * 2 * 3), 3));
  g.setAttribute('aX', new BufferAttribute(aX, 1));
  g.setAttribute('aSide', new BufferAttribute(aSide, 1));
  g.setIndex(new BufferAttribute(index, 1));
  geometryCache.set(segments, g);
  return g;
}

/** GPU-evaluated signal trace (sine, clock, UART frame, noisy sensor, ADC steps …). */
export function Waveform({
  segments = 220,
  materialRef,
  type,
  color,
  width = 4,
  amp,
  freq,
  speed,
  phase,
  thick,
  seed,
  edge,
  glow,
  opacity,
  ...group
}: WaveformProps) {
  const geometry = ribbon(segments);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(
    () => waveformMaterial({ type, color, width, amp, freq, speed, phase, thick, seed, edge, glow, opacity, segments }),
    [],
  );
  if (materialRef) materialRef.current = mat;
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <group {...group}>
      <mesh geometry={geometry} material={mat} renderOrder={4} frustumCulled={false} />
    </group>
  );
}
