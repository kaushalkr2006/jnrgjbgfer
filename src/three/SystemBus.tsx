import { useMemo } from 'react';
import { Color } from 'three';
import { ANCHORS } from '../core/timeline';
import { projects } from '../content/projects';
import { offsetPolyline, type TracePath, type V2 } from './geometry/ribbons';
import { Traces } from './objects/Traces';
import { gridMaterial } from './materials/surfaces';
import { mulberry32 } from '../core/math';

/** Orthogonal + 45° route between two points travelling toward -Z. */
function route(a: V2, b: V2): V2[] {
  const dz = a[1] - b[1];
  const dx = b[0] - a[0];
  const s = Math.max(0, (dz - Math.abs(dx)) / 2);
  return [
    [a[0], a[1] - s],
    [b[0], a[1] - s - Math.abs(dx)],
    b,
  ];
}

function split(pts: V2[], chunk: number, rng: () => number): TracePath[] {
  // Resample into fixed-length chunks so pulses repeat frequently along a very long bus.
  const out: TracePath[] = [];
  let cur: V2[] = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let [ax, az] = pts[i - 1];
    const [bx, bz] = pts[i];
    let segLen = Math.hypot(bx - ax, bz - az);
    while (acc + segLen > chunk) {
      const t = (chunk - acc) / segLen;
      const p: V2 = [ax + (bx - ax) * t, az + (bz - az) * t];
      cur.push(p);
      out.push({ pts: cur, width: 0.05, seed: rng() });
      cur = [p];
      segLen -= chunk - acc;
      ax = p[0];
      az = p[1];
      acc = 0;
    }
    acc += segLen;
    cur.push([bx, bz]);
  }
  if (cur.length > 1) out.push({ pts: cur, width: 0.05, seed: rng() });
  return out;
}

/** Backbone bus linking every station into one continuous system. */
export function SystemBus() {
  const paths = useMemo(() => {
    const centers: V2[] = [
      [0, -30],
      [ANCHORS.identity[0], ANCHORS.identity[2]],
      [ANCHORS.stack[0], ANCHORS.stack[2]],
      ...projects.map((_, i) => [ANCHORS.project(i)[0], ANCHORS.project(i)[2]] as V2),
      [ANCHORS.flow[0], ANCHORS.flow[2]],
      [ANCHORS.career[0], ANCHORS.career[2]],
      [ANCHORS.evidence[0], ANCHORS.evidence[2]],
      [ANCHORS.system[0], ANCHORS.system[2]],
    ];
    const line: V2[] = [centers[0]];
    for (let i = 1; i < centers.length; i++) {
      for (const p of route(centers[i - 1], centers[i])) {
        const q = line[line.length - 1];
        if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-3) line.push(p);
      }
    }
    const rng = mulberry32(42);
    const out: TracePath[] = [];
    for (const off of [-0.66, -0.33, 0, 0.33, 0.66]) out.push(...split(offsetPolyline(line, off), 16, rng));
    return out;
  }, []);

  const floor = useMemo(
    () =>
      gridMaterial({
        size: [160, 580],
        cell: 2,
        majorEvery: 5,
        opacity: 0.32,
        fade: 0.92,
        color: new Color('#16222a'),
        majorColor: new Color('#1f3440'),
      }),
    [],
  );

  return (
    <group>
      <Traces
        paths={paths}
        level={-0.16}
        color={new Color('#123842')}
        pulseColor={new Color('#6ee7ff')}
        base={0.6}
        pulse={1.1}
        speed={7}
        pulseLen={1.4}
        gap={10}
      />
      <mesh material={floor} rotation-x={-Math.PI / 2} position={[15, -0.22, -250]} renderOrder={0}>
        <planeGeometry args={[160, 580]} />
      </mesh>
    </group>
  );
}
