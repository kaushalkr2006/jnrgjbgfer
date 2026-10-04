import Lenis from 'lenis';
import { STOPS } from './timeline';
import { app } from './store';
import { addTick } from './ticker';
import { clamp, damp, easeInOutCubic } from './math';

/** Hold-progress targets used by keyboard / step navigation (fractions of each stop's hold). */
const STEP_TARGETS: Record<number, number[]> = {};
STOPS.forEach((s) => {
  if (s.section === 'identity') STEP_TARGETS[s.index] = [0, 0.28, 0.48, 0.68, 0.88];
  else if (s.section === 'system') STEP_TARGETS[s.index] = [0, 0.985];
  else STEP_TARGETS[s.index] = [0];
});

/**
 * Converts the document scroll position into the staged camera timeline, provides
 * snapping between stops and keyboard / programmatic navigation.
 */
class ScrollEngine {
  lenis: Lenis | null = null;
  private spacer: HTMLElement | null = null;

  vh = 800;
  starts: number[] = [];
  trans: number[] = [];
  lens: number[] = [];
  total = 1;
  private targets: number[] = [];

  /** Live values — read these every frame, never store them in React state. */
  y = 0;
  velocity = 0; // px / s, smoothed
  dir = 1;
  stop = 0;
  stopFloat = 0;
  transRaw = 1;
  transE = 1;
  hold = 0;
  progress = 0;
  /** Black veil used for long jumps and reduced-motion cuts (0..1). */
  veil = 0;

  reduced = false;
  private prevY = 0;
  private lastInput = -10;
  private touching = false;
  private programmatic = false;
  private pendingJump: number | null = null;
  private lastTarget = 0;
  private veilTarget = 0;
  private lastW = 0;
  private lastH = 0;
  private started = false;

  init(spacer: HTMLElement, reduced: boolean) {
    if (this.started) return;
    this.started = true;
    this.spacer = spacer;
    this.reduced = reduced;

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    this.lenis = new Lenis({
      autoRaf: false,
      smoothWheel: !reduced,
      lerp: 0.095,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.15,
      syncTouch: false,
      anchors: false,
      stopInertiaOnNavigate: true,
    });

    this.measure(true);

    const markInput = () => {
      this.lastInput = performance.now() / 1000;
      this.programmatic = false;
    };
    window.addEventListener('wheel', markInput, { passive: true });
    window.addEventListener(
      'touchstart',
      () => {
        this.touching = true;
        markInput();
      },
      { passive: true },
    );
    window.addEventListener('touchmove', markInput, { passive: true });
    window.addEventListener(
      'touchend',
      () => {
        this.touching = false;
        markInput();
      },
      { passive: true },
    );
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', () => this.measure(false));

    addTick((t, dt) => this.update(t, dt), 0);
  }

  setReduced(reduced: boolean) {
    this.reduced = reduced;
    if (this.lenis) this.lenis.options.smoothWheel = !reduced;
  }

  private measure(force: boolean) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Ignore mobile URL-bar height jitter; re-measure only on meaningful changes.
    if (!force && w === this.lastW && Math.abs(h - this.lastH) < 140) return;
    const prevTotal = this.total;
    const prevY = this.y;
    this.lastW = w;
    this.lastH = h;
    this.vh = h;

    let acc = 0;
    this.starts = [];
    this.trans = [];
    this.lens = [];
    for (const s of STOPS) {
      this.starts.push(acc);
      this.trans.push(s.transition * h);
      this.lens.push(s.length * h);
      acc += s.length * h;
    }
    this.total = acc;
    if (this.spacer) this.spacer.style.height = `${Math.round(acc + h)}px`;

    this.targets = [];
    STOPS.forEach((s) => {
      const holdStart = this.starts[s.index] + this.trans[s.index];
      const holdLen = this.lens[s.index] - this.trans[s.index];
      for (const f of STEP_TARGETS[s.index]) {
        this.targets.push(Math.min(this.total - 1, holdStart + 2 + f * Math.max(0, holdLen - 4)));
      }
    });
    this.targets.sort((a, b) => a - b);

    this.lenis?.resize();
    if (!force && prevTotal > 1) {
      this.lenis?.scrollTo((prevY / prevTotal) * this.total, { immediate: true, force: true });
    }
  }

  private update(t: number, dt: number) {
    const lenis = this.lenis;
    if (lenis) lenis.raf(t * 1000);
    const y = clamp(lenis ? lenis.scroll : window.scrollY, 0, this.total);
    this.y = y;

    const dy = y - this.prevY;
    this.prevY = y;
    if (Math.abs(dy) > 0.01) this.dir = dy > 0 ? 1 : -1;
    this.velocity = damp(this.velocity, dy / dt, 10, dt);

    const n = STOPS.length;
    let i = this.stop;
    while (i < n - 1 && y >= this.starts[i + 1]) i++;
    while (i > 0 && y < this.starts[i]) i--;
    this.stop = i;

    const d = y - this.starts[i];
    const tr = this.trans[i];
    const raw = tr > 0 ? clamp(d / tr) : 1;
    this.transRaw = raw;
    this.transE = easeInOutCubic(raw);
    this.stopFloat = i === 0 ? 0 : i - 1 + this.transE;
    this.hold = raw >= 1 ? clamp((d - tr) / Math.max(1, this.lens[i] - tr)) : 0;
    this.progress = clamp(y / this.total);

    // Discrete state → store (only notifies React on change).
    const nearest = i === 0 ? 0 : this.transE >= 0.5 ? i : i - 1;
    const arrived = raw >= 1 ? i : raw <= 0.04 ? i - 1 : -1;
    const same = i > 0 && STOPS[i].section === STOPS[i - 1].section;
    app.set({
      nearest,
      arrived,
      visibleSection: arrived >= 0 ? STOPS[arrived].section : same ? STOPS[i].section : null,
      section: STOPS[nearest].section,
    });

    // Long-jump veil sequencing.
    if (this.pendingJump !== null && this.veil > 0.96) {
      lenis?.scrollTo(this.pendingJump, { immediate: true, force: true });
      this.pendingJump = null;
      this.veilTarget = 0;
      this.programmatic = false;
    }
    this.veil = damp(this.veil, this.veilTarget, 16, dt);

    this.trySnap(t);
  }

  private trySnap(now: number) {
    if (this.programmatic || this.touching || this.pendingJump !== null) return;
    if (app.get().menuOpen) return;
    if (now - this.lastInput < 0.22 || Math.abs(this.velocity) > 25) return;
    const i = this.stop;
    if (i === 0) return;
    const tr = this.trans[i];
    const d = this.y - this.starts[i];
    if (tr <= 0 || d <= 1.5 || d >= tr - 1.5) return;
    const p = d / tr;
    const forward = this.dir >= 0 ? p > 0.12 : p > 0.88;
    this.goTo(forward ? this.starts[i] + tr + 2 : this.starts[i] - 1);
  }

  /** Smoothly scroll to a document position. Long distances use a fast veil cut. */
  goTo(y: number, opts: { cut?: boolean } = {}) {
    const lenis = this.lenis;
    const target = clamp(y, 0, this.total);
    const dist = Math.abs(target - this.y);
    this.lastTarget = target;
    if (!lenis) {
      window.scrollTo(0, target);
      return;
    }
    this.lastInput = performance.now() / 1000;
    if (opts.cut || this.reduced) {
      this.programmatic = true;
      this.pendingJump = target;
      this.veilTarget = 1;
      return;
    }
    this.programmatic = true;
    lenis.scrollTo(target, {
      duration: clamp(0.55 + (dist / this.vh) * 0.16, 0.55, 1.5),
      easing: easeInOutCubic,
      force: true,
      onComplete: () => {
        this.programmatic = false;
      },
    });
  }

  holdStartY(stopIndex: number) {
    return this.starts[stopIndex] + this.trans[stopIndex] + 2;
  }

  toStop(stopIndex: number) {
    const k = clamp(stopIndex, 0, STOPS.length - 1);
    const from = this.stop;
    const y = k === 0 ? 0 : this.holdStartY(k);
    this.goTo(y, { cut: Math.abs(k - from) > 2 });
  }

  step(direction: 1 | -1) {
    // While a programmatic scroll is running, step relative to its destination so rapid
    // key presses advance one stop each instead of re-targeting the same stop.
    const y = this.pendingJump ?? (this.programmatic ? this.lastTarget : this.y);
    let target: number | undefined;
    if (direction > 0) target = this.targets.find((v) => v > y + 4);
    else {
      for (let i = this.targets.length - 1; i >= 0; i--) {
        if (this.targets[i] < y - 4) {
          target = this.targets[i];
          break;
        }
      }
      if (target === undefined) target = 0;
    }
    if (target !== undefined) this.goTo(target);
  }

  /** 0 before the stop, eased 0..1 while travelling into it, 1 after. */
  arrivalOf(stopIndex: number) {
    if (this.stop > stopIndex) return 1;
    if (this.stop < stopIndex) return 0;
    return this.transE;
  }

  /** 0 before / during arrival, 0..1 through the hold region, 1 after. */
  holdOf(stopIndex: number) {
    if (this.stop > stopIndex) return 1;
    if (this.stop < stopIndex) return 0;
    return this.hold;
  }

  private onKey = (e: KeyboardEvent) => {
    if (app.get().menuOpen || e.metaKey || e.ctrlKey || e.altKey) return;
    const el = e.target as HTMLElement | null;
    const tag = el?.tagName ?? '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
    const onControl = tag === 'BUTTON' || tag === 'A';
    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
      case 'ArrowRight':
        e.preventDefault();
        this.step(1);
        break;
      case 'ArrowUp':
      case 'PageUp':
      case 'ArrowLeft':
        e.preventDefault();
        this.step(-1);
        break;
      case ' ':
        if (onControl) return;
        e.preventDefault();
        this.step(e.shiftKey ? -1 : 1);
        break;
      case 'Home':
        e.preventDefault();
        this.toStop(0);
        break;
      case 'End':
        e.preventDefault();
        this.goTo(this.total, { cut: true });
        break;
    }
  };
}

export const engine = new ScrollEngine();
