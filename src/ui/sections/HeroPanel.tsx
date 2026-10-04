import type { CSSProperties } from 'react';
import { SectionTransition } from '../SectionTransition';
import { profile } from '../../content/profile';
import { engine } from '../../core/scroll';

const toTitle = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * 01 — Opening. An expanded variable display face that resolves from condensed-heavy to
 * wide-light letter by letter, a serif italic for the discipline, mono for the focus.
 */
export function HeroPanel() {
  return (
    <SectionTransition id="opening" label="Opening">
      <div className="hero">
        <p className="hero__kicker intro intro--1">
          <span className="hero__idx">01</span>
          <span className="hero__rule" aria-hidden="true" />
          Portfolio
        </p>
        <h1 className="hero__name" aria-label={profile.name}>
          {profile.name.split('').map((c, i) => (
            <span key={i} className="hero__char" style={{ ['--i' as string]: i } as CSSProperties} aria-hidden="true">
              <span>{c}</span>
            </span>
          ))}
        </h1>
        <p className="hero__tagline intro intro--2">{toTitle(profile.field)}</p>
        <p className="hero__lede intro intro--3">
          {profile.primaryFocus[0]} <span className="hero__plus">+</span> {profile.primaryFocus[1]}
        </p>
      </div>

      <dl className="hero__spec intro intro--3">
        <div>
          <dt>Supporting</dt>
          <dd>{profile.secondaryFocus.join(' · ')}</dd>
        </div>
      </dl>

      <button className="cue hero__cue intro intro--4" onClick={() => engine.step(1)}>
        <span className="cue__line" aria-hidden="true">
          <span />
        </span>
        Scroll to enter
      </button>
    </SectionTransition>
  );
}
