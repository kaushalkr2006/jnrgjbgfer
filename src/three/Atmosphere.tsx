import { useEffect } from 'react';
import { Color, FogExp2, PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useThree } from '@react-three/fiber';
import { PALETTE } from './shared';

/** Background, fog and restrained laboratory lighting. */
export function Atmosphere({ envMap }: { envMap: boolean }) {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    scene.background = new Color(PALETTE.bg);
    scene.fog = new FogExp2(PALETTE.bg, 0.028);
    if (!envMap) return;
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.22;
    pmrem.dispose();
    room.dispose();
    return () => {
      env.dispose();
      scene.environment = null;
    };
  }, [scene, gl, envMap]);

  return (
    <>
      <hemisphereLight args={['#a9bccb', '#040505', envMap ? 0.28 : 0.6]} />
      <directionalLight position={[6, 12, 8]} intensity={1.15} color="#eef4f8" />
      <directionalLight position={[-9, 5, -7]} intensity={0.6} color="#6ee7ff" />
    </>
  );
}
