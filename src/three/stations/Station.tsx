import { createContext, useContext, useRef, type RefObject } from 'react';
import type { Group } from 'three';
import { useFrame, type ThreeElements } from '@react-three/fiber';
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
}

/**
 * A spatial section of the world. Only stations near the camera's timeline position are
 * rendered, keeping draw calls low regardless of how large the world grows.
 */
export function Station({ range, margin = 0, children, ...group }: StationProps) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const s = engine.stopFloat;
    g.visible = s > range[0] - 1 - margin && s < range[1] + 1 + margin;
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

/** Tracks arrival at a stop so scenes can play their information-reveal sequence. */
export function useActivation(stopIndex: number) {
  const ref = useRef<Activation>({ active: false, t: 0, level: 0 });
  useFrame(() => {
    const s = ref.current;
    const active = app.get().arrived === stopIndex;
    if (active && !s.active) s.t = 0;
    s.active = active;
    if (active) s.t += frame.dt;
    if (engine.reduced) s.t = active ? 60 : s.t;
    s.level = engine.reduced ? (active ? 1 : 0) : damp(s.level, active ? 1 : 0, 5, frame.dt);
  }, -1);
  return ref;
}
