/** Tiny stroke icons — avoids depending on font coverage for arrows / symbols. */
const PATHS = {
  left: 'M13 5l-5 5 5 5M8 10h9',
  right: 'M7 5l5 5-5 5M12 10H3',
  up: 'M5 9l5-5 5 5M10 4v12',
  down: 'M5 11l5 5 5-5M10 16V4',
  replay: 'M4 10a6 6 0 1 0 2-4.5M4 3v3.5h3.5',
  ring: 'M10 5a5 5 0 1 0 0 10a5 5 0 1 0 0-10',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 14 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-0.15em', flex: 'none' }}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
