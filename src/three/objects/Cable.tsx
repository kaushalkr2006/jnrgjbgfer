import { useEffect, useMemo } from 'react';
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import { mats } from './materials';

interface CableProps {
  points: [number, number, number][];
  radius?: number;
}

/** Flexible cable / probe lead. */
export function Cable({ points, radius = 0.03 }: CableProps) {
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
    return new TubeGeometry(curve, 48, radius, 8, false);
  }, [points, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={mats.rubber()} />;
}
