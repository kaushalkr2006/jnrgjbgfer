import { SectionTransition, r, useSectionSub } from '../SectionTransition';
import { skillSystems } from '../../content/stack';
import { engine } from '../../core/scroll';

/** 03 — Technical stack. Each skill system is a chiplet; its skills are listed as a pin map. */
export function StackPanel() {
  const { arrived, nearest, first } = useSectionSub('stack');
  const sys = skillSystems[nearest];
  return (
    <SectionTransition id="stack" label="Technical stack">
      <div className="side">
        <p className="tag" data-r style={r(0)}>
          <span className="tag__num">03</span> TECHNICAL STACK
        </p>
        <div className="tabs" role="tablist" aria-label="Skill systems" data-r style={r(1)}>
          {skillSystems.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={i === nearest}
              className={`tabs__tab${i === nearest ? ' is-active' : ''}`}
              onClick={() => engine.toStop(first + i)}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              {s.code}
            </button>
          ))}
        </div>
        <div key={sys.id} className="sub" data-on={arrived === nearest}>
          <p className="meta" data-r style={r(1)}>
            SYS.{String(nearest + 1).padStart(2, '0')} · {sys.skills.length} PINS
          </p>
          <h2 className="side__title mask" data-m>
            <span>{sys.title}</span>
          </h2>
          <ul className="pins" aria-label={`${sys.title} skills`}>
            {sys.skills.map((skill, i) => (
              <li key={skill} data-r style={r(2 + i * 0.6)}>
                <span className="pins__num">P{String(i + 1).padStart(2, '0')}</span>
                <span className="pins__name">{skill}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionTransition>
  );
}
