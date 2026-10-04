import { AdditiveBlending, Color, ShaderMaterial, UniformsLib, UniformsUtils } from 'three';
import { shared } from '../shared';

/**
 * Instanced camera-facing glow points (LEDs, nodes, pads). One draw call for any number of
 * glows; optional per-instance reveal delay and flicker.
 */
const vertex = /* glsl */ `
attribute vec3 aOffset;
attribute float aSize;
attribute float aPhase;
attribute float aDelay;
uniform float uTime;
uniform float uReveal;
uniform float uFlicker;
uniform float uScale;
varying vec2 vUv;
varying float vI;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  float r = smoothstep(aDelay, aDelay + 0.12, uReveal);
  float flick = 1.0 - uFlicker * (0.5 + 0.5 * sin(uTime * 2.6 + aPhase * 6.2831));
  vI = r * flick;
  vec4 mvPosition = modelViewMatrix * vec4(aOffset, 1.0);
  mvPosition.xy += position.xy * aSize * uScale * (0.55 + 0.45 * r);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
varying float vI;
#include <fog_pars_fragment>
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float halo = exp(-d * d * 5.0) * (1.0 - smoothstep(0.75, 1.0, d));
  float core = exp(-d * d * 60.0);
  vec3 col = uColor * (halo * 0.7 + core * 1.6) * vI * uIntensity;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function glowMaterial(color: Color, intensity = 1, flicker = 0) {
  return new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      uTime: shared.uTime,
      uColor: { value: color.clone() },
      uIntensity: { value: intensity },
      uReveal: { value: 1 },
      uFlicker: { value: flicker },
      uScale: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: true,
  });
}
