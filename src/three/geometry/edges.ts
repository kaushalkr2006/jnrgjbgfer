import { BoxGeometry, BufferAttribute, BufferGeometry, EdgesGeometry } from 'three';

export interface BoxSpec {
  pos: [number, number, number];
  size: [number, number, number];
}

const unitEdges = new EdgesGeometry(new BoxGeometry(1, 1, 1));
const unitPos = unitEdges.getAttribute('position').array as Float32Array;

/** Merges the outline edges of many boxes into a single LineSegments geometry. */
export function boxEdges(boxes: BoxSpec[]) {
  const out = new Float32Array(unitPos.length * boxes.length);
  let o = 0;
  for (const b of boxes) {
    for (let i = 0; i < unitPos.length; i += 3) {
      out[o++] = unitPos[i] * b.size[0] + b.pos[0];
      out[o++] = unitPos[i + 1] * b.size[1] + b.pos[1];
      out[o++] = unitPos[i + 2] * b.size[2] + b.pos[2];
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(out, 3));
  g.computeBoundingSphere();
  return g;
}

/** Rectangle outline in the XZ plane (for flat frames, footprints, corner-less boxes). */
export function rectLines(w: number, d: number, y = 0, corner = 0) {
  const hw = w / 2;
  const hd = d / 2;
  const pts: number[] = [];
  if (corner > 0) {
    // Only corner brackets — a measurement / viewfinder look.
    const c = corner;
    const add = (x0: number, z0: number, x1: number, z1: number) => pts.push(x0, y, z0, x1, y, z1);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        add(sx * hw, sz * hd, sx * (hw - c), sz * hd);
        add(sx * hw, sz * hd, sx * hw, sz * (hd - c));
      }
    }
  } else {
    pts.push(-hw, y, -hd, hw, y, -hd, hw, y, -hd, hw, y, hd, hw, y, hd, -hw, y, hd, -hw, y, hd, -hw, y, -hd);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
  g.computeBoundingSphere();
  return g;
}
