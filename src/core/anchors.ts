import { useCallback } from 'react';

/**
 * Registry linking DOM labels to 3D positions. The 3D side projects world positions to
 * screen space each frame and writes a transform directly to the element — spatial UI
 * without any React renders.
 */
const elements = new Map<string, HTMLElement>();

export const getAnchor = (id: string) => elements.get(id);

export function useAnchorRef(id: string) {
  return useCallback(
    (el: HTMLElement | null) => {
      if (el) elements.set(id, el);
      else elements.delete(id);
    },
    [id],
  );
}
