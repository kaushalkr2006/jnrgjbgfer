import { useRef } from 'react';
import { CatmullRomCurve3, Vector3, type PerspectiveCamera } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { STOPS, type Vec3 } from '../core/timeline';
import { engine } from '../core/scroll';
import { pointer } from '../core/pointer';
import { frame } from '../core/ticker';
import { telemetry } from '../core/telemetry';
import { Spring, clamp, damp, easeInOutCubic } from '../core/math';

const v = (a: Vec3) => new Vector3(a[0], a[1], a[2]);

/** Pre-built flight paths INTO each stop (camera + look target). */
const PATHS = STOPS.map((s, i) => {
  if (i === 0) return null;
  const prev = STOPS[i - 1];
  return {
    cam: new CatmullRomCurve3([v(prev.cam), ...(s.camVia ?? []).map(v), v(s.cam)], false, 'centripetal'),
    target: new CatmullRomCurve3([v(prev.target), ...(s.targetVia ?? []).map(v), v(s.target)], false, 'centripetal'),
  };
});


const pos = new Vector3();
const tgt = new Vector3();
const drift = new Vector3();
const right = new Vector3();
const up = new Vector3();
const last = new Vector3();

/**
 * Scroll-driven cinematic camera. Flies along per-stop curves using the staged timeline
 * (fast transition → hold), adds pointer parallax, velocity-based FOV and roll, and lens
 * shift so 3D subjects sit beside the information panels.
 */
export function CameraRig({ parallax }: { parallax: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const st = useRef({
    fovKick: 0,
    roll: 0,
    side: 0,
    px: new Spring(0, 40, 12),
    py: new Spring(0, 40, 12),
    init: false,
  });

  useFrame(() => {
    const s = st.current;
    const dt = frame.dt;
    const reduced = engine.reduced;
    const n = STOPS.length;
    const sf = engine.stopFloat;
    const i = Math.min(n - 1, Math.floor(sf));
    let f = sf - i;
    if (reduced) f = f < 0.5 ? 0 : 1;
    const next = Math.min(n - 1, i + 1);

    if (f <= 0 || i === n - 1) {
      pos.fromArray(STOPS[i].cam);
      tgt.fromArray(STOPS[i].target);
    } else if (f >= 1) {
      pos.fromArray(STOPS[next].cam);
      tgt.fromArray(STOPS[next].target);
    } else {
      const path = PATHS[next]!;
      path.cam.getPoint(f, pos);
      path.target.getPoint(f, tgt);
      pos.y += Math.sin(Math.PI * f) * (STOPS[next].arc ?? 0);
    }

    // Slow drift across a stop's hold region (and blend it back out on departure).
    drift.set(0, 0, 0);
    const cur = STOPS[engine.stop];
    if (engine.transRaw >= 1) {
      if (cur.drift) drift.fromArray(cur.drift).multiplyScalar(easeInOutCubic(engine.hold));
    } else if (engine.stop > 0) {
      const prev = STOPS[engine.stop - 1];
      if (prev.drift) drift.fromArray(prev.drift).multiplyScalar(1 - (reduced ? Math.round(engine.transE) : engine.transE));
    }
    pos.add(drift);

    // Portrait screens: pull back along the view axis so subjects still fit.
    const aspect = size.width / Math.max(1, size.height);
    const k = aspect < 1 ? clamp(0.66 / aspect, 1, 1.6) : aspect < 1.35 ? 1.12 : 1;
    pos.sub(tgt).multiplyScalar(k).add(tgt);

    camera.position.copy(pos);
    camera.lookAt(tgt);

    if (parallax && !reduced) {
      const px = s.px.step(pointer.active ? pointer.x : 0, dt);
      const py = s.py.step(pointer.active ? pointer.y : 0, dt);
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      camera.position.addScaledVector(right, px * 0.32).addScaledVector(up, -py * 0.2);
      camera.lookAt(tgt);
    }

    // Roll into lateral motion; widen FOV with scroll velocity (sense of speed).
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    const lateral = s.init ? right.dot(last.subVectors(camera.position, last)) / dt : 0;
    last.copy(camera.position);
    s.init = true;
    s.roll = damp(s.roll, reduced ? 0 : clamp(-lateral * 0.0035, -0.05, 0.05), 5, dt);
    camera.rotateZ(s.roll);

    const speed = Math.abs(engine.velocity) / engine.vh;
    s.fovKick = damp(s.fovKick, reduced ? 0 : Math.min(speed * 3.4, 7), 5, dt);
    const baseFov = aspect < 1 ? 50 : 42;
    camera.fov = baseFov + s.fovKick;

    // Lens shift: 'side' framing moves the subject right on desktop, up on portrait.
    const sideA = STOPS[i].framing === 'side' ? 1 : 0;
    const sideB = STOPS[next].framing === 'side' ? 1 : 0;
    const side = sideA + (sideB - sideA) * f;
    s.side = side;
    const W = size.width;
    const H = size.height;
    const wide = W >= 900;
    const offX = wide ? -0.13 * W * side : 0;
    const offY = wide ? 0 : 0.13 * H * side;
    camera.setViewOffset(W, H, offX, offY, W, H);
    camera.updateProjectionMatrix();

    // Keep matrices current so same-frame projections (spatial DOM labels) are exact.
    camera.updateMatrixWorld();

    telemetry.x = camera.position.x;
    telemetry.y = camera.position.y;
    telemetry.z = camera.position.z;
    telemetry.ready = true;
  }, -1);

  return null;
}
