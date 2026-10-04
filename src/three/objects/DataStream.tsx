import { useEffect, useMemo, type RefObject } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three';
import { shared } from '../shared';
import { mulberry32 } from '../../core/math';

const vertex = /* glsl */ `
attribute float aOffset;
attribute float aBit;
uniform vec3 uFrom;
uniform vec3 uTo;
uniform float uTime;
uniform float uSpeed;
uniform float uSize;
uniform float uArc;
uniform float uLevel;
varying float vBit;
varying float vFade;
#include <fog_pars_vertex>
void main() {
  float u = fract(aOffset + uTime * uSpeed);
  vec3 p = mix(uFrom, uTo, u);
  p.y += sin(u * 3.14159) * uArc;
  float fade = smoothstep(0.0, 0.1, u) * smoothstep(1.0, 0.88, u) * uLevel;
  vec3 s = vec3(uSize, uSize * (0.5 + aBit * 1.3), uSize) * fade;
  vBit = aBit;
  vFade = fade;
  vec4 mvPosition = modelViewMatrix * vec4(p + position * s, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uLow;
varying float vBit;
varying float vFade;
#include <fog_pars_fragment>
void main() {
  vec3 col = mix(uLow, uColor, vBit) * (0.5 + vFade);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

const box = new BoxGeometry(1, 1, 1);

interface DataStreamProps {
  from: [number, number, number];
  to: [number, number, number];
  count?: number;
  speed?: number;
  size?: number;
  arc?: number;
  color?: Color;
  low?: Color;
  seed?: number;
  materialRef?: RefObject<ShaderMaterial | null>;
}

/** Packets of bits travelling between two points (UART frames, sensor samples, bitstreams). */
export function DataStream({
  from,
  to,
  count = 24,
  speed = 0.12,
  size = 0.06,
  arc = 0,
  color = new Color('#6ee7ff'),
  low = new Color('#1d3d47'),
  seed = 3,
  materialRef,
}: DataStreamProps) {
  const geometry = useMemo(() => {
    const g = new InstancedBufferGeometry();
    g.index = box.index;
    g.setAttribute('position', box.getAttribute('position'));
    const rng = mulberry32(seed);
    const off = new Float32Array(count);
    const bit = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Grouped like framed packets: tight runs separated by gaps.
      const group = Math.floor(i / 8);
      off[i] = (group * 0.22 + (i % 8) * 0.018) % 1;
      bit[i] = rng() > 0.5 ? 1 : 0;
    }
    g.setAttribute('aOffset', new InstancedBufferAttribute(off, 1));
    g.setAttribute('aBit', new InstancedBufferAttribute(bit, 1));
    g.instanceCount = count;
    return g;
  }, [count, seed]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          ...UniformsUtils.clone(UniformsLib.fog),
          uTime: shared.uTime,
          uFrom: { value: new Vector3(...from) },
          uTo: { value: new Vector3(...to) },
          uSpeed: { value: speed },
          uSize: { value: size },
          uArc: { value: arc },
          uLevel: { value: 1 },
          uColor: { value: color.clone() },
          uLow: { value: low.clone() },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: true,
      }),
    [],
  );
  if (materialRef) materialRef.current = mat;
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => mat.dispose(), [mat]);
  return <mesh geometry={geometry} material={mat} frustumCulled={false} renderOrder={6} />;
}
