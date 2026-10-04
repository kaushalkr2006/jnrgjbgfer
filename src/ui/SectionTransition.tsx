import type { CSSProperties, ReactNode } from 'react';
import { useApp } from '../core/store';
import { stopRangeOf, type SectionId } from '../core/timeline';
import { clamp } from '../core/math';

interface SectionTransitionProps {
  id: SectionId;
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * DOM side of a section. Visible only while the camera rests at one of the section's stops;
 * children marked with [data-r] / [data-m] reveal after a controlled pause and hide fast
 * when a transition starts. Hidden sections are inert (no focus, no screen-reader output).
 */
export function SectionTransition({ id, label, className = '', children }: SectionTransitionProps) {
  const on = useApp((s) => s.visibleSection === id);
  return (
    <section className={`panel panel--${id} ${className}`} data-on={on} aria-hidden={!on} inert={!on} aria-label={label}>
      {children}
    </section>
  );
}

/** Sub-stop state for multi-stop sections (stack systems, projects, flow tracks). */
export function useSectionSub(id: SectionId) {
  const [a, b] = stopRangeOf(id);
  const arrived = useApp((s) => (s.arrived >= a && s.arrived <= b ? s.arrived - a : -1));
  const nearest = useApp((s) => clamp(s.nearest - a, 0, b - a));
  return { arrived, nearest, first: a, count: b - a + 1 };
}

/** Stagger index helper for reveal children. */
export const r = (i: number): CSSProperties => ({ ['--i' as string]: i });
