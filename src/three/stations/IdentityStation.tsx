import { useEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
  type Group,
  type PerspectiveCamera,
} from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Station, useStationRef } from './Station';
import { ANCHORS, firstStopOf } from '../../core/timeline';
import { profile } from '../../content/profile';
import { engine } from '../../core/scroll';
import { mulberry32, smoothstep } from '../../core/math';
import { app } from '../../core/store';
import { frame } from '../../core/ticker';
import { shared, C } from '../shared';
import { rectLines } from '../geometry/edges';
import { mats } from '../objects/materials';

const FONT_PX = 150;
const tmpV = new Vector3();
const WORLD_PER_PX = 1.75 / FONT_PX;

/** Rasterise a word and return voxel centres (world units, centred). */
function sampleWord(word: string, cellPx: number) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const font = `800 ${FONT_PX}px "Geist Variable", system-ui, sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(word).width + FONT_PX * 0.3);
  const h = Math.ceil(FONT_PX * 1.15);
  canvas.width = w;
  canvas.height = h;
  ctx.font = font;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(word, FONT_PX * 0.15, h / 2);
  const data = ctx.getImageData(0, 0, w, h).data;
  const pts: [number, number][] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let y = cellPx / 2; y < h; y += cellPx) {
    for (let x = cellPx / 2; x < w; x += cellPx) {
      if (data[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] > 128) {
        pts.push([x, y]);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const out = pts.map(([x, y]) => [(x - cx) * WORLD_PER_PX, -(y - cy) * WORLD_PER_PX, 0] as [number, number, number]);
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { pts: out, width: (maxX - minX) * WORLD_PER_PX };
}

const vertex = /* glsl */ `
attribute vec3 aW0;
attribute vec3 aW1;
attribute vec3 aW2;
attribute vec3 aW3;
attribute vec3 aW4;
attribute vec3 aW5;
attribute float aRand;
uniform float uFrom;
uniform float uTo;
uniform float uMix;
uniform float uCell;
uniform float uSpread;
uniform float uWidth;
varying vec3 vNormal;
varying vec3 vLocal;
varying float vT;
varying float vX;
varying float vRand;
#include <fog_pars_vertex>
vec3 pick(float k) {
  if (k < 0.5) return aW0;
  if (k < 1.5) return aW1;
  if (k < 2.5) return aW2;
  if (k < 3.5) return aW3;
  if (k < 4.5) return aW4;
  return aW5;
}
mat3 rotX(float a) { float s = sin(a); float c = cos(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotY(float a) { float s = sin(a); float c = cos(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
void main() {
  vec3 A = pick(uFrom);
  vec3 B = pick(uTo);
  float xn = clamp(B.x / uWidth + 0.5, 0.0, 1.0);
  float delay = xn * uSpread * 0.75 + aRand * uSpread * 0.25;
  float t = clamp(uMix * (1.0 + uSpread) - delay, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  float arc = sin(t * 3.14159);
  vec3 p = mix(A, B, t);
  p.z += arc * (0.7 + aRand * 1.5);
  p.y += arc * (aRand - 0.5) * 0.5;
  mat3 R = aRand > 0.5 ? rotX(t * 3.14159) : rotY(t * 3.14159);
  float s = uCell * (1.0 - arc * 0.3);
  vec3 local = R * (position * vec3(0.84, 0.84, 1.4));
  vLocal = position;
  vNormal = normalize(normalMatrix * (R * normal));
  vT = arc;
  vX = xn;
  vRand = aRand;
  vec4 mvPosition = modelViewMatrix * vec4(p + local * s, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uHot;
uniform float uTime;
varying vec3 vNormal;
varying vec3 vLocal;
varying float vT;
varying float vX;
varying float vRand;
#include <fog_pars_fragment>
void main() {
  vec3 L = normalize(vec3(0.35, 0.75, 0.55));
  float diff = max(dot(vNormal, L), 0.0);
  float front = smoothstep(0.45, 0.9, vNormal.z);
  vec3 q = abs(vLocal) * 2.0;
  float rim = smoothstep(0.7, 0.96, max(q.x, q.y));
  float sweepPos = fract(uTime * 0.16) * 1.8 - 0.4;
  float sweep = exp(-pow((vX - sweepPos) * 6.0, 2.0));
  float flick = step(0.955, fract(sin(vRand * 913.17 + floor(uTime * 1.3)) * 43758.5453));
  vec3 base = vec3(0.03, 0.036, 0.042) + vec3(0.08, 0.095, 0.11) * diff;
  vec3 emit = uColor * front * (0.16 + rim * 0.5 + sweep * 0.85 + flick * 0.45) + uHot * vT * 1.3;
  gl_FragColor = vec4(base + emit, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

function VoxelWord({ cellPx }: { cellPx: number }) {
  const group = useRef<Group>(null);
  const station = useStationRef();
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const stop = firstStopOf('identity');

  const { geometry, maxWidth } = useMemo(() => {
    const words = profile.identity.keywords.map((wd) => sampleWord(wd, cellPx));
    const N = Math.max(...words.map((w) => w.pts.length));
    const rng = mulberry32(11);
    const g = new InstancedBufferGeometry();
    const box = new BoxGeometry(1, 1, 1);
    g.index = box.index;
    g.setAttribute('position', box.getAttribute('position'));
    g.setAttribute('normal', box.getAttribute('normal'));
    const scatter = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      scatter[i * 3] = (rng() - 0.5) * 22;
      scatter[i * 3 + 1] = (rng() - 0.5) * 9 - 1.5;
      scatter[i * 3 + 2] = -rng() * 14 + 2;
    }
    g.setAttribute('aW0', new InstancedBufferAttribute(scatter, 3));
    words.forEach((w, k) => {
      const arr = new Float32Array(N * 3);
      const c = w.pts.length;
      for (let i = 0; i < N; i++) arr.set(w.pts[Math.floor((i * c) / N)], i * 3);
      g.setAttribute(`aW${k + 1}`, new InstancedBufferAttribute(arr, 3));
    });
    const rand = new Float32Array(N);
    for (let i = 0; i < N; i++) rand[i] = rng();
    g.setAttribute('aRand', new InstancedBufferAttribute(rand, 1));
    g.instanceCount = N;
    return { geometry: g, maxWidth: Math.max(...words.map((w) => w.width)) };
  }, [cellPx]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          ...UniformsUtils.clone(UniformsLib.fog),
          uTime: shared.uTime,
          uFrom: { value: 0 },
          uTo: { value: 1 },
          uMix: { value: 0 },
          uCell: { value: cellPx * WORLD_PER_PX },
          uSpread: { value: 0.6 },
          uWidth: { value: maxWidth },
          uColor: { value: C.signal.clone() },
          uHot: { value: new Color('#ff8a3d') },
        },
        fog: true,
      }),
    [cellPx, maxWidth],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  const morph = useRef({ prev: 0, cur: 0, t: 1 });
  useFrame(() => {
    if (!station.current?.visible || !group.current) return;
    const u = material.uniforms;
    const arrival = engine.arrivalOf(stop);
    const assemble = smoothstep(0.3, 1, arrival);
    if (assemble < 1) {
      // Assemble from scattered cells into whichever keyword is current.
      const cur = app.get().identityWord;
      morph.current = { prev: cur, cur, t: 1 };
      u.uFrom.value = 0;
      u.uTo.value = 1 + cur;
      u.uMix.value = engine.reduced ? Math.round(assemble) : assemble;
    } else {
      // Morph from the previous keyword to the selected one over ~1.1 s.
      const m = morph.current;
      const w = app.get().identityWord;
      if (w !== m.cur) {
        m.prev = m.cur;
        m.cur = w;
        m.t = 0;
      }
      m.t = engine.reduced ? 1 : Math.min(1, m.t + frame.dt / 1.1);
      u.uFrom.value = 1 + m.prev;
      u.uTo.value = 1 + m.cur;
      u.uMix.value = m.t;
    }
    // Fit the word to the viewport width.
    const dist = camera.position.distanceTo(group.current.getWorldPosition(tmpV));
    const visibleW = 2 * dist * Math.tan(((camera.fov * Math.PI) / 180) / 2) * (size.width / size.height);
    group.current.scale.setScalar(Math.min(1, (visibleW * 0.78) / maxWidth));
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

/** 02 — Identity: keywords physically re-assemble from one word into the next. */
export function IdentityStation({ cellPx }: { cellPx: number }) {
  const brackets = useMemo(() => rectLines(12.5, 3.2, 0, 0.5), []);
  const base = ANCHORS.identity;
  return (
    <Station range={[firstStopOf('identity'), firstStopOf('identity')]} position={base}>
      <group position={[0, 2.75, 0]}>
        <VoxelWord cellPx={cellPx} />
        <lineSegments geometry={brackets} material={mats.edge('#eef1f3', 0.35)} rotation-x={Math.PI / 2} />
      </group>
    </Station>
  );
}
