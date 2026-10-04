import { mulberry32 } from '../../core/math';
import { offsetPolyline, type TracePath, type V2 } from '../geometry/ribbons';

/**
 * Procedural PCB router. Emits parallel trace bundles from component edges with 45° bends,
 * rejecting routes that collide with already-placed copper (occupancy grid), plus vias and
 * SMD passives in free space. Deterministic for a given seed.
 */

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface Via {
  x: number;
  z: number;
  r: number;
}

export interface Smd {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

export interface PCBLayout {
  traces: TracePath[];
  power: TracePath[];
  vias: Via[];
  smd: Smd[];
}

export interface PCBOptions {
  bounds: { x0: number; x1: number; z0: number; z1: number };
  chips: Rect[];
  keepout?: Rect[];
  seed: number;
  density?: number;
  bundlesPerSide?: [number, number];
  tracesPerBundle?: [number, number];
  maxLen?: number;
  freeBundles?: number;
  smdCount?: number;
  powerTraces?: number;
  width?: number;
  spacing?: number;
}

class Occupancy {
  private grid: Uint8Array;
  private nx: number;
  private nz: number;
  constructor(
    private x0: number,
    private z0: number,
    x1: number,
    z1: number,
    private cell: number,
  ) {
    this.nx = Math.ceil((x1 - x0) / cell) + 1;
    this.nz = Math.ceil((z1 - z0) / cell) + 1;
    this.grid = new Uint8Array(this.nx * this.nz);
  }
  private idx(x: number, z: number) {
    const i = Math.floor((x - this.x0) / this.cell);
    const j = Math.floor((z - this.z0) / this.cell);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return -1;
    return j * this.nx + i;
  }
  test(x: number, z: number) {
    const k = this.idx(x, z);
    return k < 0 || this.grid[k] === 1;
  }
  mark(x: number, z: number) {
    const k = this.idx(x, z);
    if (k >= 0) this.grid[k] = 1;
  }
  rect(r: Rect, pad: number, fn: (x: number, z: number) => boolean | void) {
    for (let x = r.x - r.w / 2 - pad; x <= r.x + r.w / 2 + pad; x += this.cell * 0.5) {
      for (let z = r.z - r.d / 2 - pad; z <= r.z + r.d / 2 + pad; z += this.cell * 0.5) {
        if (fn(x, z) === false) return false;
      }
    }
    return true;
  }
  markRect(r: Rect, pad = 0) {
    this.rect(r, pad, (x, z) => this.mark(x, z));
  }
  freeRect(r: Rect, pad = 0) {
    return this.rect(r, pad, (x, z) => !this.test(x, z));
  }
  walk(pts: V2[], skip: number, fn: (x: number, z: number) => boolean | void) {
    let travelled = 0;
    const step = this.cell * 0.45;
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1];
      const [bx, bz] = pts[i];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.ceil(len / step));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const d = travelled + len * t;
        if (d < skip) continue;
        if (fn(ax + (bx - ax) * t, az + (bz - az) * t) === false) return false;
      }
      travelled += len;
    }
    return true;
  }
}

const DIRS: V2[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function generatePCB(o: PCBOptions): PCBLayout {
  const rng = mulberry32(o.seed);
  const r = (a: number, b: number) => a + (b - a) * rng();
  const ri = (a: number, b: number) => Math.floor(r(a, b + 1));
  const density = o.density ?? 1;
  const sp = o.spacing ?? 0.2;
  const width = o.width ?? 0.06;
  const { x0, x1, z0, z1 } = o.bounds;
  const occ = new Occupancy(x0, z0, x1, z1, sp);
  const margin = 0.35;
  const inside = (p: V2) => p[0] > x0 + margin && p[0] < x1 - margin && p[1] > z0 + margin && p[1] < z1 - margin;

  for (const c of o.chips) occ.markRect(c, 0.05);
  for (const k of o.keepout ?? []) occ.markRect(k, 0);

  const traces: TracePath[] = [];
  const power: TracePath[] = [];
  const vias: Via[] = [];

  const route = (start: V2, dir: V2, maxLen: number): V2[] => {
    const perp: V2 = [-dir[1], dir[0]];
    const l1 = r(0.3, 1.4);
    const turn = rng() < 0.7 ? (rng() < 0.5 ? 1 : -1) : 0;
    const p1: V2 = [start[0] + dir[0] * l1, start[1] + dir[1] * l1];
    if (!turn) {
      const l3 = r(1, maxLen);
      return [start, p1, [p1[0] + dir[0] * l3, p1[1] + dir[1] * l3]];
    }
    const s = Math.SQRT1_2;
    const diag: V2 = [(dir[0] + perp[0] * turn) * s, (dir[1] + perp[1] * turn) * s];
    const l2 = r(0.5, 2.6);
    const p2: V2 = [p1[0] + diag[0] * l2, p1[1] + diag[1] * l2];
    const finalDir: V2 = rng() < 0.3 ? [perp[0] * turn, perp[1] * turn] : dir;
    const l3 = r(0.8, maxLen);
    return [start, p1, p2, [p2[0] + finalDir[0] * l3, p2[1] + finalDir[1] * l3]];
  };

  const tryBundle = (start: V2, dir: V2, n: number, maxLen: number, skip: number, startVia = false) => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const center = route(start, dir, maxLen * Math.pow(0.6, attempt));
      const lines: V2[][] = [];
      let ok = true;
      for (let j = 0; j < n && ok; j++) {
        const off = (j - (n - 1) / 2) * sp;
        const line = offsetPolyline(center, off);
        if (!line.every(inside)) ok = false;
        else if (!occ.walk(line, skip, (x, z) => !occ.test(x, z))) ok = false;
        lines.push(line);
      }
      if (!ok) continue;
      for (const line of lines) {
        occ.walk(line, 0, (x, z) => occ.mark(x, z));
        const end = line[line.length - 1];
        vias.push({ x: end[0], z: end[1], r: sp * 0.36 });
        if (startVia) vias.push({ x: line[0][0], z: line[0][1], r: sp * 0.36 });
        occ.mark(end[0], end[1]);
        traces.push({ pts: line, width, seed: rng() });
      }
      return true;
    }
    return false;
  };

  const [bMin, bMax] = o.bundlesPerSide ?? [1, 2];
  const [tMin, tMax] = o.tracesPerBundle ?? [3, 7];
  const maxLen = o.maxLen ?? 6;

  for (const chip of o.chips) {
    for (const dir of DIRS) {
      const along = dir[0] !== 0 ? chip.d : chip.w;
      const half = dir[0] !== 0 ? chip.w / 2 : chip.d / 2;
      const perp: V2 = [-dir[1], dir[0]];
      const nb = Math.max(0, Math.round(ri(bMin, bMax) * Math.min(1, along / 2.5) * (0.5 + density * 0.5)));
      for (let b = 0; b < nb; b++) {
        let n = Math.max(2, Math.round(ri(tMin, tMax) * (0.6 + density * 0.4)));
        n = Math.min(n, Math.floor((along * 0.8) / sp) + 1);
        const span = (n - 1) * sp;
        const room = Math.max(0, along / 2 - span / 2 - 0.12);
        const t = r(-room, room);
        const start: V2 = [chip.x + dir[0] * (half + 0.06) + perp[0] * t, chip.z + dir[1] * (half + 0.06) + perp[1] * t];
        tryBundle(start, dir, n, maxLen, 0.32);
      }
    }
  }

  const free = Math.round((o.freeBundles ?? 20) * density);
  let placed = 0;
  for (let k = 0; k < free * 5 && placed < free; k++) {
    if (traces.length > 2000) break;
    const start: V2 = [r(x0 + 1, x1 - 1), r(z0 + 1, z1 - 1)];
    if (occ.test(start[0], start[1])) continue;
    const dir = DIRS[ri(0, 3)];
    if (tryBundle(start, dir, ri(2, 4), maxLen * 0.8, 0, true)) {
      placed++;
    }
  }

  // Wider power routes along the board edges.
  const pw = o.powerTraces ?? 0;
  for (let k = 0; k < pw; k++) {
    const zEdge = k % 2 === 0 ? z0 + 0.7 + k * 0.32 : z1 - 0.7 - k * 0.32;
    const xa = r(x0 + 0.8, x0 + (x1 - x0) * 0.3);
    const xb = r(x1 - (x1 - x0) * 0.3, x1 - 0.8);
    const line: V2[] = [
      [xa, zEdge],
      [xb, zEdge],
    ];
    if (occ.walk(line, 0, (x, z) => !occ.test(x, z))) {
      occ.walk(line, 0, (x, z) => occ.mark(x, z));
      power.push({ pts: line, width: width * 2.6, seed: rng() });
    }
  }

  const smd: Smd[] = [];
  const smdTarget = Math.round((o.smdCount ?? 30) * density);
  for (let k = 0; k < smdTarget * 8 && smd.length < smdTarget; k++) {
    const big = rng() < 0.3;
    const rot = rng() < 0.5;
    const w = big ? 0.5 : 0.32;
    const d = big ? 0.26 : 0.16;
    const rect: Rect = { x: r(x0 + 0.6, x1 - 0.6), z: r(z0 + 0.6, z1 - 0.6), w: rot ? d : w, d: rot ? w : d };
    if (!occ.freeRect(rect, 0.06)) continue;
    occ.markRect(rect, 0.06);
    smd.push({ x: rect.x, z: rect.z, w: rect.w, d: rect.d, h: big ? 0.16 : 0.1 });
  }

  return { traces, power, vias, smd };
}
