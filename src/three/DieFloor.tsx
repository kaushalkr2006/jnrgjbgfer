import { useEffect, useMemo, useRef } from 'react';
import { Color, ShaderMaterial, UniformsLib, UniformsUtils, Vector3, type Mesh } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { shared } from './shared';
import { pointer } from '../core/pointer';
import { engine } from '../core/scroll';
import { frame } from '../core/ticker';
import { damp, easeInOutCubic, smoothstep } from '../core/math';

/**
 * The floor of the whole world: one procedural silicon die that every station sits on.
 * The plane follows the camera, but the pattern lives in world space, so it never swims.
 */
const SIZE = 150;
const FLOOR_Y = -0.02;
/** Extent of the opening's inspection scan along world X. */
const SCAN_HALF = 32;

const vertex = /* glsl */ `
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

/*
 * Procedural silicon die, rendered like macro photography rather than a diagram:
 * floorplan blocks (standard-cell rows, SRAM arrays, analog macros, metal fill), two
 * global routing layers and a power grid — every layer band-limited with fwidth so the
 * fine pitch never shimmers. A raking light gives metal its sheen, a thin-film term adds
 * the faint interference colour real dies show, and rare signal pulses travel the wires.
 */
const fragment = /* glsl */ `
uniform float uTime;
uniform float uIntro;
uniform vec3 uLight;
uniform float uScanHalf;
uniform float uFadeNear;
uniform float uFadeFar;
uniform vec3 uSignal;
uniform vec3 uBg;
varying vec3 vWorld;
#include <fog_pars_fragment>

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// Anti-aliased line family: distance to the nearest line centre at a given pitch.
// Fades to its average coverage once the pitch approaches pixel size (no moiré).
float lines(float c, float pitch, float width) {
  float fw = max(fwidth(c), 1e-5);
  float d = abs(fract(c / pitch + 0.5) - 0.5) * pitch;
  float a = 1.0 - smoothstep(width * 0.5 - fw * 0.5, width * 0.5 + fw * 0.5, d);
  float lod = smoothstep(0.18, 0.6, fw / pitch);
  return mix(a, clamp(width / pitch, 0.0, 1.0), lod);
}

void main() {
  // ~2.4 die units per world unit, offset so no strap sits under the camera axis
  vec2 p = vec2(vWorld.x, vWorld.z) * 2.4 + vec2(0.37, 0.53);

  // ---- floorplan ---------------------------------------------------------------------
  vec2 B = vec2(3.6, 2.7);
  vec2 bid = floor(p / B);
  vec2 bl = fract(p / B);
  float t = h21(bid);
  float t2 = h21(bid + 17.0);
  vec2 edge = min(bl, 1.0 - bl) * B;
  float gutter = 1.0 - smoothstep(0.05, 0.05 + fwidth(p.x) * 1.5, min(edge.x, edge.y));

  vec3 si = vec3(0.010, 0.012, 0.015);
  vec3 col = si;
  float metal = 0.0; // fraction of reflective metal at this pixel

  if (t < 0.46) {
    // standard-cell rows with hashed cell boundaries
    float rowPitch = 0.055;
    float row = floor(p.y / rowPitch);
    float rails = lines(p.y, rowPitch, 0.008);
    float cellW = 0.035 + h21(vec2(row, bid.x)) * 0.09;
    float cells = lines(p.x + h21(vec2(row, 3.0)) * 0.3, cellW, 0.004) * 0.6;
    col += vec3(0.008, 0.009, 0.011) + vec3(0.025, 0.027, 0.03) * cells;
    metal += rails * 0.55;
  } else if (t < 0.7) {
    // SRAM: dense bit-cell array with word / bit lines
    float g = max(lines(p.x, 0.032, 0.006), lines(p.y, 0.028, 0.006));
    float bits = lines(p.x, 0.016, 0.004) * lines(p.y, 0.014, 0.004);
    col += vec3(0.011, 0.011, 0.013) + vec3(0.035, 0.035, 0.038) * g + 0.025 * bits;
    metal += g * 0.35;
  } else if (t < 0.84) {
    // analog / IP macro: large guard rings and a few devices
    vec2 c = abs(bl - 0.5) * B;
    float r = max(c.x / B.x, c.y / B.y);
    float ring = lines(r, 0.035, 0.007) * step(0.39, r);
    col += vec3(0.006, 0.007, 0.008) + vec3(0.02) * ring;
    metal += ring * 0.35;
  } else {
    // dummy metal fill
    vec2 f = abs(fract(p / 0.11) - 0.5);
    float fill = 1.0 - smoothstep(0.26, 0.26 + fwidth(p.x / 0.11) * 1.2, max(f.x, f.y));
    fill = mix(fill, 0.22, smoothstep(0.2, 0.6, fwidth(p.x) / 0.11));
    col += vec3(0.005) + vec3(0.015) * fill;
    metal += fill * 0.4;
  }
  col *= 1.0 - gutter * 0.3;

  // ---- global routing (upper metal) + power grid --------------------------------------
  float hp = 0.21;
  float hRow = floor(p.y / hp + 0.5);
  float hSeg = floor(p.x / 2.9 + h21(vec2(hRow, 5.0)) * 4.0);
  float hOn = step(0.52, h21(vec2(hRow, hSeg)));
  float hLine = lines(p.y, hp, 0.016) * hOn;

  float vp = 0.27;
  float vCol = floor(p.x / vp + 0.5);
  float vSeg = floor(p.y / 2.3 + h21(vec2(vCol, 9.0)) * 4.0);
  float vOn = step(0.6, h21(vec2(vCol, vSeg)));
  float vLine = lines(p.x, vp, 0.016) * vOn;

  float power = max(lines(p.x, 1.8, 0.07), lines(p.y, 1.8, 0.07));
  float route = max(hLine, vLine);
  metal = max(metal, max(route, power * 1.2));

  // ---- lighting: raking key light on metal, thin-film sheen on the oxide -------------
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(uLight);
  vec3 N = normalize(vec3((t2 - 0.5) * 0.035, 1.0, (t - 0.5) * 0.035));
  vec3 H = normalize(L + V);
  float nh = max(dot(N, H), 0.0);
  float specBroad = pow(nh, 18.0);
  float specTight = pow(nh, 140.0);
  float fres = pow(1.0 - max(dot(V, N), 0.0), 4.0);

  vec3 film = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + dot(V, N) * 1.6 + t * 0.08));
  col += film * (0.004 + specBroad * 0.03) * (1.0 - metal);

  vec3 metalCol = mix(vec3(0.60, 0.58, 0.55), vec3(0.55, 0.60, 0.66), t2);
  col = mix(col, metalCol * (0.022 + specBroad * 0.3 + specTight * 2.4), metal * 0.9);
  col += vec3(0.05, 0.06, 0.07) * fres * 0.3;

  // ---- signal pulses: rare, short, precise ------------------------------------------
  float pulseLane = step(0.86, h21(vec2(hRow, hSeg + 41.0))) * hOn;
  float segX = fract(p.x / 2.9 + h21(vec2(hRow, 5.0)) * 4.0);
  float head = fract(uTime * 0.11 + h21(vec2(hRow, hSeg + 7.0)));
  float dd = head - segX;
  float tail = dd > 0.0 ? exp(-dd * 38.0) : 0.0;
  col += uSignal * tail * hLine * pulseLane * 1.6 * smoothstep(0.75, 1.0, uIntro);

  // ---- intro: an inspection scan sweeps the die into view ----------------------------
  float wx = vWorld.x;
  float front = mix(-uScanHalf - 6.0, uScanHalf + 6.0, smoothstep(0.0, 0.9, uIntro));
  float shown = 1.0 - smoothstep(front - 5.0, front, wx);
  float scan = exp(-abs(wx - front) * 2.2) * (1.0 - smoothstep(0.85, 1.0, uIntro));
  col = col * shown + uSignal * scan * 0.12;

  // ---- steep (top-down) views: keep the floor a quiet backdrop for the content -------
  float graze = 1.0 - abs(V.y);
  col *= mix(0.42, 1.0, smoothstep(0.12, 0.75, graze));

  // ---- distance fade into the background (clean horizon at any camera angle) ---------
  float dist = length(vWorld.xz - cameraPosition.xz);
  col = mix(uBg, col, 1.0 - smoothstep(uFadeNear, uFadeFar, dist));

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/**
 * A macro view of silicon under a raking light. On the opening an inspection scan reveals it,
 * the light follows the pointer, and every later section rests on the same surface.
 */
export function DieFloor() {
  const mesh = useRef<Mesh>(null);
  const camera = useThree((s) => s.camera);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          ...UniformsUtils.clone(UniformsLib.fog),
          uTime: shared.uTime,
          uIntro: shared.uIntro,
          uLight: { value: new Vector3(-0.6, 0.35, -1) },
          uScanHalf: { value: SCAN_HALF },
          uFadeNear: { value: 24 },
          uFadeFar: { value: 62 },
          uSignal: { value: new Color('#6ee7ff') },
          uBg: { value: new Color('#030405') },
        },
        fog: true,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  const light = useMemo(() => ({ az: -1.25, el: 0.32 }), []);
  useFrame(() => {
    if (mesh.current) mesh.current.position.set(camera.position.x, FLOOR_Y, camera.position.z);
    const dt = frame.dt;
    // Light sweeps in with the intro, then drifts and follows the pointer slightly.
    const intro = easeInOutCubic(smoothstep(0, 1, shared.uIntro.value));
    const t = shared.uTime.value;
    const follow = pointer.active && !engine.reduced ? pointer.x * 0.35 : 0;
    const targetAz = -1.25 + intro * 1.05 + Math.sin(t * 0.12) * 0.12 + follow;
    light.az = damp(light.az, targetAz, 2.5, dt);
    const el = light.el + (pointer.active ? -pointer.y * 0.06 : 0);
    (material.uniforms.uLight.value as Vector3).set(Math.sin(light.az) * Math.cos(el), Math.sin(el), -Math.cos(light.az) * Math.cos(el));
  });

  return (
    <mesh ref={mesh} material={material} rotation-x={-Math.PI / 2} position-y={FLOOR_Y} frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[SIZE, SIZE]} />
    </mesh>
  );
}
