import { useEffect, useMemo, type RefObject } from 'react';
import type { ShaderMaterial } from 'three';
import { buildRibbonGeometry, type TracePath } from '../geometry/ribbons';
import { traceMaterial, type TraceMaterialOptions } from '../materials/trace';

interface TracesProps extends TraceMaterialOptions {
  paths: TracePath[];
  level?: number;
  plane?: 'xz' | 'xy';
  materialRef?: RefObject<ShaderMaterial | null>;
  renderOrder?: number;
}

/** Any number of luminous traces in a single draw call. */
export function Traces({ paths, level = 0.004, plane = 'xz', materialRef, renderOrder = 2, ...material }: TracesProps) {
  const geometry = useMemo(() => buildRibbonGeometry(paths, level, plane), [paths, level, plane]);
  // Material options are read once on mount; animate through materialRef uniforms afterwards.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(() => traceMaterial(material), []);
  if (materialRef) materialRef.current = mat;
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => mat.dispose(), [mat]);
  return <mesh geometry={geometry} material={mat} renderOrder={renderOrder} />;
}
