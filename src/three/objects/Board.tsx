import { useMemo } from 'react';
import type { ThreeElements } from '@react-three/fiber';
import { boxEdges } from '../geometry/edges';
import { gridMaterial } from '../materials/surfaces';
import { mats } from './materials';
import { PALETTE } from '../shared';

type GroupProps = Omit<ThreeElements['group'], 'ref'>;

interface BoardProps extends GroupProps {
  size: [number, number];
  thickness?: number;
  color?: string;
  edgeColor?: string;
  edgeOpacity?: number;
  grid?: boolean;
  gridCell?: number;
}

/** PCB / substrate slab. Top surface sits at y = 0. */
export function Board({
  size,
  thickness = 0.12,
  color = PALETTE.board,
  edgeColor = '#6ee7ff',
  edgeOpacity = 0.22,
  grid = true,
  gridCell = 0.25,
  children,
  ...group
}: BoardProps) {
  const [w, d] = size;
  const edges = useMemo(() => boxEdges([{ pos: [0, -thickness / 2, 0], size: [w, thickness, d] }]), [w, d, thickness]);
  const grid$ = useMemo(
    () => (grid ? gridMaterial({ size: [w, d], cell: gridCell, majorEvery: 4, opacity: 0.16, fade: 0.5 }) : null),
    [grid, w, d, gridCell],
  );
  return (
    <group {...group}>
      <mesh position={[0, -thickness / 2, 0]} material={mats.board(color)}>
        <boxGeometry args={[w, thickness, d]} />
      </mesh>
      <lineSegments geometry={edges} material={mats.edge(edgeColor, edgeOpacity)} />
      {grid$ && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.002} material={grid$} renderOrder={1}>
          <planeGeometry args={[w, d]} />
        </mesh>
      )}
      {children}
    </group>
  );
}
