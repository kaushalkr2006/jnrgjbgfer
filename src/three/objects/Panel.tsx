import { useEffect, useMemo, type RefObject } from 'react';
import type { ShaderMaterial } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { panelMaterial, type PanelMode } from '../materials/panels';
import { boxEdges } from '../geometry/edges';
import { mats } from './materials';
import { Label } from './Label';

type GroupProps = Omit<ThreeElements['group'], 'ref'>;

interface PanelProps extends GroupProps {
  size: [number, number];
  mode: PanelMode;
  label?: string;
  seed?: number;
  a?: string;
  b?: string;
  c?: string;
  bezel?: boolean;
  materialRef?: RefObject<ShaderMaterial | null>;
}

/** Procedural screen (RTOS scheduler, system log, document sheet). */
export function Panel({ size, mode, label, seed, a, b, c, bezel = true, materialRef, children, ...group }: PanelProps) {
  const [w, h] = size;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(() => panelMaterial(mode, { seed, a, b, c }), []);
  if (materialRef) materialRef.current = mat;
  const frame = useMemo(() => (bezel ? boxEdges([{ pos: [0, 0, -0.02], size: [w + 0.08, h + 0.08, 0.04] }]) : null), [bezel, w, h]);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <group {...group}>
      <mesh material={mat} renderOrder={2}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {frame && <lineSegments geometry={frame} material={mats.edge('#6ee7ff', 0.25)} />}
      {label && <Label text={label} height={0.13} align="left" position={[-w / 2, h / 2 + 0.14, 0]} tint="#9fb3bf" opacity={0.9} />}
      {children}
    </group>
  );
}
