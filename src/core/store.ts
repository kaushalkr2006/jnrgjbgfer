import { useSyncExternalStore } from 'react';
import type { SectionId } from './timeline';
import type { Tier } from './quality';

/**
 * Minimal external store. Only low-frequency, discrete state lives here (active stop, menu,
 * motion preference). Continuous per-frame values never go through React.
 */
export function createStore<T extends object>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(partial: Partial<T>) {
      let changed = false;
      for (const key in partial) {
        if (!Object.is(state[key], partial[key])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...partial };
      listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type Store<T extends object> = ReturnType<typeof createStore<T>>;

export function useStore<T extends object, S>(store: Store<T>, selector: (s: T) => S): S {
  const get = () => selector(store.get());
  return useSyncExternalStore(store.subscribe, get, get);
}

export interface AppState {
  /** Stop the camera is closest to. */
  nearest: number;
  /** Stop whose hold region we are in (camera arrived), or -1 while in transit. */
  arrived: number;
  /** Section whose panel should be visible, or null during cross-section transitions. */
  visibleSection: SectionId | null;
  /** Section of the nearest stop (used by navigation indicators). */
  section: SectionId;
  menuOpen: boolean;
  reducedMotion: boolean;
  tier: Tier;
  webgl: boolean;
  glReady: boolean;
  introStarted: boolean;
  evidenceFocus: number;
  /** Selected skill system in the technical stack. */
  stackActive: number;
  /** True after a manual selection, until the auto-cycle resumes. */
  stackManual: boolean;
}

export const app = createStore<AppState>({
  nearest: 0,
  arrived: 0,
  visibleSection: 'opening',
  section: 'opening',
  menuOpen: false,
  reducedMotion: false,
  tier: 'high',
  webgl: true,
  glReady: false,
  introStarted: false,
  evidenceFocus: -1,
  stackActive: 0,
  stackManual: false,
});

export const useApp = <S,>(selector: (s: AppState) => S) => useStore(app, selector);
