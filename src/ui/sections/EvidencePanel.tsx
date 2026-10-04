import { sectionIndex } from '../../core/timeline';
import { Icon } from '../Icon';
import { useEffect, useRef, type ReactNode } from 'react';
import { SectionTransition, r } from '../SectionTransition';
import { evidence, type EvidenceKind } from '../../content/profile';
import { app, useApp } from '../../core/store';

/** Abstract document thumbnails — illustrate the artifact type, never fabricated data. */
function Preview({ kind }: { kind: EvidenceKind }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const lines = (n: number, x = 18, y = 30, gap = 13, w = [150, 120, 160, 90, 140, 110]) =>
    Array.from({ length: n }, (_, i) => <path key={i} d={`M${x} ${y + i * gap}h${w[i % w.length]}`} opacity={0.5} {...s} />);
  const body: Record<EvidenceKind, ReactNode> = {
    repo: (
      <>
        <path d="M40 30v80M40 60c0 20 60 10 60 30v20M100 30v30" {...s} />
        {[
          [40, 30],
          [40, 110],
          [100, 30],
          [100, 110],
          [40, 70],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={5} {...s} />
        ))}
        {lines(4, 130, 40, 18, [60, 45, 70, 50])}
      </>
    ),
    readme: (
      <>
        <path d="M18 24h90" {...s} strokeWidth={4} />
        {lines(6, 18, 46, 13)}
      </>
    ),
    code: (
      <>
        {[0, 14, 28, 28, 14, 28, 14, 0].map((ind, i) => (
          <path key={i} d={`M${24 + ind} ${26 + i * 12}h${50 + ((i * 37) % 80)}`} opacity={i % 3 === 0 ? 1 : 0.45} {...s} />
        ))}
      </>
    ),
    schematic: (
      <>
        <path d="M20 70h30l6-12 10 24 10-24 10 24 10-24 6 12h30" {...s} />
        <path d="M132 70h20M152 50v40M160 56v28" {...s} />
        <path d="M60 70v30M50 100h20M54 106h12M58 112h4" {...s} />
        <rect x="160" y="40" width="40" height="60" {...s} />
      </>
    ),
    arch: (
      <>
        <rect x="16" y="30" width="56" height="34" {...s} />
        <rect x="90" y="30" width="56" height="34" {...s} />
        <rect x="52" y="86" width="56" height="34" {...s} />
        <path d="M72 47h18M44 64v22h8M118 64v22h-10" {...s} />
        <rect x="164" y="30" width="40" height="90" {...s} opacity={0.5} />
      </>
    ),
    sim: (
      <>
        <path d="M14 40h14v-12h14v12h14v-12h14v12h14v-12h14v12h14v-12h14v12h14v-12h14v12h14" {...s} />
        <path d="M14 78h30v-14h40v14h20v-14h60v14h40" {...s} opacity={0.7} />
        <path d="M14 112h70v-12h12v12h110" {...s} opacity={0.5} />
      </>
    ),
    sensor: (
      <>
        <path d="M14 108h196M14 20v88" {...s} opacity={0.4} />
        <path d="M14 70l10-8 8 14 9-20 8 12 10-6 8 18 9-24 8 10 10-4 8 16 9-22 8 8 10 2 8-12 9 6 8-4 10 10 9-8 8 4" {...s} />
      </>
    ),
    pcb: (
      <>
        <rect x="80" y="44" width="50" height="50" {...s} />
        <path d="M80 56H54l-14-14H16M80 70H16M80 84H50l-12 12H16M130 60h28l16-16h30M130 78h74" {...s} />
        <circle cx="16" cy="42" r="3" {...s} />
        <circle cx="204" cy="44" r="3" {...s} />
      </>
    ),
    test: (
      <>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <rect x="18" y={24 + i * 20} width="10" height="10" {...s} />
            <path d={`M38 ${29 + i * 20}h${90 + ((i * 29) % 60)}`} opacity={0.5} {...s} />
          </g>
        ))}
      </>
    ),
    debug: (
      <>
        <circle cx="24" cy="58" r="5" fill="currentColor" />
        {lines(6, 40, 34, 12)}
        <path d="M36 58h170" {...s} opacity={0.9} strokeDasharray="4 4" />
      </>
    ),
    measure: (
      <>
        <rect x="14" y="18" width="196" height="104" {...s} opacity={0.5} />
        <path d="M112 18v104M14 70h196" {...s} opacity={0.3} />
        <path d="M14 70h196" {...s} opacity={0.9} strokeDasharray="2 6" />
        <text x="112" y="100" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none" opacity={0.7} letterSpacing="2">
          PENDING
        </text>
      </>
    ),
  };
  return (
    <svg viewBox="0 0 224 140" className="preview__svg" aria-hidden="true">
      {body[kind]}
    </svg>
  );
}

/** 07 — Portfolio evidence, presented as an engineering document register. */
export function EvidencePanel() {
  const visible = useApp((s) => s.visibleSection === 'evidence');
  const focus = useApp((s) => s.evidenceFocus);
  const reduced = useApp((s) => s.reducedMotion);
  const hovering = useRef(false);

  useEffect(() => {
    if (!visible) {
      app.set({ evidenceFocus: -1 });
      return;
    }
    app.set({ evidenceFocus: 0 });
    if (reduced) return;
    const id = window.setInterval(() => {
      if (hovering.current) return;
      app.set({ evidenceFocus: (app.get().evidenceFocus + 1) % evidence.length });
    }, 2600);
    return () => window.clearInterval(id);
  }, [visible, reduced]);

  const item = evidence[Math.max(0, focus)];
  const select = (i: number) => {
    hovering.current = true;
    app.set({ evidenceFocus: i });
  };
  const release = () => {
    hovering.current = false;
  };

  return (
    <SectionTransition id="evidence" label="Portfolio evidence">
      <div className="side side--evidence">
        <p className="tag" data-r style={r(0)}>
          <span className="tag__num">{sectionIndex('evidence')}</span> PORTFOLIO / EVIDENCE
        </p>
        <h2 className="side__title mask" data-m>
          <span>EVIDENCE REGISTER</span>
        </h2>
        <p className="dim evidence__caption" data-r style={r(2)}>
          The engineering evidence this portfolio is built to hold.
        </p>
        <div className="register" role="table" aria-label="Intended portfolio contents" data-r style={r(3)} onMouseLeave={release}>
          <div className="register__row register__row--head" role="row">
            <span role="columnheader">DOC</span>
            <span role="columnheader">TYPE</span>
            <span role="columnheader">ARTIFACT</span>
            <span role="columnheader">STATUS</span>
          </div>
          {evidence.map((e, i) => (
            <div
              key={e.id}
              role="row"
              tabIndex={0}
              className={`register__row${i === focus ? ' is-focus' : ''}`}
              onMouseEnter={() => select(i)}
              onFocus={() => select(i)}
              onBlur={release}
            >
              <span role="cell" className="register__id">
                EV-{String(i + 1).padStart(2, '0')}
              </span>
              <span role="cell" className="register__type">
                {e.code}
              </span>
              <span role="cell">{e.label}</span>
              <span role="cell" className="register__status">
                <Icon name="ring" size={10} /> PLANNED
              </span>
            </div>
          ))}
        </div>
        <div className="preview" data-r style={r(4)}>
          <div className="preview__head">
            <span>PREVIEW · {item.code}</span>
            <span className="dim">EV-{String(Math.max(0, focus) + 1).padStart(2, '0')}</span>
          </div>
          <Preview kind={item.kind} />
        </div>
      </div>
    </SectionTransition>
  );
}
