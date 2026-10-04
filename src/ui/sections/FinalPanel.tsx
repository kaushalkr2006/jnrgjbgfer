import { useState } from 'react';
import { SectionTransition } from '../SectionTransition';
import { profile } from '../../content/profile';
import { engine } from '../../core/scroll';
import { useTick } from '../../core/ticker';
import { firstStopOf } from '../../core/timeline';

const STOP = firstStopOf('system');

/** 08 — Final scene: once the system has converged, the identity resolves. Minimal. */
export function FinalPanel() {
  const [shown, setShown] = useState(false);
  useTick(() => {
    const v = engine.reduced ? engine.arrivalOf(STOP) >= 1 : engine.holdOf(STOP) > 0.6;
    if (v !== shown) setShown(v);
  });

  return (
    <SectionTransition id="system" label="System">
      <div className="final" data-on={shown}>
        <p className="tag final__tag" data-r>
          <span className="tag__num">08</span> SYSTEM INTEGRATED
        </p>
        <h2 className="final__name mask" data-m>
          <span>{profile.name}</span>
        </h2>
        <p className="final__field" data-r style={{ ['--i' as string]: 2 }}>
          {profile.field}
        </p>
        <p className="final__focus" data-r style={{ ['--i' as string]: 3 }}>
          {profile.primaryFocus[0]} <span className="hero__plus">+</span> {profile.primaryFocus[1]}
        </p>
        {profile.links.length > 0 && (
          <ul className="final__links" data-r style={{ ['--i' as string]: 4 }}>
            {profile.links.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        <button className="cue cue--back" data-r style={{ ['--i' as string]: 5 }} onClick={() => engine.toStop(0)}>
          <span className="cue__line" aria-hidden="true">
            <span />
          </span>
          Return to start
        </button>
      </div>
    </SectionTransition>
  );
}
