import { Color } from 'three';

/**
 * Uniform objects shared by reference across every custom shader. Updating `.value` once
 * per frame animates every material without per-material bookkeeping.
 */
export const shared = {
  uTime: { value: 0 },
  /** Opening assembly progress 0..1 (time based, runs once). */
  uIntro: { value: 0 },
};

export const PALETTE = {
  bg: '#030405',
  ink: '#eef1f3',
  copper: '#ff8a3d',
  copperDim: '#7a3a14',
  signal: '#6ee7ff',
  signalDim: '#1f5866',
  mask: '#07090b',
  board: '#040606',
  metal: '#8a949c',
};

export const C = {
  ink: new Color(PALETTE.ink),
  copper: new Color(PALETTE.copper),
  copperDim: new Color(PALETTE.copperDim),
  signal: new Color(PALETTE.signal),
  signalDim: new Color(PALETTE.signalDim),
  white: new Color('#ffffff'),
};

export type Accent = 'copper' | 'signal' | 'ink';
export const accentColor = (a: Accent) => (a === 'copper' ? C.copper : a === 'signal' ? C.signal : C.ink);
