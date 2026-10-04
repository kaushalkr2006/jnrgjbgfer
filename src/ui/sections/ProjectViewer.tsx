import { SectionTransition, r, useSectionSub } from '../SectionTransition';
import { projects, statusLabel } from '../../content/projects';
import { engine } from '../../core/scroll';

/** 04 — Projects. Info panel for the engineering system the camera is currently inside. */
export function ProjectViewer() {
  const { arrived, nearest, first, count } = useSectionSub('projects');
  const p = projects[nearest];
  const go = (i: number) => engine.toStop(first + Math.max(0, Math.min(count - 1, i)));

  return (
    <SectionTransition id="projects" label="Projects">
      <div className="side side--projects">
        <p className="tag" data-r style={r(0)}>
          <span className="tag__num">04</span> PROJECTS
        </p>
        <nav className="prj-rail" aria-label="Projects" data-r style={r(1)}>
          {projects.map((q, i) => (
            <button
              key={q.id}
              className={`prj-rail__item${i === nearest ? ' is-active' : ''}`}
              onClick={() => go(i)}
              aria-label={`Project ${q.index}: ${q.title}`}
              aria-current={i === nearest}
            >
              {String(q.index).padStart(2, '0')}
            </button>
          ))}
        </nav>

        <article key={p.id} className="sub prj" data-on={arrived === nearest} aria-live="polite">
          <div className="prj__head" data-r style={r(1)}>
            <span className="prj__code">
              PRJ.{String(p.index).padStart(2, '0')} <span className="dim">/ {String(count).padStart(2, '0')}</span>
            </span>
            <span className={`status status--${p.status}`}>
              <span className="status__dot" aria-hidden="true" />
              {statusLabel[p.status]}
            </span>
          </div>
          <h2 className="side__title side__title--prj mask" data-m>
            <span>{p.title}</span>
          </h2>

          <p className="label" data-r style={r(3)}>
            SYSTEM VIEW
          </p>
          <ol className="chain" aria-label="System elements">
            {p.chain.map((c, i) => (
              <li key={c} data-r style={r(3.5 + i * 0.5)}>
                {c}
              </li>
            ))}
          </ol>

          <p className="label" data-r style={r(6)}>
            {p.techLabel}
          </p>
          <ul className="chips" aria-label={p.techLabel.toLowerCase()}>
            {p.tech.map((t, i) => (
              <li key={t} data-r style={r(6.5 + i * 0.35)}>
                {t}
              </li>
            ))}
          </ul>

          <div className="prj__nav" data-r style={r(8)}>
            {nearest > 0 && (
              <button className="cue cue--back" onClick={() => go(nearest - 1)} aria-label="Previous project">
                <span className="cue__line" aria-hidden="true">
                  <span />
                </span>
                Previous — {String(projects[nearest - 1].index).padStart(2, '0')}
              </button>
            )}
            {p.status === 'roadmap' && <span className="prj__note">Roadmap project — planned work, not a completed result.</span>}
          </div>
        </article>
      </div>
    </SectionTransition>
  );
}
