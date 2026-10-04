import { useApp } from '../core/store';
import { engine } from '../core/scroll';
import { SECTIONS, STOPS } from '../core/timeline';
import { projects } from '../content/projects';

/** What the next swipe leads to, phrased for the cue. */
function nextLabel(stop: number) {
  const next = STOPS[stop + 1];
  if (!next) return null;
  const here = STOPS[stop];
  if (next.section === here.section) {
    if (next.section === 'projects') return `Next — Project ${String(projects[next.sub].index).padStart(2, '0')}`;
    return 'Scroll to continue';
  }
  const meta = SECTIONS.find((s) => s.id === next.section);
  return `Next — ${meta?.label ?? ''}`;
}

/**
 * The opening's "scroll to enter" cue, carried through every stop: a thin rule with a
 * travelling signal and a mono label naming where the next swipe goes. Click = next stop.
 */
export function ScrollCue() {
  const arrived = useApp((s) => s.arrived);
  const menuOpen = useApp((s) => s.menuOpen);
  // The opening has its own cue (timed with the intro); the final stop has "return to start".
  const visible = arrived > 0 && arrived < STOPS.length - 1 && !menuOpen;
  const label = visible ? nextLabel(arrived) : null;

  return (
    <button
      className="cue cue--global"
      data-on={visible}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => engine.step(1)}
    >
      <span className="cue__line" aria-hidden="true">
        <span />
      </span>
      <span key={label ?? ''} className="cue__label">
        {label}
      </span>
    </button>
  );
}
