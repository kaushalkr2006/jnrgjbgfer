/**
 * Static, GPU-free backdrop: shown while WebGL streams in, and as the full fallback when
 * WebGL is unavailable. A faint technical grid plus a few routed traces.
 */
export function Backdrop({ dim = false }: { dim?: boolean }) {
  return (
    <div className={`backdrop${dim ? ' backdrop--dim' : ''}`}>
      <svg className="backdrop__traces" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <pattern id="bd-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="rgba(110,231,255,0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1600" height="900" fill="url(#bd-grid)" />
        <g fill="none" strokeWidth="1.4" strokeLinecap="round">
          <g stroke="rgba(255,138,61,0.22)">
            <path d="M560 380H420l-60-60H120" />
            <path d="M560 400H410l-60-60H140" />
            <path d="M560 420H400l-60-60H160" />
            <path d="M1040 480h150l60 60h230" />
            <path d="M1040 500h140l60 60h220" />
            <path d="M1040 520h130l60 60h210" />
          </g>
          <g stroke="rgba(110,231,255,0.18)">
            <path d="M720 360V240l40-40V80" />
            <path d="M740 360V250l40-40V80" />
            <path d="M860 540v110l-40 40v130" />
            <path d="M880 540v100l-40 40v140" />
          </g>
        </g>
        <rect x="560" y="360" width="480" height="180" fill="none" stroke="rgba(238,241,243,0.14)" />
      </svg>
    </div>
  );
}
