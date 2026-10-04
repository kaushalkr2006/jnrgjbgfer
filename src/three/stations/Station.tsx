import { createContext, useContext, useRef, type RefObject } from 'react';
import { Vector3, type Group } from 'three';
import { useFrame, useThree, type ThreeElements } from '@react-three/fiber';
import { engine } from '../../core/scroll';
import { app } from '../../core/store';
import { frame } from '../../core/ticker';
import { damp } from '../../core/math';

type GroupProps = Omit<ThreeElements['group'], 'ref'>;

const StationContext = createContext<RefObject<Group | null>>({ current: null });

/** True when the enclosing station is currently rendered — lets children skip CPU work. */
export const useStationRef = () => useContext(StationContext);

interface StationProps extends GroupProps {
  range: [number, number];
  /** Extra stops of visibility on each side. */
  margin?: number;
  /** Also require the camera to be within this distance (for stations sharing one stop). */
  maxDistance?: number;
}

const tmp = new Vector3();

/**
 * A spatial section of the world. Only stations near the camera's timeline position are
 * rendered, keeping draw calls low regardless of how large the world grows.
 */
export function Station({ range, margin = 0, maxDistance, children, ...group }: StationProps) {
  const ref = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const s = engine.stopFloat;
    let on = s > range[0] - 1 - margin && s < range[1] + 1 + margin;
    if (on && maxDistance !== undefined) on = camera.position.distanceTo(g.getWorldPosition(tmp)) < maxDistance;
    g.visible = on;
  }, -2);
  return (
    <StationContext.Provider value={ref}>
      <group ref={ref} {...group}>
        {children}
      </group>
    </StationContext.Provider>
  );
}

export interface Activation {
  active: boolean;
  /** Seconds since this stop became active (large value under reduced motion). */
  t: number;
  /** Smoothed 0..1 activation level. */
  level: number;
}

/**
 * Tracks arrival at a stop so scenes can play their information-reveal sequence.
 * `when` narrows activation further (e.g. the selected project inside a shared stop).
 */
export function useActivation(stopIndex: number, when?: () => boolean) {
  const ref = useRef<Activation>({ active: false, t: 0, level: 0 });
  const whenRef = useRef(when);
  whenRef.current = when;
  useFrame(() => {
    const s = ref.current;
    const active = app.get().arrived === stopIndex && (whenRef.current ? whenRef.current() : true);
    if (active && !s.active) s.t = 0;
    s.active = active;
    if (active) s.t += frame.dt;
    if (engine.reduced) s.t = active ? 60 : s.t;
    s.level = engine.reduced ? (active ? 1 : 0) : damp(s.level, active ? 1 : 0, 5, frame.dt);
  }, -1);
  return ref;
}
