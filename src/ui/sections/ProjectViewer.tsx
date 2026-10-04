import { Icon } from '../Icon';
import { sectionIndex } from '../../core/timeline';
import { SectionTransition, r } from '../SectionTransition';
import { projects, statusLabel } from '../../content/projects';
import { app, useApp } from '../../core/store';
import { firstStopOf } from '../../core/timeline';

const STOP = firstStopOf('projects');
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * 04 — Projects, on one page. All eight systems are listed at once; selecting one glides the
 * camera to that system in 3D and swaps the details in place. ←/→ also browse.
 */
export function ProjectViewer() {
  const active = useApp((s) => s.projectActive);
  const here = useApp((s) => s.arrived === STOP);
  const p = projects[active];
  const count = projects.length;
  const go = (i: number) => app.set({ projectActive: Math.max(0, Math.min(count - 1, i)) });

  return (
    <SectionTransition id="projects" label="Projects">
      <div className="side side--projects">
        <div className="prj-top" data-r style={r(0)}>
          <p className="tag">
            <span className="tag__num">{sectionIndex('projects')}</span> PROJECTS
          </p>
          <p className="prj-top__hint" aria-hidden="true">
            {pad(count)} SYSTEMS · <Icon name="left" size={10} /> <Icon name="right" size={10} /> TO BROWSE
          </p>
        </div>

        <ol className="prj-index" aria-label="All projects" data-r style={r(1)}>
          {projects.map((q, i) => (
            <li key={q.id}>
              <button
                type="button"
                className={`prj-index__item${i === active ? ' is-active' : ''}`}
                onClick={() => go(i)}
                aria-current={i === active}
              >
                <span className="prj-index__num">{pad(q.index)}</span>
                <span className="prj-index__title">{q.title}</span>
              </button>
            </li>
          ))}
        </ol>

        <article key={p.id} className="sub sub--swap prj" aria-live="polite" data-here={here}>
          <div className="prj__head" data-r style={r(2)}>
            <span className="prj__code">
              PRJ.{pad(p.index)} <span className="dim">/ {pad(count)}</span>
            </span>
            <span className={`status status--${p.status}`}>
              <span className="status__dot" aria-hidden="true" />
              {statusLabel[p.status]}
            </span>
          </div>
          <h2 className="side__title side__title--prj mask" data-m>
            <span>{p.title}</span>
          </h2>

          <p className="label prj__label" data-r style={r(3)}>
            SYSTEM VIEW
          </p>
          <ol className="chain" aria-label="System elements">
            {p.chain.map((c, i) => (
              <li key={c} data-r style={r(3.5 + i * 0.4)}>
                {c}
              </li>
            ))}
          </ol>

          <p className="label" data-r style={r(5.5)}>
            {p.techLabel}
          </p>
          <ul className="chips" aria-label={p.techLabel.toLowerCase()}>
            {p.tech.map((t, i) => (
              <li key={t} data-r style={r(6 + i * 0.3)}>
                {t}
              </li>
            ))}
          </ul>

          <div className="prj__nav" data-r style={r(7.5)}>
            <button className="cue cue--back" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous project">
              <span className="cue__line" aria-hidden="true">
                <span />
              </span>
              Prev
            </button>
            <button className="cue" onClick={() => go(active + 1)} disabled={active === count - 1} aria-label="Next project">
              <span className="cue__line" aria-hidden="true">
                <span />
              </span>
              Next — {active < count - 1 ? pad(projects[active + 1].index) : '—'}
            </button>
            {p.status === 'roadmap' && <span className="prj__note">Roadmap project — planned work, not a completed result.</span>}
          </div>
        </article>
      </div>
    </SectionTransition>
  );
}
