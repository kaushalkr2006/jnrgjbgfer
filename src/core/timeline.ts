import { projects } from '../content/projects';
import { skillSystems } from '../content/stack';
import { flowTracks } from '../content/flow';

/**
 * The timeline maps scroll distance to camera "stops". Every stop has a TRANSITION region
 * (camera travels in, content hidden) followed by a HOLD region (camera rests, content
 * revealed). Lengths are in viewport heights.
 */

export type SectionId =
  | 'opening'
  | 'identity'
  | 'stack'
  | 'projects'
  | 'flow'
  | 'career'
  | 'evidence'
  | 'system';

export interface SectionMeta {
  id: SectionId;
  index: string;
  label: string;
}

export const SECTIONS: SectionMeta[] = [
  { id: 'opening', index: '01', label: 'Opening' },
  { id: 'identity', index: '02', label: 'Identity' },
  { id: 'stack', index: '03', label: 'Technical Stack' },
  { id: 'projects', index: '04', label: 'Projects' },
  { id: 'flow', index: '05', label: 'Engineering Flow' },
  { id: 'career', index: '06', label: 'Direction' },
  { id: 'evidence', index: '07', label: 'Evidence' },
  { id: 'system', index: '08', label: 'System' },
];

export type Vec3 = [number, number, number];
export type Framing = 'center' | 'side';

export interface Stop {
  index: number;
  section: SectionId;
  sub: number;
  length: number;
  transition: number;
  cam: Vec3;
  target: Vec3;
  /** Optional waypoints for the camera / look-target on the way INTO this stop. */
  camVia?: Vec3[];
  targetVia?: Vec3[];
  /** Vertical arc added mid-flight. */
  arc?: number;
  /** Camera offset applied progressively across the hold region. */
  drift?: Vec3;
  framing: Framing;
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** World-space anchors for every station. The path snakes forward along -Z. */
export const ANCHORS = {
  opening: [0, 0, 0] as Vec3,
  identity: [0, 0, -40] as Vec3,
  stack: [24, 0, -80] as Vec3,
  project: (i: number): Vec3 => [24 + (i % 2 === 0 ? -6 : 6), 0, -126 - i * 28],
  flow: [0, 0, -378] as Vec3,
  career: [0, 0, -420] as Vec3,
  evidence: [0, 0, -458] as Vec3,
  system: [0, 0, -500] as Vec3,
};

/** Flow lanes run along X; these are their Z positions (top → bottom on screen). */
export const FLOW_LANE_Z = [-2.7, -0.9, 0.9, 2.7];

function buildStops(): Stop[] {
  const raw: Omit<Stop, 'index'>[] = [];

  raw.push({
    section: 'opening',
    sub: 0,
    length: 0.12,
    transition: 0,
    cam: [0, 15.5, 5.5],
    target: [0, 0, 0],
    framing: 'center',
  });

  // The opening dive: swoop down from the top view, skim the board, rise to the identity word.
  const id = ANCHORS.identity;
  raw.push({
    section: 'identity',
    sub: 0,
    length: 3.6,
    transition: 1.3,
    cam: add(id, [0, 3.1, 10.5]),
    target: add(id, [0, 2.75, 0]),
    camVia: [
      [0, 6.5, -2],
      [0.6, 1.25, -14],
      [0, 1.6, -24],
    ],
    targetVia: [
      [0, 0.2, -11],
      [0, 0.9, -26],
      [0, 2.2, -36],
    ],
    framing: 'center',
  });

  const st = ANCHORS.stack;
  skillSystems.forEach((_, k) => {
    raw.push({
      section: 'stack',
      sub: k,
      length: k === 0 ? 1.15 : 0.72,
      transition: k === 0 ? 0.7 : 0.34,
      cam: add(st, [(k - 2.5) * 0.2, 9.4, 14.6]),
      target: add(st, [0, 0.2, 0.9]),
      arc: k === 0 ? 3 : 0,
      framing: 'side',
    });
  });

  projects.forEach((_, i) => {
    const p = ANCHORS.project(i);
    raw.push({
      section: 'projects',
      sub: i,
      length: i === 0 ? 1.25 : 0.95,
      transition: i === 0 ? 0.75 : 0.5,
      cam: add(p, [-0.5, 4.0, 11.7]),
      target: add(p, [-0.85, 1.3, 0]),
      arc: i === 0 ? 2.5 : 1.2,
      framing: 'side',
    });
  });

  const fl = ANCHORS.flow;
  flowTracks.forEach((_, k) => {
    raw.push({
      section: 'flow',
      sub: k,
      length: k === 0 ? 1.2 : 0.66,
      transition: k === 0 ? 0.75 : 0.3,
      cam: add(fl, [-0.5, 12.6, 8.8 + FLOW_LANE_Z[k] * 0.2]),
      target: add(fl, [-0.5, 0, 0.9 + FLOW_LANE_Z[k] * 0.25]),
      arc: k === 0 ? 3 : 0,
      framing: 'center',
    });
  });

  const ca = ANCHORS.career;
  raw.push({
    section: 'career',
    sub: 0,
    length: 1.3,
    transition: 0.8,
    cam: add(ca, [0, 11.5, 6.6]),
    target: add(ca, [0, 0, -1.0]),
    drift: [0, -0.6, -0.6],
    framing: 'center',
  });

  const ev = ANCHORS.evidence;
  raw.push({
    section: 'evidence',
    sub: 0,
    length: 1.35,
    transition: 0.8,
    cam: add(ev, [0.6, 3.4, 9.6]),
    target: add(ev, [0, 1.5, 0]),
    drift: [-0.6, 0.3, -0.4],
    framing: 'side',
  });

  const sy = ANCHORS.system;
  raw.push({
    section: 'system',
    sub: 0,
    length: 2.5,
    transition: 0.9,
    cam: add(sy, [0, 4.6, 11.5]),
    target: add(sy, [0, 0.9, 0]),
    drift: [0, 3.2, 4.5],
    arc: 2,
    framing: 'center',
  });

  return raw.map((s, index) => ({ ...s, index }));
}

export const STOPS: Stop[] = buildStops();

export const sectionStops = (section: SectionId) => STOPS.filter((s) => s.section === section);
export const firstStopOf = (section: SectionId) => STOPS.findIndex((s) => s.section === section);
export const stopRangeOf = (section: SectionId): [number, number] => {
  const list = sectionStops(section);
  return [list[0].index, list[list.length - 1].index];
};
