import { SectionTransition } from '../SectionTransition';
import { ScrambleText } from '../ScrambleText';
import { useApp } from '../../core/store';
import { profile } from '../../content/profile';
import { engine } from '../../core/scroll';

/** 01 — Opening. The name resolves, the field and focus follow, then the system invites entry. */
export function HeroPanel() {
  const started = useApp((s) => s.introStarted);
  const reduced = useApp((s) => s.reducedMotion);
  return (
    <SectionTransition id="opening" label="Opening">
      <div className="hero" data-started={started}>
        <p className="hero__tag intro intro--1">
          <span className="dot" /> SYSTEM ONLINE
        </p>
        <h1 className="hero__name">
          <ScrambleText text={profile.name} start={started} delay={250} duration={1100} reduced={reduced} />
        </h1>
        <p className="hero__field intro intro--2">{profile.field}</p>
        <p className="hero__focus intro intro--3">
          <span>{profile.primaryFocus[0]}</span>
          <span className="hero__plus" aria-hidden="true">
            +
          </span>
          <span>{profile.primaryFocus[1]}</span>
        </p>
      </div>
      <button className="hero__cue intro intro--4" onClick={() => engine.step(1)}>
        <span className="hero__cue-line" aria-hidden="true">
          <span />
        </span>
        SCROLL TO ENTER THE SYSTEM
      </button>
    </SectionTransition>
  );
}
