/**
 * Project data. Every project below is a ROADMAP project: planned work, not a completed
 * achievement. Change `status` only when a project is actually finished, and never add
 * measured values or results that do not exist.
 */

export type ProjectStatus = 'roadmap' | 'in-progress' | 'complete';

export type ProjectSceneKey =
  | 'stm32Uart'
  | 'thermometer'
  | 'imuFir'
  | 'fpgaDisplay'
  | 'rtosNode'
  | 'pcbBuild'
  | 'rtlVerif'
  | 'flagship';

export interface Project {
  id: string;
  index: number;
  title: string;
  status: ProjectStatus;
  /** "Technologies" for most projects, "Focus" for the flagship. */
  techLabel: 'TECHNOLOGIES' | 'FOCUS';
  tech: string[];
  /** The system elements the scene visualises, in signal-flow order. */
  chain: string[];
  scene: ProjectSceneKey;
}

export const statusLabel: Record<ProjectStatus, string> = {
  roadmap: 'ROADMAP · PLANNED BUILD',
  'in-progress': 'IN PROGRESS',
  complete: 'COMPLETE',
};

export const projects: Project[] = [
  {
    id: 'p01',
    index: 1,
    title: 'STM32 UART + LED Control',
    status: 'roadmap',
    techLabel: 'TECHNOLOGIES',
    tech: ['C', 'STM32', 'UART', 'Git', 'Debugging'],
    chain: ['STM32 board', 'UART data stream', 'LED', 'Signal view', 'Embedded debug'],
    scene: 'stm32Uart',
  },
  {
    id: 'p02',
    index: 2,
    title: 'Analog + Digital Thermometer',
    status: 'roadmap',
    techLabel: 'TECHNOLOGIES',
    tech: ['ADC', 'Verilog', 'Oscilloscope'],
    chain: ['Analog signal', 'ADC conversion', 'Digital representation', 'Verilog controller', 'Oscilloscope'],
    scene: 'thermometer',
  },
  {
    id: 'p03',
    index: 3,
    title: 'IMU / Sensor Logger + FIR',
    status: 'roadmap',
    techLabel: 'TECHNOLOGIES',
    tech: ['Sensors', 'SPI / I²C', 'DSP', 'Measurement', 'Data Analysis'],
    chain: ['IMU motion', 'Sensor stream', 'Sampling', 'DSP', 'FIR filter'],
    scene: 'imuFir',
  },
  {
    id: 'p04',
    index: 4,
    title: 'FPGA UART / Display Subsystem',
    status: 'roadmap',
    techLabel: 'TECHNOLOGIES',
    tech: ['Verilog / RTL', 'FPGA', 'Simulation', 'Synthesis', 'Timing'],
    chain: ['RTL blocks', 'Signal routing', 'Simulation', 'Synthesis', 'FPGA', 'Display interface'],
    scene: 'fpgaDisplay',
  },
  {
    id: 'p05',
    index: 5,
    title: 'FreeRTOS Control Node',
    status: 'roadmap',
    techLabel: 'TECHNOLOGIES',
    tech: ['FreeRTOS', 'Timers', 'Interrupts', 'Control', 'CAN', 'Logging'],
    chain: ['RTOS task flow', 'Interrupt events', 'Control loop', 'CAN bus', 'System log'],
    scene: 'rtosNode',
  },
  {
    id: 'p06',
    index: 6,
    title: 'Custom Sensor / Control PCB',
    status: 'roadmap',
    techLabel: 'TECHNOLOGIES',
    tech: ['KiCad', 'PCB', 'BOM', 'Power', 'Bring-up'],
    chain: ['Schematic', 'Placement', 'Routing', 'Power paths', 'Bring-up'],
    scene: 'pcbBuild',
  },
  {
    id: 'p07',
    index: 7,
    title: 'RTL Subsystem + Verification',
    status: 'roadmap',
    techLabel: 'TECHNOLOGIES',
    tech: ['SystemVerilog', 'RTL', 'Assertions', 'Coverage Concepts', 'AMBA', 'Synthesis'],
    chain: ['RTL architecture', 'Verification flow', 'Waveforms', 'Assertions', 'Coverage', 'Synthesis'],
    scene: 'rtlVerif',
  },
  {
    id: 'p08',
    index: 8,
    title: 'Integrated Flagship Project',
    status: 'roadmap',
    techLabel: 'FOCUS',
    tech: ['System Architecture', 'PCB', 'Firmware', 'RTL / Linux', 'Verification', 'Measured Results'],
    chain: ['PCB', 'Firmware', 'RTL / Linux', 'Verification', 'Measured results'],
    scene: 'flagship',
  },
];
