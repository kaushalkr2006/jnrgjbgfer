import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { detectDevice, prefersReducedMotion } from './core/quality';
import { engine } from './core/scroll';
import { app, useApp } from './core/store';
import { startTicker } from './core/ticker';
import { bindPointer } from './core/pointer';
import { Overlay } from './ui/Overlay';
import { Backdrop } from './ui/Backdrop';

// The WebGL experience is code-split: DOM content renders immediately, 3D streams in after.
const Scene = lazy(() => import('./three/Scene'));

class GLBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function fontsReady() {
  const fonts = document.fonts;
  if (!fonts) return Promise.resolve();
  const loads = Promise.all([
    fonts.load('800 150px "Geist Variable"'),
    fonts.load('500 64px "Geist Mono Variable"'),
  ]).catch(() => undefined);
  return Promise.race([loads, new Promise((r) => setTimeout(r, 2500))]);
}

export default function App() {
  const spacer = useRef<HTMLDivElement>(null);
  const [device] = useState(detectDevice);
  const [mount3D, setMount3D] = useState(false);
  const webgl = useApp((s) => s.webgl);
  const glReady = useApp((s) => s.glReady);
  const reduced = useApp((s) => s.reducedMotion);

  useEffect(() => {
    const reducedPref = prefersReducedMotion();
    app.set({ tier: device.tier, webgl: device.webgl, reducedMotion: reducedPref });
    engine.init(spacer.current!, reducedPref);
    bindPointer();
    startTicker();

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => app.set({ reducedMotion: mq.matches });
    mq.addEventListener('change', onChange);

    let cancelled = false;
    fontsReady().then(() => {
      if (cancelled) return;
      document.documentElement.dataset.fonts = 'ready';
      app.set({ introStarted: true });
      if (!device.webgl) return;
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
      if (idle) idle(() => !cancelled && setMount3D(true), { timeout: 600 });
      else setTimeout(() => !cancelled && setMount3D(true), 50);
    });
    return () => {
      cancelled = true;
      mq.removeEventListener('change', onChange);
    };
  }, [device]);

  useEffect(() => {
    engine.setReduced(reduced);
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  }, [reduced]);

  useEffect(() => {
    document.documentElement.dataset.tier = device.tier;
    document.documentElement.dataset.pointer = device.coarse ? 'coarse' : 'fine';
  }, [device]);

  return (
    <>
      <div className="stage" data-ready={glReady} aria-hidden="true">
        {(!webgl || !glReady) && <Backdrop dim={webgl} />}
        {mount3D && webgl && (
          <GLBoundary onError={() => app.set({ webgl: false })}>
            <Suspense fallback={null}>
              <Scene tier={device.tier} />
            </Suspense>
          </GLBoundary>
        )}
      </div>
      <Overlay />
      <div ref={spacer} className="scroll-spacer" aria-hidden="true" />
    </>
  );
}
