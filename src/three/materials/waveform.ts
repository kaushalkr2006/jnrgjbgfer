import { AdditiveBlending, Color, DoubleSide, ShaderMaterial, UniformsLib, UniformsUtils } from 'three';
import { shared } from '../shared';

/** Waveform generators evaluated on the GPU (vertex shader builds a ribbon along the curve). */
export const WAVE = {
  sine: 0,
  clock: 1,
  digital: 2,
  uart: 3,
  noisy: 4,
  filtered: 5,
  adc: 6,
  analog: 7,
  strobe: 8,
} as const;
export type WaveType = keyof typeof WAVE;

const common = /* glsl */ `
uniform float uSeed;
uniform float uEdge;
uniform int uType;
float h1(float n) { return fract(sin(n * 12.9898 + uSeed * 78.233) * 43758.5453); }
float vnoise(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(h1(i), h1(i + 1.0), u) * 2.0 - 1.0;
}
float edgeMix(float a, float b, float f) { return mix(a, b, smoothstep(0.0, uEdge, f)); }
float bitv(float i) { return step(0.5, h1(i)); }
float uartBit(float frame, float i) {
  if (i < 0.5) return 0.0;
  if (i < 8.5) return bitv(frame * 13.0 + i);
  return 1.0;
}
float analogV(float x) { return 0.8 * sin(x * 3.14159) + 0.2 * sin(x * 9.0); }
float wave(float xs) {
  if (uType == 0) return sin(xs * 6.2831853);
  if (uType == 1) { float f = fract(xs); return (smoothstep(0.0, uEdge, f) - smoothstep(0.5, 0.5 + uEdge, f)) * 2.0 - 1.0; }
  if (uType == 2) { float i = floor(xs); return edgeMix(bitv(i - 1.0), bitv(i), fract(xs)) * 2.0 - 1.0; }
  if (uType == 3) {
    float frame = floor(xs / 13.0);
    float p = xs - frame * 13.0;
    float i = floor(p);
    float cur = uartBit(frame, i);
    float prev = i < 0.5 ? 1.0 : uartBit(frame, i - 1.0);
    return edgeMix(prev, cur, p - i) * 2.0 - 1.0;
  }
  if (uType == 4) return 0.55 * sin(xs * 3.14159) + 0.2 * sin(xs * 7.3 + 1.3) + 0.3 * vnoise(xs * 9.0) + 0.14 * vnoise(xs * 23.0);
  if (uType == 5) return 0.55 * sin(xs * 3.14159 - 0.22) + 0.16 * sin(xs * 7.3 + 0.8);
  if (uType == 6) {
    float s = floor(xs * 6.0);
    float a = floor(analogV((s - 1.0) / 6.0) * 4.0 + 0.5) / 4.0;
    float b = floor(analogV(s / 6.0) * 4.0 + 0.5) / 4.0;
    return mix(a, b, smoothstep(0.0, uEdge, fract(xs * 6.0)));
  }
  if (uType == 7) return analogV(xs);
  if (uType == 8) {
    float i = floor(xs);
    return edgeMix(step(0.72, h1(i - 1.0)), step(0.72, h1(i)), fract(xs)) * 2.0 - 1.0;
  }
  return 0.0;
}
`;

const vertex = /* glsl */ `
attribute float aX;
attribute float aSide;
uniform float uTime;
uniform float uWidth;
uniform float uAmp;
uniform float uFreq;
uniform float uSpeed;
uniform float uPhase;
uniform float uThick;
uniform float uDx;
varying float vX;
varying float vSide;
${common}
#include <fog_pars_vertex>
float xsOf(float x) { return x * uFreq + uTime * uSpeed + uPhase; }
void main() {
  vX = aX;
  vSide = aSide;
  vec2 p0 = vec2((aX - uDx - 0.5) * uWidth, wave(xsOf(aX - uDx)) * uAmp);
  vec2 p1 = vec2((aX - 0.5) * uWidth, wave(xsOf(aX)) * uAmp);
  vec2 p2 = vec2((aX + uDx - 0.5) * uWidth, wave(xsOf(aX + uDx)) * uAmp);
  vec2 t = normalize(p2 - p0 + vec2(1e-5, 0.0));
  vec2 n = vec2(-t.y, t.x);
  vec3 pos = vec3(p1 + n * aSide * uThick, 0.0);
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uGlow;
varying float vX;
varying float vSide;
#include <fog_pars_fragment>
void main() {
  float core = exp(-vSide * vSide * 16.0);
  float halo = exp(-vSide * vSide * 2.5) * uGlow;
  float ends = smoothstep(0.0, 0.04, vX) * smoothstep(1.0, 0.96, vX);
  vec3 col = uColor * (core * 1.25 + halo * 0.3);
  gl_FragColor = vec4(col * ends * uOpacity, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export interface WaveformOptions {
  type?: WaveType;
  color?: Color;
  width?: number;
  amp?: number;
  freq?: number;
  speed?: number;
  phase?: number;
  thick?: number;
  seed?: number;
  edge?: number;
  glow?: number;
  opacity?: number;
  segments: number;
}

export function waveformMaterial(o: WaveformOptions) {
  return new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      uTime: shared.uTime,
      uType: { value: WAVE[o.type ?? 'sine'] },
      uColor: { value: (o.color ?? new Color('#6ee7ff')).clone() },
      uWidth: { value: o.width ?? 4 },
      uAmp: { value: o.amp ?? 0.5 },
      uFreq: { value: o.freq ?? 3 },
      uSpeed: { value: o.speed ?? 0.6 },
      uPhase: { value: o.phase ?? 0 },
      uThick: { value: o.thick ?? 0.05 },
      uSeed: { value: o.seed ?? 1 },
      uEdge: { value: o.edge ?? 0.06 },
      uGlow: { value: o.glow ?? 1 },
      uOpacity: { value: o.opacity ?? 1 },
      uDx: { value: 1 / o.segments },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    fog: true,
  });
}
