import { useEffect, useMemo, type RefObject } from 'react';
import { Color, InstancedBufferAttribute, InstancedBufferGeometry, PlaneGeometry, type ShaderMaterial } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { cellMaterial, type CellMode } from '../materials/surfaces';
import { mulberry32 } from '../../core/math';

type GroupProps = Omit<ThreeElements['group'], 'ref'>;

const quad = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

interface CellGridProps extends GroupProps {
  dims: [number, number];
  pitch: number;
  mode: CellMode;
  color?: Color;
  color2?: Color;
  base?: Color;
  seed?: number;
  materialRef?: RefObject<ShaderMaterial | null>;
}

/** Grid of instanced cells lying in the XZ plane — FPGA fabric, coverage bins, pixels. */
export function CellGrid({ dims, pitch, mode, color, color2, base, seed = 5, materialRef, ...group }: CellGridProps) {
  const geometry = useMemo(() => {
    const g = new InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.getAttribute('position'));
    g.setAttribute('uv', quad.getAttribute('uv'));
    const n = dims[0] * dims[1];
    const cell = new Float32Array(n * 2);
    const rand = new Float32Array(n);
    const rng = mulberry32(seed);
    for (let j = 0; j < dims[1]; j++) {
      for (let i = 0; i < dims[0]; i++) {
        const k = j * dims[0] + i;
        cell[k * 2] = i;
        cell[k * 2 + 1] = j;
        rand[k] = rng();
      }
    }
    g.setAttribute('aCell', new InstancedBufferAttribute(cell, 2));
    g.setAttribute('aRand', new InstancedBufferAttribute(rand, 1));
    g.instanceCount = n;
    return g;
  }, [dims, seed]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(() => cellMaterial({ mode, dims, pitch, color, color2, base }), []);
  if (materialRef) materialRef.current = mat;
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <group {...group}>
      <mesh geometry={geometry} material={mat} frustumCulled={false} renderOrder={3} />
    </group>
  );
}
