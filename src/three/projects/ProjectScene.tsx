import { useMemo, type ComponentType, type RefObject } from 'react';
import { Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { Station, useActivation, type Activation } from '../stations/Station';
import { app } from '../../core/store';
import { engine } from '../../core/scroll';
import { clamp } from '../../core/math';
import { cameraBias } from '../CameraRig';
import { ANCHORS } from '../../core/timeline';
import { statusLabel, type Project, type ProjectSceneKey } from '../../content/projects';
import { Label } from '../objects/Label';
import { rectLines } from '../geometry/edges';
import { mats } from '../objects/materials';
import { Stm32UartScene } from './scenes/Stm32UartScene';
import { ThermometerScene } from './scenes/ThermometerScene';
import { ImuFirScene } from './scenes/ImuFirScene';
import { FpgaDisplayScene } from './scenes/FpgaDisplayScene';
import { RtosNodeScene } from './scenes/RtosNodeScene';
import { PcbBuildScene } from './scenes/PcbBuildScene';
import { RtlVerifScene } from './scenes/RtlVerifScene';
import { FlagshipScene } from './scenes/FlagshipScene';

export interface SceneProps {
  act: RefObject<Activation>;
  density: number;
}

/** Data-driven registry: a project's `scene` key selects its engineering environment. */
const SCENES: Record<ProjectSceneKey, ComponentType<SceneProps>> = {
  stm32Uart: Stm32UartScene,
  thermometer: ThermometerScene,
  imuFir: ImuFirScene,
  fpgaDisplay: FpgaDisplayScene,
  rtosNode: RtosNodeScene,
  pcbBuild: PcbBuildScene,
  rtlVerif: RtlVerifScene,
  flagship: FlagshipScene,
};

/** Shared lab platform each project system sits on. */
function ProjectStage({ index, status }: { index: number; status: string }) {
  const brackets = useMemo(() => rectLines(11, 7.6, 0.01, 0.6), []);
  return (
    <group>
      <lineSegments geometry={brackets} material={mats.edge('#eef1f3', 0.35)} />
      <Label
        text={String(index).padStart(2, '0')}
        height={1.5}
        rotation-x={-Math.PI / 2}
        position={[-4.9, 0.01, 3.05]}
        align="left"
        weight={700}
        mono={false}
        tint="#eef1f3"
        opacity={0.07}
      />
      <Label
        text={`PRJ.${String(index).padStart(2, '0')} — ${status}`}
        height={0.16}
        rotation-x={-Math.PI / 2}
        position={[4.9, 0.01, 3.62]}
        align="right"
        tint="#7f8f99"
        opacity={0.8}
      />
    </group>
  );
}

export function ProjectScene({ project, stop, density }: { project: Project; stop: number; density: number }) {
  const i = project.index - 1;
  const act = useActivation(stop, () => app.get().projectActive === i);
  const Scene = SCENES[project.scene];
  return (
    <Station range={[stop, stop]} maxDistance={44} position={ANCHORS.project(i)}>
      <ProjectStage index={project.index} status={statusLabel[project.status].split(' ·')[0]} />
      <Scene act={act} density={density} />
    </Station>
  );
}

const home = new Vector3();
const there = new Vector3();

/**
 * The projects page is one stop: selecting a project glides the camera (pure translation)
 * from the first project's framing to the selected system's anchor.
 */
export function ProjectsFocus({ stop }: { stop: number }) {
  useFrame(() => {
    const near = clamp(1 - Math.abs(engine.stopFloat - stop));
    if (near <= 0) return;
    home.fromArray(ANCHORS.project(0));
    there.fromArray(ANCHORS.project(app.get().projectActive)).sub(home).multiplyScalar(near);
    cameraBias.pos.add(there);
    cameraBias.target.add(there);
  });
  return null;
}
