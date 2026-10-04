import { useMemo } from 'react';
import type { ThreeElements } from '@react-three/fiber';
import { labelTexture, type LabelStyle } from '../geometry/labels';

type GroupProps = Omit<ThreeElements['group'], 'ref'>;

interface LabelProps extends GroupProps, LabelStyle {
  text: string;
  /** World-space height of the text line. */
  height?: number;
  tint?: string;
  opacity?: number;
  align?: 'center' | 'left' | 'right';
  order?: number;
}

/** Flat text plane (chip markings, instrument labels). Faces +Z by default. */
export function Label({
  text,
  height = 0.2,
  tint = '#ffffff',
  opacity = 1,
  align = 'center',
  order = 5,
  size,
  weight,
  mono,
  tracking,
  color,
  ...group
}: LabelProps) {
  const { texture, aspect } = useMemo(
    () => labelTexture(text, { size, weight, mono, tracking, color }),
    [text, size, weight, mono, tracking, color],
  );
  const width = height * aspect;
  const shift = align === 'left' ? width / 2 : align === 'right' ? -width / 2 : 0;
  return (
    <group {...group}>
      <mesh position-x={shift} renderOrder={order}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} color={tint} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
