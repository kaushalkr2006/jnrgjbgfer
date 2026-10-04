import { useEffect, useMemo, type RefObject } from 'react';
import { AdditiveBlending, Color, LineBasicMaterial, MeshBasicMaterial } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { boxEdges } from '../geometry/edges';
import { Label } from './Label';
import { unitBox } from './Chip';

type GroupProps = Omit<ThreeElements['group'], 'ref'>;

export interface BlockHandles {
  fill: MeshBasicMaterial;
  edge: LineBasicMaterial;
}

interface BlockProps extends GroupProps {
  size: [number, number, number];
  label?: string;
  color?: string;
  fill?: number;
  edge?: number;
  labelHeight?: number;
  handlesRef?: RefObject<BlockHandles | null>;
}

/** Translucent RTL / architecture block with luminous outline and label on its front face. */
export function Block({ size, label, color = '#6ee7ff', fill = 0.06, edge = 0.7, labelHeight, handlesRef, children, ...group }: BlockProps) {
  const [, h, d] = size;
  const edges = useMemo(() => boxEdges([{ pos: [0, 0, 0], size }]), [size]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handles = useMemo<BlockHandles>(
    () => ({
      fill: new MeshBasicMaterial({
        color: new Color(color),
        transparent: true,
        opacity: fill,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
      edge: new LineBasicMaterial({ color: new Color(color), transparent: true, opacity: edge, depthWrite: false }),
    }),
    [],
  );
  if (handlesRef) handlesRef.current = handles;
  useEffect(
    () => () => {
      handles.fill.dispose();
      handles.edge.dispose();
    },
    [handles],
  );
  useEffect(() => () => edges.dispose(), [edges]);
  return (
    <group {...group}>
      <mesh geometry={unitBox} scale={size} material={handles.fill} renderOrder={3} />
      <lineSegments geometry={edges} material={handles.edge} />
      {label && (
        <Label text={label} height={labelHeight ?? Math.min(h * 0.28, 0.2)} position={[0, 0, d / 2 + 0.003]} tint={color} opacity={0.95} />
      )}
      {children}
    </group>
  );
}

