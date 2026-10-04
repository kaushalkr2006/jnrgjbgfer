import { BufferAttribute, BufferGeometry, Sphere, Vector3 } from 'three';

export type V2 = [number, number];

export interface TracePath {
  pts: V2[];
  width: number;
  /** 0..1 — used for pulse phase and staggered reveal. */
  seed: number;
}

function miterNormals(pts: V2[]) {
  const n = pts.length;
  const out: { nx: number; ny: number; scale: number }[] = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const cur = pts[i];
    const next = pts[Math.min(n - 1, i + 1)];
    let ax = cur[0] - prev[0];
    let ay = cur[1] - prev[1];
    let bx = next[0] - cur[0];
    let by = next[1] - cur[1];
    const la = Math.hypot(ax, ay) || 1;
    const lb = Math.hypot(bx, by) || 1;
    ax /= la;
    ay /= la;
    bx /= lb;
    by /= lb;
    if (i === 0) {
      ax = bx;
      ay = by;
    }
    if (i === n - 1) {
      bx = ax;
      by = ay;
    }
    // left normals of incoming/outgoing segments
    const n0x = -ay;
    const n0y = ax;
    const n1x = -by;
    const n1y = bx;
    let mx = n0x + n1x;
    let my = n0y + n1y;
    const lm = Math.hypot(mx, my) || 1;
    mx /= lm;
    my /= lm;
    const dot = Math.max(0.35, mx * n0x + my * n0y);
    out.push({ nx: mx, ny: my, scale: 1 / dot });
  }
  return out;
}

/** Offsets a polyline sideways (miter joins) — used to build parallel routed bundles. */
export function offsetPolyline(pts: V2[], offset: number): V2[] {
  const normals = miterNormals(pts);
  return pts.map((p, i) => [p[0] + normals[i].nx * offset * normals[i].scale, p[1] + normals[i].ny * offset * normals[i].scale]);
}

export function polylineLength(pts: V2[]) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

/**
 * Merges many polylines into one ribbon geometry (one draw call).
 * plane 'xz' lays the ribbons flat at height `level`; 'xy' stands them up at depth `level`.
 */
export function buildRibbonGeometry(paths: TracePath[], level = 0, plane: 'xz' | 'xy' = 'xz') {
  let verts = 0;
  let tris = 0;
  for (const p of paths) {
    if (p.pts.length < 2) continue;
    verts += p.pts.length * 2;
    tris += (p.pts.length - 1) * 2;
  }
  const position = new Float32Array(verts * 3);
  const aDist = new Float32Array(verts);
  const aLen = new Float32Array(verts);
  const aSeed = new Float32Array(verts);
  const aSide = new Float32Array(verts);
  const index = verts > 65535 ? new Uint32Array(tris * 3) : new Uint16Array(tris * 3);

  let v = 0;
  let t = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const path of paths) {
    const pts = path.pts;
    if (pts.length < 2) continue;
    const normals = miterNormals(pts);
    const total = polylineLength(pts);
    const half = path.width / 2;
    let dist = 0;
    const base = v;
    for (let i = 0; i < pts.length; i++) {
      if (i > 0) dist += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const { nx, ny, scale } = normals[i];
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? 1 : -1;
        const x = pts[i][0] + nx * half * scale * side;
        const y = pts[i][1] + ny * half * scale * side;
        if (plane === 'xz') {
          position[v * 3] = x;
          position[v * 3 + 1] = level;
          position[v * 3 + 2] = y;
        } else {
          position[v * 3] = x;
          position[v * 3 + 1] = y;
          position[v * 3 + 2] = level;
        }
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        aDist[v] = dist;
        aLen[v] = total;
        aSeed[v] = path.seed;
        aSide[v] = side;
        v++;
      }
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = base + i * 2;
      index[t++] = a;
      index[t++] = a + 1;
      index[t++] = a + 2;
      index[t++] = a + 1;
      index[t++] = a + 3;
      index[t++] = a + 2;
    }
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(position, 3));
  g.setAttribute('aDist', new BufferAttribute(aDist, 1));
  g.setAttribute('aLen', new BufferAttribute(aLen, 1));
  g.setAttribute('aSeed', new BufferAttribute(aSeed, 1));
  g.setAttribute('aSide', new BufferAttribute(aSide, 1));
  g.setIndex(new BufferAttribute(index, 1));
  if (verts > 0) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const r = Math.hypot(maxX - minX, maxY - minY) / 2 + 0.5;
    g.boundingSphere = new Sphere(plane === 'xz' ? new Vector3(cx, level, cy) : new Vector3(cx, cy, level), r);
  } else {
    g.boundingSphere = new Sphere(new Vector3(), 0.01);
  }
  return g;
}
