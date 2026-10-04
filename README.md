# Kaushal — Electronics Systems Engineering

Scroll-driven 3D portfolio built as a cinematic tour through one connected electronic system: opening board, identity, a chiplet-based technical stack, eight project environments, the engineering flow map, career direction ports, an evidence register, and a final assembly scene.

**Stack:** Vite · React 19 · TypeScript · three.js · @react-three/fiber · Lenis

```bash
npm install
npm run dev        # local development
npm run build      # type-check + production build → dist/
npm run preview    # serve the production build
```

`dist/` is a static site. You can deploy it to any static host (Netlify, Vercel, GitHub Pages, S3).

## Editing content

All copy is data-driven. Nothing about the person is hard-coded in components.

| File | Contents |
| --- | --- |
| `src/content/profile.ts` | Name, field, focus, identity copy, career directions, evidence register, `links` (empty until real URLs are added) |
| `src/content/stack.ts` | Skill systems (each one renders as a chiplet + pin map) |
| `src/content/projects.ts` | Projects. `status: 'roadmap'` drives the "planned build" labels. Change it only when a project is actually complete. |
| `src/content/flow.ts` | Engineering-flow tracks |

Adding a project means adding an entry to `projects.ts` and a scene in `src/three/projects/scenes/`, then registering it in `ProjectScene.tsx`. The camera stops, navigation and UI update automatically.

## Architecture

```
src/
  core/        scroll engine (staged timeline, snapping, keyboard), single rAF ticker,
               quality tiers, store, DOM↔3D anchor registry
  content/     all text and project data
  three/       Scene (Canvas root), CameraRig, SystemBus, materials (GPU shaders),
               objects (Chip, Board, Waveform, Traces, Glows, DataStream, CellGrid,
               Scope, Panel, Block, SpatialObject), pcb/ (procedural router +
               PCBVisualization), stations/ (one per section), projects/ (ProjectScene
               + 8 scenes)
  ui/          Overlay, Navigation, HUD + progress rail, SectionTransition,
               sections/ (HeroPanel, IdentityPanel, StackPanel, ProjectViewer,
               FlowPanel, CareerPanel, EvidencePanel, FinalPanel)
```

**Motion model.** `core/timeline.ts` defines camera stops. Each stop has a short *transition* region, where the camera flies and content hides, followed by a *hold* region, where the camera rests and content reveals after a brief pause. When scrolling stops partway through a transition, the engine snaps to the nearer stop.

**Performance.**
- One `requestAnimationFrame` loop drives Lenis, DOM writers and R3F (`frameloop="never"` + `advance`).
- Animation runs in shaders. Traces, waveforms, voxels, cells and data streams are instanced or merged, so a view uses roughly 50 or fewer draw calls and about 16 shader programs in total.
- Only stations near the camera render.
- Shaders and buffers are compiled and uploaded before the canvas fades in.
- If frames run slow, the governor lowers the pixel ratio.
- The 3D runtime is code-split, so the DOM content appears first.

**Device tiers.** Tiers are detected automatically: `high`, `medium`, or `low` (phones and software GL). Geometry density, voxel resolution, environment lighting, parallax and pixel-ratio cap scale with the tier. For testing, append `?tier=high|medium|low|none` (`none` is the static, WebGL-free fallback) or `?motion=reduced`.

**Accessibility.**
- `prefers-reduced-motion` is respected, and the in-page MOTION toggle overrides it. With reduced motion, camera flights become short black cuts, ambient animation freezes and reveals become fades.
- Hidden sections are `inert`.
- Keyboard: ↑ ↓ / PageUp / PageDown / Space step through stops; Home / End jump to the ends; INDEX opens the section menu.

## Content rule

This site shows only the information Kaushal provided. All projects are labelled roadmap work, and the "Measured results" layers say *pending*. Don't add employers, grades, metrics or results unless they are real.
