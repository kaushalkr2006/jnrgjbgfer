import { SectionTransition, r, useSectionSub } from '../SectionTransition';
import { flowTracks } from '../../content/flow';
import { engine } from '../../core/scroll';
import { useAnchorRef } from '../../core/anchors';

/** Seconds until node i of an n-node lane lights in 3D (matches FlowStation's reveal rate). */
const nodeDelay = (i: number, n: number) => `${(0.15 + i / n / 0.55).toFixed(2)}s`;

function AnchoredHead({ k, first, code, title, active }: { k: number; first: number; code: string; title: string; active: boolean }) {
  const ref = useAnchorRef(`flow-h-${k}`);
  return (
    <button ref={ref} className="fa fa--head" onClick={() => engine.toStop(first + k)} tabIndex={-1} aria-hidden="true" data-active={active}>
      <span className="fa__code">{code}</span>
      <span className="fa__title">{title}</span>
    </button>
  );
}

function AnchoredNode({ k, i, n, text }: { k: number; i: number; n: number; text: string }) {
  const ref = useAnchorRef(`flow-${k}-${i}`);
  return (
    <span ref={ref} className="fa fa--node" style={{ ['--d' as string]: nodeDelay(i, n) }}>
      {text}
    </span>
  );
}

/** 05 — Engineering flow: a system map whose labels are pinned to the 3D lanes. */
export function FlowPanel() {
  const { arrived, nearest, first } = useSectionSub('flow');
  return (
    <SectionTransition id="flow" label="Engineering flow">
      <div className="flow">
        <div className="flow__head">
          <p className="tag" data-r style={r(0)}>
            <span className="tag__num">05</span> ENGINEERING FLOW
          </p>
          <h2 className="flow__title mask" data-m>
            <span>SYSTEM MAP</span>
          </h2>
        </div>

        {/* Spatial labels (desktop / tablet) */}
        <div className="flow__anchors" data-r style={r(1)} aria-hidden="true">
          {flowTracks.map((t, k) => (
            <div key={t.id} className={`fa-lane${k === nearest ? ' is-active' : ''}${k === nearest && arrived === k ? ' is-live' : ''}`}>
              <AnchoredHead k={k} first={first} code={t.code} title={t.title} active={k === nearest} />
              {t.steps.map((s, i) => (
                <AnchoredNode key={s} k={k} i={i} n={t.steps.length} text={s} />
              ))}
            </div>
          ))}
        </div>

        {/* Structured list (screen readers everywhere; the visible layout on mobile) */}
        <div className="flow__map" role="list" aria-label="Development tracks">
          {flowTracks.map((t, k) => {
            const active = k === nearest;
            return (
              <div
                key={t.id}
                role="listitem"
                className={`lane${active ? ' is-active' : ''}${active && arrived === k ? ' is-live' : ''}`}
                data-r
                style={{ ...r(1 + k * 0.6), ['--n' as string]: t.steps.length }}
              >
                <button className="lane__head" onClick={() => engine.toStop(first + k)} aria-current={active}>
                  <span className="lane__code">{t.code}</span>
                  <span className="lane__title">{t.title}</span>
                </button>
                <div className="lane__track">
                  <span className="lane__wire" aria-hidden="true">
                    <span className="lane__pulse" />
                  </span>
                  <ol className="lane__steps" aria-label={`${t.title} track`}>
                    {t.steps.map((s, i) => (
                      <li key={s} className="lane__node" style={{ ['--j' as string]: i }}>
                        <span className="lane__dot" aria-hidden="true" />
                        <span className="lane__label">{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionTransition>
  );
}
