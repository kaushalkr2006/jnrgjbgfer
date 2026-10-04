# Kaushal — Electronics Systems Engineering

Scroll-driven 3D portfolio built as a cinematic tour through one connected electronic system: opening board, identity, a chiplet-based technical stack, eight project environments, career direction ports, an evidence register, and a contact page over the final assembly scene.

**Stack:** Vite · React 19 · TypeScript · three.js · @react-three/fiber · Lenis

```bash
npm install
npm run dev        # local development
npm run build      # type-check + production build → dist/
npm run preview    # serve the production build
```

`dist/` is a static site that works at any sub-path. Every push to `main` builds it and deploys it to GitHub Pages via `.github/workflows/deploy.yml`. This needs **Settings → Pages → Source: GitHub Actions**.

## Editing content

All copy is data-driven. Nothing about the person is hard-coded in components.

| File | Contents |
| --- | --- |
| `src/content/profile.ts` | Name, field, focus, identity copy, career directions, evidence register, `contact` channels (GitHub, LinkedIn, Instagram, Gmail; empty ones are hidden) |
| `src/content/stack.ts` | Skill systems (each one renders as a chiplet + pin map) |
| `src/content/projects.ts` | Projects. `status: 'roadmap'` drives the "planned build" labels. Change it only when a project is actually complete. |

Adding a project means adding an entry to `projects.ts` and a scene in `src/three/projects/scenes/`, then registering it in `ProjectScene.tsx`. The camera stops, navigation and UI update automatically.

## Architecture

```
src/
  core/        scroll engine (staged timeline, snapping, keyboard), single rAF ticker,
               quality tiers, store, DOM↔3D anchor registry
  content/     all text and project data
  three/       Scene (Canvas root), CameraRig, DieFloor (shared silicon floor), materials (GPU shaders),
               objects (Chip, Board, Waveform, Traces, Glows, DataStream, CellGrid,
               Scope, Panel, Block, SpatialObject), pcb/ (procedural router +
               PCBVisualization), stations/ (one per section), projects/ (ProjectScene
               + 8 scenes)
  ui/          Overlay, Navigation, HUD + progress rail, SectionTransition,
               sections/ (HeroPanel, IdentityPanel, StackPanel, ProjectViewer,
               CareerPanel, EvidencePanel, FinalPanel)
```

**Motion model.** `core/timeline.ts` defines camera stops. Each stop has a *transition*, where the camera flies and content hides, and a *hold*, where the camera rests and content reveals after a brief pause. On wheel or trackpad, a small push into a transition commits the whole flight, which runs on a fixed, distance-scaled timeline. The rest of that gesture's momentum is absorbed, so one swipe moves one stop and the camera never stalls mid-flight. Touch uses native scrolling with idle snapping, and the keyboard uses the same flights.

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
