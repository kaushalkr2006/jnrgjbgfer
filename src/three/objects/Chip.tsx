import { useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, CircleGeometry, Matrix4, type InstancedMesh } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { boxEdges } from '../geometry/edges';
import { mats } from './materials';
import { Label } from './Label';

type GroupProps = Omit<ThreeElements['group'], 'ref'>;

export type ChipKind = 'qfp' | 'qfn' | 'bga' | 'soic';

export interface ChipProps extends GroupProps {
  size: [number, number];
  height?: number;
  kind?: ChipKind;
  /** Pins per side. */
  pins?: number;
  label?: string;
  labelHeight?: number;
  edgeColor?: string;
  edgeOpacity?: number;
}

export const unitBox = new BoxGeometry(1, 1, 1);
const dot = new CircleGeometry(1, 20);

function pinMatrices(kind: ChipKind, w: number, d: number, n: number) {
  const out: Matrix4[] = [];
  if (kind === 'bga' || n <= 0) return out;
  const sides =
    kind === 'soic'
      ? [
          [0, 1],
          [0, -1],
        ]
      : [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
  const len = kind === 'qfn' ? 0.06 : Math.min(0.22, Math.max(0.1, Math.min(w, d) * 0.07));
  const thick = kind === 'qfn' ? 0.03 : 0.035;
  for (const [sx, sz] of sides) {
    const along = sx !== 0 ? d : w;
    const pitch = (along * 0.82) / n;
    for (let i = 0; i < n; i++) {
      const t = (i - (n - 1) / 2) * pitch;
      const m = new Matrix4();
      const pw = pitch * 0.5;
      if (sx !== 0) {
        m.makeScale(len, thick, pw);
        m.setPosition(sx * (w / 2 + len / 2 - (kind === 'qfn' ? len : 0.02)), thick / 2, t);
      } else {
        m.makeScale(pw, thick, len);
        m.setPosition(t, thick / 2, sz * (d / 2 + len / 2 - (kind === 'qfn' ? len : 0.02)));
      }
      out.push(m);
    }
  }
  return out;
}

/** IC package with pins, edge outline and top marking. Bottom rests on y = 0. */
export function Chip({
  size,
  height = 0.22,
  kind = 'qfp',
  pins = 8,
  label,
  labelHeight,
  edgeColor = '#6ee7ff',
  edgeOpacity = 0.3,
  children,
  ...group
}: ChipProps) {
  const [w, d] = size;
  const base = kind === 'bga' ? 0.05 : kind === 'qfn' ? 0.005 : 0.03;
  const bodyW = kind === 'bga' ? w * 0.8 : w;
  const bodyD = kind === 'bga' ? d * 0.8 : d;
  const top = base + (kind === 'bga' ? 0.06 : 0) + height;

  const matrices = useMemo(() => pinMatrices(kind, w, d, pins), [kind, w, d, pins]);
  const pinRef = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = pinRef.current;
    if (!m) return;
    matrices.forEach((mx, i) => m.setMatrixAt(i, mx));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [matrices]);

  const edges = useMemo(() => {
    const boxes = [
      {
        pos: [0, top - height / 2, 0] as [number, number, number],
        size: [bodyW, height, bodyD] as [number, number, number],
      },
    ];
    if (kind === 'bga') boxes.push({ pos: [0, base + 0.03, 0], size: [w, 0.06, d] });
    return boxEdges(boxes);
  }, [bodyW, bodyD, height, top, kind, base, w, d]);

  return (
    <group {...group}>
      {kind === 'bga' && (
        <mesh position-y={base + 0.03} material={mats.board('#0b1411')} geometry={unitBox} scale={[w, 0.06, d]} />
      )}
      <mesh position-y={top - height / 2} material={mats.chip()} geometry={unitBox} scale={[bodyW, height, bodyD]} />
      <lineSegments geometry={edges} material={mats.edge(edgeColor, edgeOpacity)} />
      {matrices.length > 0 && <instancedMesh ref={pinRef} args={[unitBox, mats.pin(), matrices.length]} />}
      <mesh
        geometry={dot}
        material={mats.flat('#3b444b')}
        rotation-x={-Math.PI / 2}
        position={[-bodyW / 2 + Math.min(bodyW, bodyD) * 0.1, top + 0.001, bodyD / 2 - Math.min(bodyW, bodyD) * 0.1]}
        scale={Math.min(bodyW, bodyD) * 0.035}
      />
      {label && (
        <Label
          text={label}
          height={labelHeight ?? Math.min(bodyW, bodyD) * 0.17}
          rotation-x={-Math.PI / 2}
          position={[0, top + 0.002, 0]}
          tint="#c7d0d6"
          opacity={0.78}
          weight={500}
        />
      )}
      {children}
    </group>
  );
}
