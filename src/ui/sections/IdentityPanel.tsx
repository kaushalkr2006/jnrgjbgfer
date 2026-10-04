import { useState } from 'react';
import { SectionTransition, r } from '../SectionTransition';
import { profile } from '../../content/profile';
import { engine } from '../../core/scroll';
import { useTick } from '../../core/ticker';
import { firstStopOf, sectionIndex } from '../../core/timeline';
import { stagedSteps } from '../../core/math';

const STOP = firstStopOf('identity');

/** 02 — Professional identity. The 3D keyword morphs; this panel indexes it and states direction. */
export function IdentityPanel() {
  const [word, setWord] = useState(0);
  useTick(() => {
    const w = Math.round(stagedSteps(engine.holdOf(STOP), profile.identity.keywords.length, 0.35));
    if (w !== word) setWord(w);
  });

  return (
    <SectionTransition id="identity" label="Professional identity">
      <div className="identity">
        <p className="tag" data-r style={r(0)}>
          <span className="tag__num">{sectionIndex('identity')}</span> IDENTITY
        </p>
        <h2 className="identity__heading mask" data-m>
          <span>{profile.identity.heading}</span>
        </h2>
        <div className="identity__copy">
          <p data-r style={r(2)}>{profile.identity.statement}</p>
          <p className="dim" data-r style={r(3)}>
            {profile.identity.support}
          </p>
        </div>
        <ol className="identity__keys" aria-label="Focus keywords">
          {profile.identity.keywords.map((k, i) => (
            <li key={k} className={i === word ? 'is-active' : ''} data-r style={r(3 + i)} aria-current={i === word}>
              <span className="identity__keynum">{String(i + 1).padStart(2, '0')}</span>
              {k}
            </li>
          ))}
        </ol>
      </div>
    </SectionTransition>
  );
}
