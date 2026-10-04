import { useEffect, useMemo, type RefObject } from 'react';
import { Color, InstancedBufferAttribute, InstancedBufferGeometry, PlaneGeometry, type ShaderMaterial } from 'three';
import { glowMaterial } from '../materials/glow';

interface GlowsProps {
  points: [number, number, number][];
  size?: number | number[];
  color?: Color;
  intensity?: number;
  flicker?: number;
  /** Per-point reveal threshold compared against `reveal` uniform (0..1). */
  delays?: number[];
  reveal?: { value: number };
  materialRef?: RefObject<ShaderMaterial | null>;
}

const quad = new PlaneGeometry(1, 1);

/** Instanced billboard glows — LEDs, signal nodes, pads, pulses. */
export function Glows({ points, size = 0.3, color = new Color('#6ee7ff'), intensity = 1, flicker = 0, delays, reveal, materialRef }: GlowsProps) {
  const geometry = useMemo(() => {
    const g = new InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.getAttribute('position'));
    g.setAttribute('uv', quad.getAttribute('uv'));
    const n = points.length;
    const offset = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const phase = new Float32Array(n);
    const delay = new Float32Array(n);
    points.forEach((p, i) => {
      offset.set(p, i * 3);
      sizes[i] = Array.isArray(size) ? size[i] ?? 0.3 : size;
      phase[i] = (i * 0.618034) % 1;
      delay[i] = delays?.[i] ?? 0;
    });
    g.setAttribute('aOffset', new InstancedBufferAttribute(offset, 3));
    g.setAttribute('aSize', new InstancedBufferAttribute(sizes, 1));
    g.setAttribute('aPhase', new InstancedBufferAttribute(phase, 1));
    g.setAttribute('aDelay', new InstancedBufferAttribute(delay, 1));
    g.instanceCount = n;
    return g;
  }, [points, size, delays]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(() => {
    const m = glowMaterial(color, intensity, flicker);
    if (reveal) m.uniforms.uReveal = reveal;
    return m;
  }, []);
  if (materialRef) materialRef.current = mat;
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => mat.dispose(), [mat]);
  return <mesh geometry={geometry} material={mat} frustumCulled={false} renderOrder={6} />;
}
