import { sectionIndex } from '../../core/timeline';
import { SectionTransition, r } from '../SectionTransition';
import { profile } from '../../content/profile';
import { useAnchorRef } from '../../core/anchors';

/** Port order matches the 3D station: three on the left (top → bottom), three on the right. */
const SIDE = (k: number) => (k < 3 ? 'left' : 'right');

function PortLabel({ k, text }: { k: number; text: string }) {
  const ref = useAnchorRef(`career-${k}`);
  return (
    <li ref={ref} className={`port port--${SIDE(k)}`} style={{ ['--d' as string]: `${(0.35 + (k + 5) / 9).toFixed(2)}s` }}>
      <div className="port__body" data-r>
        <span className="port__id">OUT.{k}</span>
        <span className="port__name">{text}</span>
      </div>
    </li>
  );
}

/** 06 — Career direction: target role directions anchored to the 3D output ports. */
export function CareerPanel() {
  return (
    <SectionTransition id="career" label="Career direction">
      <div className="career">
        <p className="tag" data-r style={r(0)}>
          <span className="tag__num">{sectionIndex('career')}</span> DIRECTION
        </p>
        <h2 className="career__heading mask" data-m>
          <span>{profile.career.heading}</span>
        </h2>
        <p className="career__caption dim" data-r style={r(2)}>
          {profile.career.caption}
        </p>
      </div>
      <ol className="ports" aria-label="Target role directions">
        {profile.career.directions.map((d, k) => (
          <PortLabel key={d} k={k} text={d} />
        ))}
      </ol>
    </SectionTransition>
  );
}
