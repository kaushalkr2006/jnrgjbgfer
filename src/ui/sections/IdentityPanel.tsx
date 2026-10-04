import { useEffect, useRef } from 'react';
import { Editorial } from '../Editorial';
import { SectionTransition, r } from '../SectionTransition';
import { profile } from '../../content/profile';
import { app, useApp } from '../../core/store';
import { sectionIndex } from '../../core/timeline';

const CYCLE_MS = 2300;
const PAUSE_AFTER_INPUT_MS = 8000;

/**
 * 02 — Professional identity. One stop: the 3D keyword morphs on a timer, and each keyword
 * in the index can be picked directly — no extra swipes.
 */
export function IdentityPanel() {
  const visible = useApp((s) => s.visibleSection === 'identity');
  const reduced = useApp((s) => s.reducedMotion);
  const word = useApp((s) => s.identityWord);
  const manualAt = useRef(0);
  const n = profile.identity.keywords.length;

  useEffect(() => {
    if (!visible || reduced) return;
    const id = window.setInterval(() => {
      if (performance.now() - manualAt.current < PAUSE_AFTER_INPUT_MS) return;
      app.set({ identityWord: (app.get().identityWord + 1) % n });
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [visible, reduced, n]);

  const pick = (i: number) => {
    manualAt.current = performance.now();
    app.set({ identityWord: i });
  };

  return (
    <SectionTransition id="identity" label="Professional identity">
      <div className="identity">
        <p className="tag" data-r style={r(0)}>
          <span className="tag__num">{sectionIndex('identity')}</span> IDENTITY
        </p>
        <h2 className="identity__heading mask" data-m>
          <span>
            <Editorial text={profile.identity.heading} />
          </span>
        </h2>
        <div className="identity__copy">
          <p data-r style={r(2)}>{profile.identity.statement}</p>
          <p className="dim" data-r style={r(3)}>
            {profile.identity.support}
          </p>
        </div>
        <ol className="identity__keys" aria-label="Focus keywords">
          {profile.identity.keywords.map((k, i) => (
            <li key={k} className={i === word ? 'is-active' : ''} data-r style={r(3 + i)}>
              <button type="button" onClick={() => pick(i)} aria-pressed={i === word}>
                <span className="identity__keynum">{String(i + 1).padStart(2, '0')}</span>
                {k}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </SectionTransition>
  );
}
