import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';

export interface LabelStyle {
  size?: number;
  weight?: number;
  mono?: boolean;
  tracking?: number;
  color?: string;
}

const cache = new Map<string, { texture: CanvasTexture; aspect: number }>();

/** Renders crisp text into a small cached canvas texture (chip markings, panel labels). */
export function labelTexture(text: string, style: LabelStyle = {}) {
  const size = style.size ?? 64;
  const weight = style.weight ?? 500;
  const tracking = style.tracking ?? size * 0.08;
  const color = style.color ?? '#ffffff';
  const family = style.mono === false ? '"Geist Variable", system-ui, sans-serif' : '"Geist Mono Variable", ui-monospace, monospace';
  const key = `${text}|${size}|${weight}|${tracking}|${color}|${family}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = `${weight} ${size}px ${family}`;
  const apply = () => {
    ctx.font = font;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${tracking}px`;
  };
  apply();
  const w = Math.ceil(ctx.measureText(text).width + size * 0.5);
  const h = Math.ceil(size * 1.3);
  canvas.width = w;
  canvas.height = h;
  apply();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size * 0.25, h / 2 + size * 0.04);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.minFilter = LinearMipmapLinearFilter;
  const entry = { texture, aspect: w / h };
  cache.set(key, entry);
  return entry;
}
