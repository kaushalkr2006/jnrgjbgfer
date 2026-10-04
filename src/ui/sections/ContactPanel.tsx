import type { CSSProperties, ReactNode } from 'react';
import { SectionTransition } from '../SectionTransition';
import { Editorial } from '../Editorial';
import { profile, type ContactId } from '../../content/profile';
import { engine } from '../../core/scroll';
import { useApp } from '../../core/store';
import { firstStopOf, sectionIndex } from '../../core/timeline';

const STOP = firstStopOf('system');

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** Minimal line glyphs, drawn to match the site's technical style. */
const GLYPH: Record<ContactId, ReactNode> = {
  github: (
    <>
      <path d="M8 21c-3 1-3-1.5-4.5-2M15.5 21v-3.2a3 3 0 0 0-.8-2.3c2.7-.3 5.3-1.3 5.3-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6.2 0C6.6 2.8 5.6 3.1 5.6 3.1a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.2 9.5c0 4.6 2.7 5.7 5.3 6a3 3 0 0 0-.8 2.2V21" {...stroke} />
    </>
  ),
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" {...stroke} />
      <path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" {...stroke} />
    </>
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" {...stroke} />
      <circle cx="12" cy="12" r="4" {...stroke} />
      <path d="M17.5 6.5v.01" {...stroke} />
    </>
  ),
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" {...stroke} />
      <path d="M3.5 6l8.5 7 8.5-7" {...stroke} />
    </>
  ),
};

const display = (id: ContactId, handle: string) => {
  if (id === 'github') return `github.com/${handle}`;
  if (id === 'linkedin') return handle.startsWith('in/') ? `linkedin.com/${handle}` : handle;
  if (id === 'instagram') return handle.startsWith('@') ? handle : `@${handle}`;
  return handle;
};

/** 07 — Contact. Communication channels presented like I/O ports of the finished system. */
export function ContactPanel() {
  const shown = useApp((s) => s.arrived === STOP);
  const channels = profile.contact.filter((c) => c.href);

  return (
    <SectionTransition id="system" label="Contact">
      <div className="contact" data-on={shown}>
        <p className="tag" data-r>
          <span className="tag__num">{sectionIndex('system')}</span> CONTACT
        </p>
        <h2 className="contact__heading mask" data-m>
          <span>
            <Editorial text="OPEN A CHANNEL" />
          </span>
        </h2>

        <ul className="channels">
          {channels.map((c, i) => (
            <li key={c.id} data-r style={{ ['--i' as string]: 2 + i * 0.7 } as CSSProperties}>
              <a
                className="ch"
                href={c.href}
                target={c.id === 'email' ? undefined : '_blank'}
                rel={c.id === 'email' ? undefined : 'noreferrer noopener'}
                aria-label={`${c.label}: ${display(c.id, c.handle)}`}
              >
                <span className="ch__id">CH.{String(i + 1).padStart(2, '0')}</span>
                <svg className="ch__glyph" viewBox="0 0 24 24" aria-hidden="true">
                  {GLYPH[c.id]}
                </svg>
                <span className="ch__name">{c.label}</span>
                <span className="ch__handle">{display(c.id, c.handle)}</span>
                <svg className="ch__go" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 17L17 7M9 7h8v8" {...stroke} />
                </svg>
                <span className="ch__wire" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>

        <div className="contact__foot" data-r style={{ ['--i' as string]: 6 } as CSSProperties}>
          <p className="contact__sign">
            <span className="contact__name">{profile.name}</span>
            <span className="contact__field">{profile.field.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase())}</span>
          </p>
          <button className="cue cue--back" onClick={() => engine.toStop(0)}>
            <span className="cue__line" aria-hidden="true">
              <span />
            </span>
            Return to start
          </button>
        </div>
      </div>
    </SectionTransition>
  );
}
