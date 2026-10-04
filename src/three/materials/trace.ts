import { AdditiveBlending, Color, DoubleSide, ShaderMaterial, UniformsLib, UniformsUtils } from 'three';
import { shared } from '../shared';

/**
 * Luminous PCB trace. Geometry carries per-vertex distance along the trace, so a single
 * draw call renders hundreds of traces that (a) route outward during a reveal and
 * (b) carry travelling signal pulses — entirely on the GPU.
 */
const vertex = /* glsl */ `
attribute float aDist;
attribute float aLen;
attribute float aSeed;
attribute float aSide;
varying float vDist;
varying float vLen;
varying float vSeed;
varying float vSide;
#include <fog_pars_vertex>
void main() {
  vDist = aDist;
  vLen = aLen;
  vSeed = aSeed;
  vSide = aSide;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const fragment = /* glsl */ `
uniform float uTime;
uniform float uReveal;
uniform float uStagger;
uniform vec3 uColor;
uniform vec3 uPulseColor;
uniform float uBase;
uniform float uPulse;
uniform float uSpeed;
uniform float uPulseLen;
uniform float uGap;
uniform float uOpacity;
varying float vDist;
varying float vLen;
varying float vSeed;
varying float vSide;
#include <fog_pars_fragment>
void main() {
  float front = uReveal - vSeed * uStagger;
  float shown = 1.0 - smoothstep(front - 0.3, front, vDist);
  if (shown <= 0.002) discard;
  float growing = step(front, vLen + 0.4);
  float head = exp(-max(front - vDist, 0.0) * 2.5) * growing;
  float cycle = vLen + uGap;
  float hp = mod(uTime * uSpeed + vSeed * 53.17, cycle);
  float dd = hp - vDist;
  float pulse = dd >= 0.0 ? exp(-dd / uPulseLen) : 0.0;
  float edge = 1.0 - smoothstep(0.3, 1.0, abs(vSide));
  vec3 col = uColor * uBase + uPulseColor * (pulse * uPulse + head * 1.6);
  gl_FragColor = vec4(col * edge * shown * uOpacity, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export interface TraceMaterialOptions {
  color?: Color;
  pulseColor?: Color;
  base?: number;
  pulse?: number;
  speed?: number;
  pulseLen?: number;
  gap?: number;
  stagger?: number;
  opacity?: number;
  /** Shared reveal uniform (world units of trace grown). Defaults to fully revealed. */
  reveal?: { value: number };
}

export type TraceMaterial = ShaderMaterial;

export function traceMaterial(o: TraceMaterialOptions = {}): TraceMaterial {
  return new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      uTime: shared.uTime,
      uReveal: o.reveal ?? { value: 1e5 },
      uColor: { value: (o.color ?? new Color('#7a3a14')).clone() },
      uPulseColor: { value: (o.pulseColor ?? new Color('#ff8a3d')).clone() },
      uBase: { value: o.base ?? 0.55 },
      uPulse: { value: o.pulse ?? 1.4 },
      uSpeed: { value: o.speed ?? 3.2 },
      uPulseLen: { value: o.pulseLen ?? 0.6 },
      uGap: { value: o.gap ?? 14 },
      uStagger: { value: o.stagger ?? 0 },
      uOpacity: { value: o.opacity ?? 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    fog: true,
  });
}
