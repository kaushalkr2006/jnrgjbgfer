import { useEffect, useRef } from 'react';

/**
 * Single requestAnimationFrame loop for the whole site. Ordering per frame:
 *   0   scroll engine (Lenis + staged progress)
 *   10  DOM writers (HUD, progress rail, panels that read continuous values)
 *   100 WebGL render (react-three-fiber `advance`)
 * One loop guarantees the camera and the DOM always reflect the same scroll value.
 */
export type TickFn = (time: number, dt: number) => void;

interface Sub {
  fn: TickFn;
  priority: number;
}

const subs: Sub[] = [];
let rafId = 0;
let last = 0;

export const frame = { time: 0, dt: 1 / 60, count: 0 };

export function addTick(fn: TickFn, priority = 10) {
  const sub = { fn, priority };
  subs.push(sub);
  subs.sort((a, b) => a.priority - b.priority);
  return () => {
    const i = subs.indexOf(sub);
    if (i >= 0) subs.splice(i, 1);
  };
}

function loop(ms: number) {
  rafId = requestAnimationFrame(loop);
  const t = ms / 1000;
  // Clamp dt so a backgrounded tab does not produce a giant jump on return.
  const dt = last ? Math.min(Math.max(t - last, 1 / 500), 1 / 20) : 1 / 60;
  last = t;
  frame.time = t;
  frame.dt = dt;
  frame.count++;
  for (let i = 0; i < subs.length; i++) subs[i].fn(t, dt);
}

export function startTicker() {
  if (rafId) return;
  rafId = requestAnimationFrame(loop);
}

/** React helper: run a callback every frame without causing renders. */
export function useTick(fn: TickFn, priority = 10) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => addTick((t, dt) => ref.current(t, dt), priority), [priority]);
}
