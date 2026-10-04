/**
 * Profile content. Only information explicitly provided by Kaushal belongs here.
 * Do not add employers, grades, awards, metrics or results that have not been supplied.
 */

export interface ProfileLink {
  label: string;
  href: string;
}

export const profile = {
  name: 'KAUSHAL',
  field: 'ELECTRONICS SYSTEMS ENGINEERING',
  primaryFocus: ['DIGITAL HARDWARE / FPGA-RTL', 'EMBEDDED FIRMWARE'],
  secondaryFocus: [
    'Embedded Linux',
    'Hardware / PCB',
    'DSP',
    'Sensors',
    'Control Systems',
    'DSA / Programming',
  ],

  identity: {
    heading: 'I BUILD SYSTEMS.',
    keywords: ['EMBEDDED', 'FPGA', 'RTL', 'HARDWARE', 'FIRMWARE'],
    statement:
      'Developing as an Electronics Systems Engineer with a primary focus on digital hardware / FPGA-RTL and embedded firmware.',
    support:
      'Supported by embedded Linux, hardware / PCB, DSP, sensors, control systems and software / DSA.',
  },

  career: {
    heading: 'BUILDING TOWARD',
    caption: 'Target role directions — not current positions.',
    directions: [
      'FPGA / RTL',
      'DESIGN VERIFICATION',
      'EMBEDDED FIRMWARE',
      'EMBEDDED LINUX / BSP',
      'HARDWARE / PCB',
      'SEMICONDUCTOR / DIGITAL IC',
    ],
  },

  /**
   * Public links (GitHub, email, etc.). Intentionally empty until real URLs are supplied —
   * add entries here and they will appear in the final scene automatically.
   */
  links: [] as ProfileLink[],
} as const;

export type EvidenceKind =
  | 'repo'
  | 'readme'
  | 'code'
  | 'schematic'
  | 'arch'
  | 'sim'
  | 'sensor'
  | 'pcb'
  | 'test'
  | 'debug'
  | 'measure';

export interface EvidenceItem {
  id: string;
  code: string;
  label: string;
  kind: EvidenceKind;
}

/** The engineering evidence this portfolio is intended to contain. */
export const evidence: EvidenceItem[] = [
  { id: 'ev01', code: 'REPO', label: 'GitHub', kind: 'repo' },
  { id: 'ev02', code: 'DOC', label: 'Project README', kind: 'readme' },
  { id: 'ev03', code: 'SRC', label: 'Code / RTL', kind: 'code' },
  { id: 'ev04', code: 'SCH', label: 'Schematics', kind: 'schematic' },
  { id: 'ev05', code: 'ARCH', label: 'Architecture diagrams', kind: 'arch' },
  { id: 'ev06', code: 'SIM', label: 'Simulation evidence', kind: 'sim' },
  { id: 'ev07', code: 'DATA', label: 'Sensor measurements', kind: 'sensor' },
  { id: 'ev08', code: 'PCB', label: 'PCB designs', kind: 'pcb' },
  { id: 'ev09', code: 'TEST', label: 'Test plans', kind: 'test' },
  { id: 'ev10', code: 'DBG', label: 'Debugging documentation', kind: 'debug' },
  { id: 'ev11', code: 'MEAS', label: 'Measured results', kind: 'measure' },
];
