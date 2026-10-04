import { Color, LineBasicMaterial, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { PALETTE } from '../shared';

/** Shared, cached materials — a handful of programs reused by every object. */
const cache = new Map<string, unknown>();
function memo<T>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
}

export const mats = {
  board: (color = PALETTE.board) =>
    memo(`board:${color}`, () => new MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.1, envMapIntensity: 0.14 })),
  chip: () => memo('chip', () => new MeshStandardMaterial({ color: '#08090b', roughness: 0.4, metalness: 0.3 })),
  pin: () => memo('pin', () => new MeshStandardMaterial({ color: '#5d666d', roughness: 0.38, metalness: 0.85 })),
  smd: () => memo('smd', () => new MeshStandardMaterial({ color: '#16191c', roughness: 0.55, metalness: 0.2 })),
  copper: () => memo('copper', () => new MeshStandardMaterial({ color: '#b56a35', roughness: 0.35, metalness: 0.85 })),
  rubber: () => memo('rubber', () => new MeshStandardMaterial({ color: '#0b0c0d', roughness: 0.6, metalness: 0.05 })),
  dark: () => memo('dark', () => new MeshStandardMaterial({ color: '#0a0c0e', roughness: 0.5, metalness: 0.3 })),
  edge: (color: string, opacity: number) =>
    memo(
      `edge:${color}:${opacity}`,
      () => new LineBasicMaterial({ color: new Color(color), transparent: true, opacity, depthWrite: false }),
    ),
  flat: (color: string, opacity = 1) =>
    memo(
      `flat:${color}:${opacity}`,
      () => new MeshBasicMaterial({ color: new Color(color), transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }),
    ),
};
