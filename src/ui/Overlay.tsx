import { useRef } from 'react';
import { useTick } from '../core/ticker';
import { engine } from '../core/scroll';
import { Navigation } from './Navigation';
import { HUD } from './HUD';
import { HeroPanel } from './sections/HeroPanel';
import { IdentityPanel } from './sections/IdentityPanel';
import { StackPanel } from './sections/StackPanel';
import { ProjectViewer } from './sections/ProjectViewer';
import { FlowPanel } from './sections/FlowPanel';
import { CareerPanel } from './sections/CareerPanel';
import { EvidencePanel } from './sections/EvidencePanel';
import { FinalPanel } from './sections/FinalPanel';

/** Fast black veil: long jumps, and cuts instead of camera flights under reduced motion. */
function TransitionVeil() {
  const el = useRef<HTMLDivElement>(null);
  const last = useRef(-1);
  useTick(() => {
    let o = engine.veil;
    if (engine.reduced && engine.stop > 0 && engine.transRaw > 0 && engine.transRaw < 1) {
      o = Math.max(o, 1 - Math.abs(engine.transE * 2 - 1));
    }
    if (el.current && Math.abs(o - last.current) > 0.002) {
      el.current.style.opacity = o.toFixed(3);
      el.current.style.visibility = o > 0.002 ? 'visible' : 'hidden';
      last.current = o;
    }
  });
  return <div ref={el} className="veil" aria-hidden="true" />;
}

export function Overlay() {
  return (
    <div className="overlay">
      <main className="sections">
        <HeroPanel />
        <IdentityPanel />
        <StackPanel />
        <ProjectViewer />
        <FlowPanel />
        <CareerPanel />
        <EvidencePanel />
        <FinalPanel />
      </main>
      <TransitionVeil />
      <HUD />
      <Navigation />
    </div>
  );
}
