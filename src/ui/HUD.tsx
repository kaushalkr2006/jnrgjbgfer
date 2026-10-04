import { useMemo, useRef } from 'react';
import { useApp } from '../core/store';
import { engine } from '../core/scroll';
import { useTick } from '../core/ticker';
import { SECTIONS, STOPS, firstStopOf, sectionStops } from '../core/timeline';
import { telemetry } from '../core/telemetry';

/** Viewfinder marks, section readout, live camera coordinates and the progress rail. */
export function HUD() {
  const section = useApp((s) => s.section);
  const nearest = useApp((s) => s.nearest);
  const meta = SECTIONS.find((s) => s.id === section)!;
  const subs = sectionStops(section);
  const sub = STOPS[nearest].sub;
  const coords = useRef<HTMLSpanElement>(null);
  const last = useRef(0);

  useTick((t) => {
    if (!coords.current || t - last.current < 0.1) return;
    last.current = t;
    const p = telemetry;
    if (p.ready) coords.current.textContent = `X ${p.x.toFixed(2)}   Y ${p.y.toFixed(2)}   Z ${p.z.toFixed(2)}`;
  });

  return (
    <div className="hud" aria-hidden="true">
      <span className="hud__corner hud__corner--tl" />
      <span className="hud__corner hud__corner--tr" />
      <span className="hud__corner hud__corner--bl" />
      <span className="hud__corner hud__corner--br" />
      <div className="hud__section">
        <span className="hud__index">{meta.index}</span>
        <span className="hud__label">{meta.label}</span>
        {subs.length > 1 && (
          <span className="hud__sub">
            {String(sub + 1).padStart(2, '0')} / {String(subs.length).padStart(2, '0')}
          </span>
        )}
      </div>
      <div className="hud__coords">
        <span ref={coords}>X 0.00   Y 15.50   Z 5.50</span>
      </div>
      <ProgressRail />
    </div>
  );
}

function ProgressRail() {
  const fill = useRef<HTMLSpanElement>(null);
  const section = useApp((s) => s.section);
  const marks = useMemo(() => {
    const total = STOPS.reduce((a, s) => a + s.length, 0);
    let acc = 0;
    const starts = STOPS.map((s) => {
      const v = acc;
      acc += s.length;
      return v;
    });
    return SECTIONS.map((s) => {
      const i = firstStopOf(s.id);
      return { ...s, at: (starts[i] + STOPS[i].transition) / total, stop: i };
    });
  }, []);

  useTick(() => {
    if (fill.current) fill.current.style.transform = `scaleY(${engine.progress.toFixed(4)})`;
  });

  return (
    <nav className="rail" aria-label="Progress">
      <span className="rail__track">
        <span ref={fill} className="rail__fill" />
      </span>
      {marks.map((m) => (
        <button
          key={m.id}
          className={`rail__mark${m.id === section ? ' is-current' : ''}`}
          style={{ top: `${(m.at * 100).toFixed(2)}%` }}
          onClick={() => engine.toStop(m.stop)}
          aria-label={`Go to ${m.index} ${m.label}`}
          tabIndex={-1}
        >
          <span className="rail__tick" />
          <span className="rail__name">
            {m.index} {m.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
