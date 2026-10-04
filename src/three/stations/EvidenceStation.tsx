import { useEffect, useMemo, useRef } from 'react';
import { PlaneGeometry, type Group, type ShaderMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import { Station, useStationRef } from './Station';
import { ANCHORS, firstStopOf } from '../../core/timeline';
import { evidence } from '../../content/profile';
import { app } from '../../core/store';
import { frame } from '../../core/ticker';
import { Spring } from '../../core/math';
import { panelMaterial } from '../materials/panels';
import { Label } from '../objects/Label';
import { Board } from '../objects/Board';

const SHEET = new PlaneGeometry(2.7, 1.75);

function Sheet({ k }: { k: number }) {
  const station = useStationRef();
  const g = useRef<Group>(null);
  const item = evidence[k];
  const mat = useMemo<ShaderMaterial>(() => panelMaterial('doc', { seed: k * 1.7 + 1, a: k % 3 === 2 ? '#ff8a3d' : '#6ee7ff' }), [k]);
  const spring = useRef(new Spring(0, 140, 17));
  useEffect(() => () => mat.dispose(), [mat]);

  useFrame(() => {
    if (!station.current?.visible || !g.current) return;
    const focus = app.get().evidenceFocus;
    const f = spring.current.step(focus === k ? 1 : 0, frame.dt);
    const n = evidence.length;
    g.current.position.set(-0.4 + k * 0.04 + f * 1.55, 0.45 + k * 0.135 + f * 0.25, -k * 0.24 + f * 1.1);
    g.current.rotation.set(-0.32 + f * 0.26, -f * 0.12, 0);
    mat.uniforms.uHighlight.value = f;
    mat.uniforms.uOpacity.value = 0.78 + f * 0.2 - (n - k) * 0.004;
  });

  return (
    <group ref={g}>
      <mesh geometry={SHEET} material={mat} renderOrder={40 - 2 * k} />
      <Label
        text={`EV-${String(k + 1).padStart(2, '0')}  ${item.code}`}
        height={0.1}
        align="left"
        order={41 - 2 * k}
        position={[-1.22, 0.74, 0.005]}
        tint={k % 3 === 2 ? '#ff8a3d' : '#9fdcea'}
      />
    </group>
  );
}

/** 07 — Evidence: a stacked engineering document register. */
export function EvidenceStation() {
  const stop = firstStopOf('evidence');
  return (
    <Station range={[stop, stop]} position={ANCHORS.evidence}>
      <Board size={[9, 6]} color="#050708" gridCell={0.3} edgeOpacity={0.12} position={[0.4, -0.02, -0.6]} />
      {evidence.map((_, k) => (
        <Sheet key={k} k={k} />
      ))}
    </Station>
  );
}
