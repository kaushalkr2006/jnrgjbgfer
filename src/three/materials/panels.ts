import { Color, DoubleSide, NormalBlending, ShaderMaterial, UniformsLib, UniformsUtils } from 'three';
import { shared } from '../shared';

/**
 * Procedural instrument panels drawn entirely in a fragment shader:
 *  gantt — RTOS scheduler timeline (task lanes + ISR pre-emption)
 *  log   — scrolling system-log lines (abstract, no fabricated text)
 *  doc   — engineering document sheet (header, text rows, figure box)
 */
export const PANEL_MODE = { gantt: 0, log: 1, doc: 2 } as const;
export type PanelMode = keyof typeof PANEL_MODE;

const vertex = /* glsl */ `
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const fragment = /* glsl */ `
uniform int uMode;
uniform float uTime;
uniform float uSeed;
uniform float uHighlight;
uniform vec2 uAspect;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec3 uLine;
uniform vec3 uTint;
uniform float uOpacity;
varying vec2 vUv;
#include <fog_pars_fragment>
float hash(float n) { return fract(sin(n * 91.345 + uSeed * 17.17) * 43758.5453); }
float border(vec2 uv, float w) {
  vec2 d = fwidth(uv) * w;
  vec2 b = smoothstep(vec2(0.0), d, uv) * smoothstep(vec2(0.0), d, 1.0 - uv);
  return 1.0 - b.x * b.y;
}
void main() {
  vec3 col = uTint;
  float a = uOpacity;
  if (uMode == 0) {
    // 4 lanes: A, B, C, ISR (bottom). Time scrolls right-to-left.
    float lane = floor((1.0 - vUv.y) * 4.0);
    float ly = fract((1.0 - vUv.y) * 4.0);
    float xs = vUv.x * 16.0 + uTime * 2.0;
    float slot = floor(xs);
    float f = fract(xs);
    float task = mod(slot * 5.0 + floor(slot / 3.0), 3.0);
    bool isr = mod(slot, 7.0) == 3.0;
    float inLane = step(0.22, ly) * step(ly, 0.78);
    float blk = 0.0;
    vec3 c = uA;
    if (lane < 2.5) {
      float startF = isr ? 0.28 : 0.04;
      blk = (task == lane ? 1.0 : 0.0) * step(startF, f) * step(f, 0.96) * inLane;
      c = lane < 0.5 ? uA : lane < 1.5 ? uB : uC;
    } else {
      blk = (isr ? 1.0 : 0.0) * step(0.02, f) * step(f, 0.26) * inLane;
      c = uC * 1.4;
    }
    float fy4 = fract(vUv.y * 4.0);
    float sep = 1.0 - smoothstep(0.0, fwidth(vUv.y * 4.0) * 1.5, min(fy4, 1.0 - fy4));
    float now = 1.0 - smoothstep(0.0, fwidth(vUv.x) * 1.5, abs(vUv.x - 0.8));
    col += c * blk * 0.9 + uLine * (sep * 0.3 + now * 0.9);
  } else if (uMode == 1) {
    float rows = 13.0;
    float y = vUv.y * rows + uTime * 1.1;
    float row = floor(y);
    float fy = fract(y);
    float len = 0.25 + hash(row) * 0.65;
    float tag = step(vUv.x, 0.12) * step(0.08, vUv.x);
    float bar = step(0.18, vUv.x) * step(vUv.x, len) * step(0.3, fy) * step(fy, 0.7);
    float lvl = hash(row + 7.0);
    vec3 tc = lvl > 0.85 ? uC : lvl > 0.6 ? uB : uA;
    col += uLine * bar * 0.55 + tc * tag * step(0.3, fy) * step(fy, 0.7) * 0.9;
    col *= smoothstep(0.0, 0.12, vUv.y) * 0.6 + 0.4;
  } else {
    vec2 p = vUv;
    float hdr = step(0.86, p.y) * step(p.y, 0.95) * step(0.06, p.x) * step(p.x, 0.36);
    float rule = (1.0 - smoothstep(0.0, fwidth(p.y) * 1.2, abs(p.y - 0.82))) * step(0.06, p.x) * step(p.x, 0.94);
    float rows = 9.0;
    float ry = (0.78 - p.y) / 0.62 * rows;
    float row = floor(ry);
    float fy = fract(ry);
    float len = 0.35 + hash(row) * 0.5;
    float text = step(0.0, ry) * step(ry, rows) * step(0.06, p.x) * step(p.x, 0.06 + len * 0.52) * step(0.35, fy) * step(fy, 0.65);
    vec2 fig = (p - vec2(0.62, 0.2)) / vec2(0.32, 0.56);
    float figBox = border(clamp(fig, 0.0, 1.0), 1.2) * step(0.0, fig.x) * step(fig.x, 1.0) * step(0.0, fig.y) * step(fig.y, 1.0);
    float figWave = (1.0 - smoothstep(0.0, 0.035, abs(fig.y - 0.5 - 0.25 * sin(fig.x * 12.0 + uSeed)))) * step(0.04, fig.x) * step(fig.x, 0.96);
    float edge = border(p, 1.5);
    vec3 hi = mix(uLine, uA, uHighlight);
    col += uLine * (text * 0.5 + rule * 0.6) + uA * hdr * (0.4 + uHighlight * 0.6) + hi * (edge * (0.5 + uHighlight)) + uB * (figBox * 0.5 + figWave * 0.7);
    a = uOpacity * (0.82 + uHighlight * 0.18);
  }
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function panelMaterial(mode: PanelMode, o: { seed?: number; a?: string; b?: string; c?: string; opacity?: number } = {}) {
  return new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      uTime: shared.uTime,
      uMode: { value: PANEL_MODE[mode] },
      uSeed: { value: o.seed ?? 1 },
      uHighlight: { value: 0 },
      uAspect: { value: [1, 1] },
      uA: { value: new Color(o.a ?? '#6ee7ff') },
      uB: { value: new Color(o.b ?? '#eef1f3') },
      uC: { value: new Color(o.c ?? '#ff8a3d') },
      uLine: { value: new Color('#33505c') },
      uTint: { value: new Color('#05080a') },
      uOpacity: { value: o.opacity ?? 0.9 },
    },
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    side: DoubleSide,
    fog: true,
  });
}
