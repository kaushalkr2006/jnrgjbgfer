import { projects } from '../content/projects';

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
  { id: 'career', index: '05', label: 'Direction' },
  { id: 'evidence', index: '06', label: 'Evidence' },
  { id: 'system', index: '07', label: 'System' },
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
  career: [0, 0, -420] as Vec3,
  evidence: [0, 0, -458] as Vec3,
  system: [0, 0, -500] as Vec3,
};

function buildStops(): Stop[] {
  const raw: Omit<Stop, 'index'>[] = [];

  raw.push({
    section: 'opening',
    sub: 0,
    length: 0.12,
    transition: 0,
    cam: [0, 1.9, 8.5],
    target: [0, 0.75, -6],
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
      [0, 1.15, -3],
      [0.5, 0.75, -14],
      [0, 1.4, -24],
    ],
    targetVia: [
      [0, 0.35, -16],
      [0, 0.8, -27],
      [0, 2.1, -36],
    ],
    framing: 'center',
  });

  // One stop for the whole stack: systems are switched in place (tabs, chiplets, auto-cycle).
  const st = ANCHORS.stack;
  raw.push({
    section: 'stack',
    sub: 0,
    length: 1.2,
    transition: 0.7,
    cam: add(st, [0, 9.4, 14.6]),
    target: add(st, [0, 0.2, 0.9]),
    arc: 3,
    framing: 'side',
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
    // Complete on arrival: parts converge during the flight in, no extra swipes needed.
    length: 1.25,
    transition: 0.95,
    cam: add(sy, [0, 7.4, 15.4]),
    target: add(sy, [0, 0.9, 0]),
    arc: 1.5,
    framing: 'center',
  });

  return raw.map((s, index) => ({ ...s, index }));
}

export const STOPS: Stop[] = buildStops();

/** Two-digit display index of a section (e.g. '03'). */
export const sectionIndex = (id: SectionId) => SECTIONS.find((s) => s.id === id)?.index ?? '';

export const sectionStops = (section: SectionId) => STOPS.filter((s) => s.section === section);
export const firstStopOf = (section: SectionId) => STOPS.findIndex((s) => s.section === section);
export const stopRangeOf = (section: SectionId): [number, number] => {
  const list = sectionStops(section);
  return [list[0].index, list[list.length - 1].index];
};
