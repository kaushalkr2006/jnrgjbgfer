import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Matrix4, RingGeometry, type Group, type InstancedMesh } from 'three';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { generatePCB, type PCBOptions, type Rect } from './generate';
import { Traces } from '../objects/Traces';
import { Board } from '../objects/Board';
import { Chip, unitBox, type ChipKind } from '../objects/Chip';
import { mats } from '../objects/materials';
import { clamp, easeOutBack } from '../../core/math';

type GroupProps = Omit<ThreeElements['group'], 'ref'>;

export interface ChipSpec extends Rect {
  label?: string;
  kind?: ChipKind;
  pins?: number;
  height?: number;
  labelHeight?: number;
}

const ring = new RingGeometry(0.55, 1, 14).rotateX(-Math.PI / 2);

/** Animates a subtree rising out of the board, driven by a shared 0..1 uniform. */
export function RiseIn({
  rise,
  delay = 0,
  span = 0.28,
  axis = 'y',
  children,
  ...group
}: GroupProps & { rise?: { value: number }; delay?: number; span?: number; axis?: 'y' | 'all' }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g || !rise) return;
    const p = clamp((rise.value - delay) / span);
    const e = Math.max(0.0001, easeOutBack(p));
    g.visible = p > 0;
    if (axis === 'y') g.scale.set(1, e, 1);
    else g.scale.setScalar(e);
  });
  return (
    <group ref={ref} {...group}>
      {children}
    </group>
  );
}

interface PCBVisualizationProps extends GroupProps {
  size: [number, number];
  chips: ChipSpec[];
  seed: number;
  density?: number;
  options?: Partial<PCBOptions>;
  board?: boolean;
  boardColor?: string;
  grid?: boolean;
  /** Trace reveal uniform in world units (routing animation). */
  reveal?: { value: number };
  stagger?: number;
  /** Component rise uniform 0..1. */
  rise?: { value: number };
  traceColor?: Color;
  pulseColor?: Color;
  powerColor?: Color;
  speed?: number;
  pulse?: number;
  base?: number;
  /** Route around the chips but let the caller render them (for animated placement). */
  hideChips?: boolean;
}

/** Procedurally routed PCB: board, bundled traces, power routes, vias, passives and ICs. */
export function PCBVisualization({
  size,
  chips,
  seed,
  density = 1,
  options,
  board = true,
  boardColor,
  grid = true,
  reveal,
  stagger = 0,
  rise,
  traceColor = new Color('#5c2c10'),
  pulseColor = new Color('#ff8a3d'),
  powerColor = new Color('#ff8a3d'),
  speed = 3.2,
  pulse = 1.4,
  base = 0.55,
  hideChips = false,
  children,
  ...group
}: PCBVisualizationProps) {
  const [w, d] = size;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layout = useMemo(
    () => generatePCB({ bounds: { x0: -w / 2, x1: w / 2, z0: -d / 2, z1: d / 2 }, chips, seed, density, ...options }),
    [w, d, seed, density],
  );

  const viaRef = useRef<InstancedMesh>(null);
  const smdRef = useRef<InstancedMesh>(null);
  const capRef = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new Matrix4();
    const vm = viaRef.current;
    if (vm) {
      layout.vias.forEach((v, i) => {
        m.makeScale(v.r, 1, v.r);
        m.setPosition(v.x, 0.005, v.z);
        vm.setMatrixAt(i, m);
      });
      vm.instanceMatrix.needsUpdate = true;
      vm.computeBoundingSphere();
    }
    const sm = smdRef.current;
    const cm = capRef.current;
    if (sm && cm) {
      layout.smd.forEach((s, i) => {
        const along = s.w > s.d;
        const bodyW = along ? s.w * 0.62 : s.w;
        const bodyD = along ? s.d : s.d * 0.62;
        m.makeScale(bodyW, s.h, bodyD);
        m.setPosition(s.x, s.h / 2, s.z);
        sm.setMatrixAt(i, m);
        for (let k = 0; k < 2; k++) {
          const sgn = k === 0 ? -1 : 1;
          const capW = along ? s.w * 0.2 : s.w;
          const capD = along ? s.d : s.d * 0.2;
          m.makeScale(capW, s.h * 0.96, capD);
          m.setPosition(s.x + (along ? sgn * s.w * 0.4 : 0), s.h * 0.48, s.z + (along ? 0 : sgn * s.d * 0.4));
          cm.setMatrixAt(i * 2 + k, m);
        }
      });
      sm.instanceMatrix.needsUpdate = true;
      cm.instanceMatrix.needsUpdate = true;
      sm.computeBoundingSphere();
      cm.computeBoundingSphere();
    }
  }, [layout]);

  return (
    <group {...group}>
      {board && <Board size={size} color={boardColor} grid={grid} />}
      <Traces
        paths={layout.traces}
        reveal={reveal}
        stagger={stagger}
        color={traceColor}
        pulseColor={pulseColor}
        speed={speed}
        pulse={pulse}
        base={base}
      />
      {layout.power.length > 0 && (
        <Traces
          paths={layout.power}
          reveal={reveal}
          stagger={stagger}
          color={powerColor.clone().multiplyScalar(0.35)}
          pulseColor={powerColor}
          speed={speed * 0.7}
          pulse={0.8}
          base={0.8}
          level={0.005}
        />
      )}
      <RiseIn rise={rise} delay={0.35} axis="all">
        {layout.vias.length > 0 && (
          <instancedMesh ref={viaRef} args={[ring, mats.flat('#6b4224'), layout.vias.length]} />
        )}
      </RiseIn>
      <RiseIn rise={rise} delay={0.45}>
        {layout.smd.length > 0 && (
          <>
            <instancedMesh ref={smdRef} args={[unitBox, mats.smd(), layout.smd.length]} />
            <instancedMesh ref={capRef} args={[unitBox, mats.pin(), layout.smd.length * 2]} />
          </>
        )}
      </RiseIn>
      {!hideChips &&
        chips.map((c, i) => (
        <RiseIn key={i} rise={rise} delay={0.1 + Math.min(0.5, Math.hypot(c.x, c.z) / 60)} position={[c.x, 0, c.z]}>
          <Chip
            size={[c.w, c.d]}
            kind={c.kind}
            pins={c.pins}
            label={c.label}
            height={c.height}
            labelHeight={c.labelHeight}
          />
        </RiseIn>
      ))}
      {children}
    </group>
  );
}
