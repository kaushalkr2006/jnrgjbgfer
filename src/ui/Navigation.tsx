import { Icon } from './Icon';
import { useEffect, useRef, type RefObject } from 'react';
import { app, useApp } from '../core/store';
import { engine } from '../core/scroll';
import { SECTIONS, firstStopOf } from '../core/timeline';
import { profile } from '../content/profile';

/** Minimal fixed navigation: brand (home), motion toggle and the section index. */
export function Navigation() {
  const menuOpen = useApp((s) => s.menuOpen);
  const reduced = useApp((s) => s.reducedMotion);
  const section = useApp((s) => s.section);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <>
      <header className="nav">
        <button className="nav__brand" onClick={() => engine.toStop(0)} aria-label="Return to opening">
          <span className="nav__mark" aria-hidden="true" />
          <span>{profile.name}</span>
          <span className="nav__dim">/ ESE</span>
        </button>
        <div className="nav__right">
          <button
            className="nav__btn"
            onClick={() => app.set({ reducedMotion: !reduced })}
            aria-pressed={reduced}
            title="Toggle reduced motion"
          >
            <span className={`nav__led${reduced ? '' : ' is-on'}`} aria-hidden="true" />
            MOTION {reduced ? 'REDUCED' : 'FULL'}
          </button>
          <button
            ref={trigger}
            className="nav__btn nav__btn--index"
            onClick={() => app.set({ menuOpen: true })}
            aria-expanded={menuOpen}
            aria-controls="index-menu"
          >
            INDEX <span className="nav__dim">{SECTIONS.find((s) => s.id === section)?.index}/08</span>
          </button>
        </div>
      </header>
      <IndexMenu returnFocus={trigger} />
    </>
  );
}

function IndexMenu({ returnFocus }: { returnFocus: RefObject<HTMLButtonElement | null> }) {
  const open = useApp((s) => s.menuOpen);
  const section = useApp((s) => s.section);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!open) return;
    engine.lenis?.stop();
    const first = list.current?.querySelector<HTMLButtonElement>('button');
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      engine.lenis?.start();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    app.set({ menuOpen: false });
    returnFocus.current?.focus({ preventScroll: true });
  };

  return (
    <div id="index-menu" className="index" data-open={open} aria-hidden={!open} inert={!open} role="dialog" aria-label="Section index">
      <div className="index__head">
        <span>SYSTEM INDEX</span>
        <button className="nav__btn" onClick={close}>
          CLOSE <span className="nav__dim">ESC</span>
        </button>
      </div>
      <ol ref={list} className="index__list">
        {SECTIONS.map((s, i) => (
          <li key={s.id} style={{ ['--i' as string]: i }}>
            <button
              className={`index__item${s.id === section ? ' is-current' : ''}`}
              onClick={() => {
                app.set({ menuOpen: false });
                engine.toStop(firstStopOf(s.id));
              }}
            >
              <span className="index__num">{s.index}</span>
              <span className="index__label">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="index__hint">
        <Icon name="up" size={11} /> <Icon name="down" size={11} /> / SPACE — step through stops · HOME / END
      </p>
    </div>
  );
}
