import { Vector3, type Object3D } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { RefObject } from 'react';
import { getAnchor } from '../core/anchors';

const v = new Vector3();
const last = new WeakMap<HTMLElement, { x: number; y: number }>();

/**
 * Projects local 3D points to screen space every frame and writes the result straight to
 * registered DOM labels (CSS variables --ax/--ay). Spatial UI with zero React renders.
 */
export function useProjectedAnchors(ids: string[], points: [number, number, number][], target: RefObject<Object3D | null>) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    const obj = target.current;
    if (!obj) return;
    let visible = true;
    for (let p: Object3D | null = obj; p; p = p.parent) {
      if (!p.visible) {
        visible = false;
        break;
      }
    }
    if (!visible) return;
    obj.updateWorldMatrix(true, false);
    for (let i = 0; i < ids.length; i++) {
      const el = getAnchor(ids[i]);
      if (!el) continue;
      v.fromArray(points[i]).applyMatrix4(obj.matrixWorld).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      const prev = last.get(el);
      // Skip style writes when the label has not moved (camera at rest).
      if (prev && Math.abs(prev.x - x) < 0.1 && Math.abs(prev.y - y) < 0.1) continue;
      last.set(el, { x, y });
      el.style.setProperty('--ax', `${x.toFixed(1)}px`);
      el.style.setProperty('--ay', `${y.toFixed(1)}px`);
    }
  });
}
