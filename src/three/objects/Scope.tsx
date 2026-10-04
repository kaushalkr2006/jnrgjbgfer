import { useEffect, useMemo } from 'react';
import type { ThreeElements } from '@react-three/fiber';
import { boxEdges } from '../geometry/edges';
import { screenMaterial } from '../materials/surfaces';
import { mats } from './materials';
import { Label } from './Label';

type GroupProps = Omit<ThreeElements['group'], 'ref'>;

interface ScopeProps extends GroupProps {
  size: [number, number];
  div?: [number, number];
  label?: string;
  sublabel?: string;
  edgeColor?: string;
}

/** Instrument screen with graticule (oscilloscope / logic analyser). Children render on top. */
export function Scope({ size, div, label, sublabel, edgeColor = '#6ee7ff', children, ...group }: ScopeProps) {
  const [w, h] = size;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(() => screenMaterial({ size, div }), []);
  const bezel = useMemo(() => boxEdges([{ pos: [0, 0, -0.02], size: [w + 0.1, h + 0.1, 0.04] }]), [w, h]);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <group {...group}>
      <mesh material={mat} renderOrder={2}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <lineSegments geometry={bezel} material={mats.edge(edgeColor, 0.28)} />
      {label && <Label text={label} height={0.13} align="left" position={[-w / 2, h / 2 + 0.14, 0]} tint="#9fb3bf" opacity={0.9} />}
      {sublabel && <Label text={sublabel} height={0.11} align="right" position={[w / 2, h / 2 + 0.14, 0]} tint="#5f7380" opacity={0.9} />}
      <group position-z={0.012}>{children}</group>
    </group>
  );
}
