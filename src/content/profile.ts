/**
 * Profile content. Only information explicitly provided by Kaushal belongs here.
 * Do not add employers, grades, awards, metrics or results that have not been supplied.
 */

export type ContactId = 'github' | 'linkedin' | 'instagram' | 'email';

export interface ContactChannel {
  id: ContactId;
  label: string;
  /** Displayed handle / address. */
  handle: string;
  /** Full URL (use `mailto:` for email). Leave empty to show the channel as "link pending". */
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
   * Contact channels shown on the final page. To bind a channel, fill in `handle` + `href`:
   *   linkedin:  handle: 'in/your-name',  href: 'https://www.linkedin.com/in/your-name'
   *   instagram: handle: 'your.username', href: 'https://www.instagram.com/your.username'
   *   email:     handle: 'you@gmail.com', href: 'mailto:you@gmail.com'
   * Unbound channels still appear, marked "link pending".
   */
  contact: [
    { id: 'github', label: 'GitHub', handle: 'kaushalkr2006', href: 'https://github.com/kaushalkr2006' },
    { id: 'linkedin', label: 'LinkedIn', handle: '', href: '' },
    { id: 'instagram', label: 'Instagram', handle: '', href: '' },
    { id: 'email', label: 'Gmail', handle: '', href: '' },
  ] as ContactChannel[],
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
