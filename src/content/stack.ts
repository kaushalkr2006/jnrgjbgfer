export interface SkillSystem {
  id: string;
  code: string; // short code printed on the 3D chiplet
  title: string;
  skills: string[];
}

export const skillSystems: SkillSystem[] = [
  {
    id: 'embedded',
    code: 'EMB',
    title: 'EMBEDDED SYSTEMS',
    skills: ['STM32', 'C', 'Embedded C', 'FreeRTOS', 'UART', 'SPI', 'I²C', 'CAN', 'Embedded Linux'],
  },
  {
    id: 'digital',
    code: 'DIG',
    title: 'DIGITAL HARDWARE',
    skills: [
      'Digital System Design',
      'Verilog',
      'SystemVerilog',
      'RTL',
      'FPGA',
      'Simulation',
      'Synthesis',
      'Timing',
      'Verification',
      'Assertions',
      'Coverage Concepts',
      'AMBA',
    ],
  },
  {
    id: 'hardware',
    code: 'PCB',
    title: 'HARDWARE / PCB',
    skills: [
      'Analog & Digital Circuits',
      'KiCad',
      'PCB Design',
      'Hardware Bring-up',
      'Oscilloscope',
      'Logic Analyzer',
    ],
  },
  {
    id: 'signal',
    code: 'DSP',
    title: 'SIGNAL PROCESSING / SYSTEMS',
    skills: ['DSP', 'DFT / FFT', 'FIR / IIR', 'Sensors', 'Control Systems', 'PID'],
  },
  {
    id: 'tools',
    code: 'SW',
    title: 'PROGRAMMING / TOOLS',
    skills: ['Python', 'C++', 'Git', 'GitHub', 'Linux', 'Bash', 'Tcl'],
  },
  {
    id: 'dsa',
    code: 'DSA',
    title: 'DSA',
    skills: ['Data Structures & Algorithms', 'C++ STL'],
  },
];
