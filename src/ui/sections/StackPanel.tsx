import { sectionIndex } from '../../core/timeline';
import { useEffect, type KeyboardEvent } from 'react';
import { SectionTransition, r } from '../SectionTransition';
import { skillSystems } from '../../content/stack';
import { app, useApp } from '../../core/store';
import { selectSystem, stackInteraction } from '../../core/stackSelection';

const CYCLE_MS = 4200;
const PAUSE_AFTER_INPUT_MS = 10000;

/**
 * 03 — Technical stack. One stop: the six systems are switched in place — by tab, by
 * clicking a chiplet, or automatically — so a single swipe passes through the section.
 */
export function StackPanel() {
  const visible = useApp((s) => s.visibleSection === 'stack');
  const active = useApp((s) => s.stackActive);
  const reduced = useApp((s) => s.reducedMotion);
  const manual = useApp((s) => s.stackManual);
  const sys = skillSystems[active];

  // Auto-cycle while the section is on screen and the visitor isn't driving it.
  useEffect(() => {
    if (!visible || reduced) return;
    const id = window.setInterval(() => {
      if (app.get().stackManual) {
        if (performance.now() - stackInteraction.at > PAUSE_AFTER_INPUT_MS) app.set({ stackManual: false });
        return;
      }
      app.set({ stackActive: (app.get().stackActive + 1) % skillSystems.length });
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [visible, reduced]);

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    // Tab-list keyboard pattern; stop the page-level stop navigation from also firing.
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    e.stopPropagation();
    const n = skillSystems.length;
    const next = (active + (e.key === 'ArrowRight' ? 1 : n - 1)) % n;
    selectSystem(next);
    (e.currentTarget.querySelectorAll('button')[next] as HTMLButtonElement | undefined)?.focus();
  };

  const auto = visible && !reduced && !manual;

  return (
    <SectionTransition id="stack" label="Technical stack">
      <div className="side">
        <p className="tag" data-r style={r(0)}>
          <span className="tag__num">{sectionIndex('stack')}</span> TECHNICAL STACK
        </p>
        <div className="tabs" role="tablist" aria-label="Skill systems" data-r style={r(1)} onKeyDown={onTabKey}>
          {skillSystems.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={i === active}
              tabIndex={i === active ? 0 : -1}
              className={`tabs__tab${i === active ? ' is-active' : ''}`}
              onClick={() => selectSystem(i)}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              {s.code}
              {i === active && auto && <i key={`${active}-${visible}`} className="tabs__timer" aria-hidden="true" />}
            </button>
          ))}
        </div>
        <div key={sys.id} className="sub sub--swap" role="tabpanel" aria-label={sys.title}>
          <p className="meta" data-r style={r(1)}>
            SYS.{String(active + 1).padStart(2, '0')} · {sys.skills.length} PINS
          </p>
          <h2 className="side__title mask" data-m>
            <span>{sys.title}</span>
          </h2>
          <ul className="pins" aria-label={`${sys.title} skills`}>
            {sys.skills.map((skill, i) => (
              <li key={skill} data-r style={r(2 + i * 0.6)}>
                <span className="pins__num">P{String(i + 1).padStart(2, '0')}</span>
                <span className="pins__name">{skill}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionTransition>
  );
}
