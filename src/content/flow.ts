export interface FlowTrack {
  id: string;
  code: string;
  title: string;
  steps: string[];
}

/** Engineering development flow — four parallel tracks that converge into one system. */
export const flowTracks: FlowTrack[] = [
  {
    id: 'firmware',
    code: 'TRK.A',
    title: 'FIRMWARE',
    steps: ['C', 'Embedded C', 'STM32', 'Peripherals', 'RTOS'],
  },
  {
    id: 'digital',
    code: 'TRK.B',
    title: 'DIGITAL',
    steps: [
      'Digital Systems',
      'Digital Design',
      'Verilog',
      'Simulation',
      'Synthesis',
      'FPGA',
      'SystemVerilog',
      'Verification',
    ],
  },
  {
    id: 'hardware',
    code: 'TRK.C',
    title: 'HARDWARE',
    steps: ['Analog / Circuits', 'Measurement', 'PCB', 'Hardware Bring-up'],
  },
  {
    id: 'systems',
    code: 'TRK.D',
    title: 'SYSTEMS',
    steps: ['Sensors', 'DSP', 'Control', 'Embedded Integration'],
  },
];
