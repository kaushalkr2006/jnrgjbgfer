import {
  AdditiveBlending,
  Color,
  DoubleSide,
  NormalBlending,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three';
import { shared } from '../shared';

const fogUniforms = () => UniformsUtils.clone(UniformsLib.fog);

/* ------------------------------------------------------------------------------------------ */
/* Technical grid — anti-aliased analytic lines with radial fade (floors, boards, interposer) */
/* ------------------------------------------------------------------------------------------ */

const gridVertex = /* glsl */ `
varying vec2 vUv;
varying vec2 vP;
uniform vec2 uSize;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vP = (uv - 0.5) * uSize;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const gridFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uMajorColor;
uniform float uCell;
uniform float uMajorEvery;
uniform float uOpacity;
uniform float uFade;
varying vec2 vUv;
varying vec2 vP;
#include <fog_pars_fragment>
float lineAA(vec2 p, float w) {
  vec2 d = fwidth(p);
  vec2 g = abs(fract(p - 0.5) - 0.5) / max(d, vec2(1e-5));
  float l = min(g.x, g.y);
  float aaFade = 1.0 - smoothstep(0.12, 0.45, max(d.x, d.y));
  return (1.0 - smoothstep(w - 0.5, w + 0.5, l)) * aaFade;
}
void main() {
  vec2 p = vP / uCell;
  float minor = lineAA(p, 0.6);
  float major = lineAA(p / uMajorEvery, 0.9);
  float r = length(vUv - 0.5) * 2.0;
  float fade = 1.0 - smoothstep(uFade, 1.0, r);
  vec3 col = uColor * minor * 0.5 + uMajorColor * major;
  gl_FragColor = vec4(col * fade * uOpacity, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function gridMaterial(o: {
  size: [number, number];
  cell?: number;
  majorEvery?: number;
  color?: Color;
  majorColor?: Color;
  opacity?: number;
  fade?: number;
}) {
  return new ShaderMaterial({
    vertexShader: gridVertex,
    fragmentShader: gridFragment,
    uniforms: {
      ...fogUniforms(),
      uSize: { value: o.size },
      uCell: { value: o.cell ?? 0.5 },
      uMajorEvery: { value: o.majorEvery ?? 5 },
      uColor: { value: (o.color ?? new Color('#1d2a33')).clone() },
      uMajorColor: { value: (o.majorColor ?? new Color('#2a3d4a')).clone() },
      uOpacity: { value: o.opacity ?? 1 },
      uFade: { value: o.fade ?? 0.35 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: true,
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Instrument screen — oscilloscope / logic-analyser graticule on a tinted glass panel         */
/* ------------------------------------------------------------------------------------------ */

const screenFragment = /* glsl */ `
uniform vec3 uTint;
uniform vec3 uLine;
uniform vec2 uDiv;
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;
varying vec2 vP;
#include <fog_pars_fragment>
float lineAt(float v, float w) {
  float d = fwidth(v);
  return 1.0 - smoothstep(w * d, (w + 1.0) * d, abs(fract(v - 0.5) - 0.5));
}
void main() {
  vec2 g = vUv * uDiv;
  float grid = max(lineAt(g.x, 0.5), lineAt(g.y, 0.5)) * 0.35;
  // centre axes with minor ticks
  vec2 c = abs(vUv - 0.5);
  float axis = (1.0 - smoothstep(0.0, fwidth(vUv.x) * 1.2, c.x)) + (1.0 - smoothstep(0.0, fwidth(vUv.y) * 1.2, c.y));
  float ticks = lineAt(vUv.x * uDiv.x * 5.0, 0.6) * step(c.y, 0.012) + lineAt(vUv.y * uDiv.y * 5.0, 0.6) * step(c.x, 0.008);
  float border = 1.0 - smoothstep(0.0, fwidth(vUv.x) * 1.5, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  float scan = 0.07 * smoothstep(0.965, 1.0, fract(vUv.y + uTime * 0.14));
  float l = clamp(grid + axis * 0.45 + ticks * 0.35 + border * 0.9, 0.0, 1.0);
  vec3 col = mix(uTint, uLine, l) + uLine * scan;
  float a = uOpacity * (0.82 + l * 0.18);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function screenMaterial(o: { size: [number, number]; div?: [number, number]; tint?: Color; line?: Color; opacity?: number }) {
  return new ShaderMaterial({
    vertexShader: gridVertex,
    fragmentShader: screenFragment,
    uniforms: {
      ...fogUniforms(),
      uTime: shared.uTime,
      uSize: { value: o.size },
      uDiv: { value: o.div ?? [10, 8] },
      uTint: { value: (o.tint ?? new Color('#05080a')).clone() },
      uLine: { value: (o.line ?? new Color('#2f4b57')).clone() },
      uOpacity: { value: o.opacity ?? 0.88 },
    },
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    side: DoubleSide,
    fog: true,
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Instanced cells — FPGA fabric, coverage bins, display pixels                                */
/* ------------------------------------------------------------------------------------------ */

export const CELL_MODE = { fabric: 0, coverage: 1, display: 2, memory: 3 } as const;
export type CellMode = keyof typeof CELL_MODE;

const cellVertex = /* glsl */ `
attribute vec2 aCell;
attribute float aRand;
uniform vec2 uDims;
uniform float uPitch;
varying vec2 vUv;
varying vec2 vCell;
varying float vRand;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vCell = aCell;
  vRand = aRand;
  vec2 o = (aCell - (uDims - 1.0) * 0.5) * uPitch;
  vec3 pos = vec3(position.x * uPitch + o.x, position.y, position.z * uPitch + o.y);
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const cellFragment = /* glsl */ `
uniform int uMode;
uniform float uTime;
uniform float uFill;
uniform float uLevel;
uniform vec2 uDims;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform vec3 uBase;
varying vec2 vUv;
varying vec2 vCell;
varying float vRand;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.31, 289.97))) * 43758.5453); }
void main() {
  vec2 q = abs(vUv - 0.5);
  float box = 1.0 - smoothstep(0.40, 0.46, max(q.x, q.y));
  float rim = smoothstep(0.30, 0.40, max(q.x, q.y)) * box;
  float lit = 0.0;
  vec3 hot = uColor;
  if (uMode == 0) {
    float region = floor(vCell.x / (uDims.x / 3.0));
    float phase = mod(floor(uTime * 0.7), 3.0);
    float act = region == phase ? 1.0 : 0.25;
    lit = step(0.55, hash(vCell + floor(uTime * 5.0 + vRand * 3.0))) * act;
  } else if (uMode == 1) {
    lit = step(vRand, uFill);
    hot = mix(uColor2, uColor, step(vRand, uFill - 0.08));
  } else if (uMode == 2) {
    float x = vCell.x / uDims.x;
    float y = vCell.y / uDims.y;
    float w = 0.5 + 0.32 * sin(x * 9.0 - uTime * 2.2) + 0.1 * sin(x * 23.0 + uTime);
    lit = 1.0 - smoothstep(0.0, 0.09, abs(y - w));
    lit = max(lit, step(0.985, hash(vCell + floor(uTime * 8.0))) * 0.5);
  } else {
    lit = step(0.62, hash(vCell * 1.7 + floor(uTime * 2.0 + vRand)));
  }
  lit *= uLevel;
  vec3 col = uBase * (box * 0.6 + rim * 0.8) + hot * lit * (box * 0.9 + rim * 0.5);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function cellMaterial(o: {
  mode: CellMode;
  dims: [number, number];
  pitch: number;
  color?: Color;
  color2?: Color;
  base?: Color;
}) {
  return new ShaderMaterial({
    vertexShader: cellVertex,
    fragmentShader: cellFragment,
    uniforms: {
      ...fogUniforms(),
      uTime: shared.uTime,
      uMode: { value: CELL_MODE[o.mode] },
      uDims: { value: o.dims },
      uPitch: { value: o.pitch },
      uFill: { value: 0 },
      uLevel: { value: 1 },
      uColor: { value: (o.color ?? new Color('#6ee7ff')).clone() },
      uColor2: { value: (o.color2 ?? new Color('#ff8a3d')).clone() },
      uBase: { value: (o.base ?? new Color('#16222a')).clone() },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    fog: true,
  });
}
