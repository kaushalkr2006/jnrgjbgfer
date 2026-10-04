import { useRef } from 'react';
import { Vector3, type Group } from 'three';
import { useFrame, type ThreeElements, type ThreeEvent } from '@react-three/fiber';
import { Spring, clamp } from '../../core/math';
import { frame } from '../../core/ticker';
import { shared } from '../shared';

type GroupProps = Omit<ThreeElements['group'], 'ref'>;

export interface SpatialObjectProps extends GroupProps {
  /** Idle float amplitude (world units). */
  float?: number;
  floatSpeed?: number;
  /** Enable hover physics (spring lift + tilt toward the pointer). */
  hover?: boolean;
  lift?: number;
  tilt?: number;
  /** Radius used to normalise the pointer position for tilt. */
  reach?: number;
  onSelect?: () => void;
  onHover?: (over: boolean) => void;
}

const tmp = new Vector3();

/**
 * The reusable "3D object" wrapper: spring-driven hover physics, idle float and click
 * selection for any child geometry. Motion is integrated per frame — no React renders.
 */
export function SpatialObject({
  float = 0,
  floatSpeed = 0.6,
  hover = true,
  lift = 0.14,
  tilt = 0.12,
  reach = 1.5,
  onSelect,
  onHover,
  children,
  ...group
}: SpatialObjectProps) {
  const inner = useRef<Group>(null);
  const st = useRef({
    over: false,
    lift: new Spring(0, 170, 17),
    rx: new Spring(0, 130, 15),
    rz: new Spring(0, 130, 15),
    px: 0,
    pz: 0,
    phase: Math.random() * Math.PI * 2,
  });

  useFrame(() => {
    const g = inner.current;
    if (!g) return;
    const s = st.current;
    const dt = frame.dt;
    const h = s.lift.step(s.over ? 1 : 0, dt);
    g.position.y = h * lift + (float ? Math.sin(shared.uTime.value * floatSpeed + s.phase) * float : 0);
    g.rotation.x = s.rx.step(s.over ? s.pz * tilt : 0, dt);
    g.rotation.z = s.rz.step(s.over ? -s.px * tilt : 0, dt);
  });

  const handlers = hover
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          st.current.over = true;
          onHover?.(true);
          if (onSelect) document.body.style.cursor = 'pointer';
        },
        onPointerOut: () => {
          st.current.over = false;
          onHover?.(false);
          document.body.style.cursor = '';
        },
        onPointerMove: (e: ThreeEvent<PointerEvent>) => {
          const g = inner.current;
          if (!g) return;
          tmp.copy(e.point);
          g.parent?.worldToLocal(tmp);
          st.current.px = clamp(tmp.x / reach, -1, 1);
          st.current.pz = clamp(tmp.z / reach, -1, 1);
        },
        onClick: onSelect
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onSelect();
            }
          : undefined,
      }
    : {};

  return (
    <group {...group} {...handlers}>
      <group ref={inner}>{children}</group>
    </group>
  );
}
