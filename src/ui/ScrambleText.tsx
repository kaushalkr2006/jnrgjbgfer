import { useEffect, useRef } from 'react';

const GLYPHS = '01<>/\\#=+*ABCDEF';

interface ScrambleTextProps {
  text: string;
  start: boolean;
  delay?: number;
  duration?: number;
  reduced?: boolean;
  className?: string;
}

/**
 * Letters resolve from random hex/logic glyphs, left → right. Each letter keeps its final
 * glyph (transparent) for width, so there is zero layout shift while scrambling.
 */
export function ScrambleText({ text, start, delay = 0, duration = 1000, reduced = false, className }: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !start) return;
    const spans = Array.from(el.querySelectorAll<HTMLSpanElement>('[data-ch]'));
    if (reduced) {
      spans.forEach((s) => {
        s.dataset.state = 'done';
        delete s.dataset.g;
      });
      return;
    }
    let raf = 0;
    const t0 = performance.now() + delay;
    let lastSwap = 0;
    const loop = (now: number) => {
      const p = (now - t0) / duration;
      const swap = now - lastSwap > 45;
      if (swap) lastSwap = now;
      spans.forEach((s, i) => {
        const at = (i / spans.length) * 0.65;
        const local = (p - at) / 0.35;
        if (local >= 1) {
          if (s.dataset.state !== 'done') {
            s.dataset.state = 'done';
            delete s.dataset.g;
          }
        } else if (local > 0) {
          s.dataset.state = 'scramble';
          if (swap) s.dataset.g = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
      });
      if (p < 1.02) raf = requestAnimationFrame(loop);
      else spans.forEach((s) => (s.dataset.state = 'done'));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [start, delay, duration, reduced]);

  return (
    <span ref={ref} className={`scramble ${className ?? ''}`} aria-label={text} role="text">
      {text.split('').map((c, i) => (
        <span key={i} data-ch="" data-state="idle" aria-hidden="true">
          {c}
        </span>
      ))}
    </span>
  );
}
