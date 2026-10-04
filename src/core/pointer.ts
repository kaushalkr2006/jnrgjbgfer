/** Normalised mouse position (-1..1), shared by the camera rig for parallax. */
export const pointer = { x: 0, y: 0, active: false };

let bound = false;
export function bindPointer() {
  if (bound) return;
  bound = true;
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      pointer.active = true;
    },
    { passive: true },
  );
  document.addEventListener('mouseleave', () => {
    pointer.active = false;
  });
}
