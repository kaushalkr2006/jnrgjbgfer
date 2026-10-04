export type Tier = 'high' | 'medium' | 'low';

export interface TierSettings {
  /** Device pixel ratio cap. The adaptive governor may lower the live value further. */
  dprMax: number;
  dprMin: number;
  antialias: boolean;
  /** Multiplier for procedural geometry density (traces, components, cells). */
  density: number;
  /** Canvas pixels per voxel when sampling words (lower = more voxels). */
  voxelPx: number;
  envMap: boolean;
  parallax: boolean;
}

export const TIERS: Record<Tier, TierSettings> = {
  high: { dprMax: 1.6, dprMin: 1, antialias: true, density: 1, voxelPx: 5, envMap: true, parallax: true },
  medium: { dprMax: 1.35, dprMin: 1, antialias: true, density: 0.7, voxelPx: 6, envMap: true, parallax: true },
  low: { dprMax: 1.5, dprMin: 0.85, antialias: false, density: 0.45, voxelPx: 7, envMap: false, parallax: false },
};

export interface DeviceProfile {
  tier: Tier;
  webgl: boolean;
  coarse: boolean;
}

function readParam(name: string) {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

/** Heuristic capability detection. `?tier=high|medium|low|none` overrides for testing. */
export function detectDevice(): DeviceProfile {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const forced = readParam('tier');
  if (forced === 'none') return { tier: 'low', webgl: false, coarse };

  let webgl = false;
  let software = false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (gl) {
      webgl = true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    webgl = false;
  }

  if (forced === 'high' || forced === 'medium' || forced === 'low') {
    return { tier: forced, webgl, coarse };
  }

  const w = window.innerWidth;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;

  let tier: Tier = 'high';
  if (software || w < 760 || (coarse && w < 900) || mem <= 2) tier = 'low';
  else if (coarse || w < 1100 || cores <= 4 || mem <= 4) tier = 'medium';

  return { tier, webgl, coarse };
}

export function prefersReducedMotion() {
  const forced = readParam('motion');
  if (forced === 'reduced') return true;
  if (forced === 'full') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
