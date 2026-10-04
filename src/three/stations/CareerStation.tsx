import { useMemo, useRef } from 'react';
import { RingGeometry, Color, type Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Station, useActivation } from './Station';
import { ANCHORS, firstStopOf } from '../../core/timeline';
import { profile } from '../../content/profile';
import { Chip } from '../objects/Chip';
import { Glows } from '../objects/Glows';
import { Traces } from '../objects/Traces';
import { offsetPolyline, type TracePath, type V2 } from '../geometry/ribbons';
import { rectLines } from '../geometry/edges';
import { mats } from '../objects/materials';
import { useProjectedAnchors } from '../useProjectedAnchors';
import { C } from '../shared';

const pad = new RingGeometry(0.6, 1, 24).rotateX(-Math.PI / 2);

export const CAREER_PORTS: [number, number][] = [
  [-4.2, -1.9],
  [-4.2, 0],
  [-4.2, 1.9],
  [4.2, -1.9],
  [4.2, 0],
  [4.2, 1.9],
];

/** 06 — Career direction: one core routes signals out to six target role "ports". */
export function CareerStation() {
  const stop = firstStopOf('career');
  const act = useActivation(stop);
  const group = useRef<Group>(null);
  const reveal = useMemo(() => ({ value: 0 }), []);
  const glowReveal = useMemo(() => ({ value: 0 }), []);
  const portFrame = useMemo(() => rectLines(0.8, 0.8, 0.01, 0.16), []);

  const paths = useMemo<TracePath[]>(() => {
    const out: TracePath[] = [];
    CAREER_PORTS.forEach(([px, pz], k) => {
      const s = Math.sign(px);
      const zs = pz * 0.24;
      const center: V2[] = [
        [s * 1.3, zs],
        [s * 1.8, zs],
        [s * (1.8 + Math.abs(pz - zs)), pz],
        [s * (Math.abs(px) - 0.5), pz],
      ];
      for (const o of [-0.14, 0, 0.14]) out.push({ pts: offsetPolyline(center, o * s), width: 0.05, seed: k / 5 });
    });
    return out;
  }, []);
  const ports = useMemo(() => CAREER_PORTS.map(([x, z]) => [x, 0.12, z] as [number, number, number]), []);
  const delays = useMemo(() => CAREER_PORTS.map((_, k) => (k + 5) / 14), []);
  const anchorIds = useMemo(() => profile.career.directions.map((_, k) => `career-${k}`), []);
  const anchorPts = useMemo(
    () => CAREER_PORTS.map(([x, z]) => [x + Math.sign(x) * 0.7, 0.1, z] as [number, number, number]),
    [],
  );
  useProjectedAnchors(anchorIds, anchorPts, group);

  useFrame(() => {
    const t = act.current.t;
    reveal.value = act.current.active || t > 0 ? Math.min(40, t * 9) : 0;
    glowReveal.value = reveal.value / 14;
  });

  return (
    <Station range={[stop, stop]} position={ANCHORS.career}>
      <group ref={group}>
        <Chip size={[2.4, 2.4]} kind="qfn" pins={7} label="ESE" labelHeight={0.45} edgeColor="#eef1f3" edgeOpacity={0.55} />
        <Traces paths={paths} reveal={reveal} stagger={5} color={new Color('#3a1c0a')} pulseColor={C.copper} speed={4} pulseLen={0.6} gap={4} />
        {ports.map((p, k) => (
          <group key={k} position={p}>
            <mesh geometry={pad} scale={0.26} material={mats.flat('#7a3a14')} />
            <lineSegments geometry={portFrame} material={mats.edge('#eef1f3', 0.35)} />
          </group>
        ))}
        <Glows points={ports} size={0.8} color={C.copper} intensity={1.2} delays={delays} reveal={glowReveal} />
      </group>
    </Station>
  );
}
