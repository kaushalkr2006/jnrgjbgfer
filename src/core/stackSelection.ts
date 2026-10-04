import { app } from './store';

/** Time of the last manual system selection — pauses the auto-cycle for a while. */
export const stackInteraction = { at: 0 };

/** Select a skill system (from the tabs or by clicking a chiplet in 3D). */
export function selectSystem(k: number) {
  app.set({ stackActive: k, stackManual: true });
  stackInteraction.at = performance.now();
}
