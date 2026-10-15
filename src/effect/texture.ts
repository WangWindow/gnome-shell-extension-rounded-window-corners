/** @file Builds textured rectangles without custom rendering programs. */

import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';

import type { Bounds } from '../utils/types.js';

/** Map actor coordinates into Clutter's padded offscreen texture. */
export function textureBounds(
  effect: Clutter.OffscreenEffect,
  bounds: Bounds,
): Bounds {
  const actor = effect.actor;
  const volume = actor.get_paint_volume();
  const origin = volume?.get_origin();
  const width = volume?.get_width() ?? actor.width;
  const height = volume?.get_height() ?? actor.height;
  // Match _clutter_actor_box_enlarge_for_effects(): the extra three pixels
  // are not distributed evenly, so half the texture size difference is wrong.
  const offsetX =
    Math.ceil((origin?.x ?? 0) + width + 0.75) - Math.round(width) - 3;
  const offsetY =
    Math.ceil((origin?.y ?? 0) + height + 0.75) - Math.round(height) - 3;
  const scale = actor.get_resource_scale();
  return {
    x1: (bounds.x1 - offsetX) * scale,
    y1: (bounds.y1 - offsetY) * scale,
    x2: (bounds.x2 - offsetX) * scale,
    y2: (bounds.y2 - offsetY) * scale,
  };
}

/** Cover a rounded rectangle with disjoint strips, at physical pixel resolution. */
export function roundedStrips(bounds: Bounds, radius: number): Bounds[] {
  const { x1, y1, x2, y2 } = bounds;
  if (x2 <= x1 || y2 <= y1) return [];
  const r = Math.max(0, Math.min(radius, (x2 - x1) / 2, (y2 - y1) / 2));
  if (r === 0) return [bounds];

  const strips: Bounds[] = [];
  const steps = Math.ceil(r);
  for (let i = 0; i < steps; i++) {
    const top = r * i / steps;
    const bottom = r * (i + 1) / steps;
    const dy = r - (top + bottom) / 2;
    const inset = r - Math.sqrt(Math.max(0, r * r - dy * dy));
    strips.push(
      { x1: x1 + inset, y1: y1 + top, x2: x2 - inset, y2: y1 + bottom },
      { x1: x1 + inset, y1: y2 - bottom, x2: x2 - inset, y2: y2 - top },
    );
  }
  if (y2 - y1 > 2 * r) {
    strips.push({ x1, y1: y1 + r, x2, y2: y2 - r });
  }
  return strips;
}

/** Preserve Clutter's texture, opacity and transforms when drawing each strip. */
export function paintTexture(
  effect: Clutter.OffscreenEffect,
  node: Clutter.PaintNode,
  rectangles: Bounds[],
) {
  const texture = effect.get_texture();
  const sourcePipeline = effect.get_pipeline();
  if (!texture || !sourcePipeline) return;

  const width = texture.get_width();
  const height = texture.get_height();
  if (width <= 0 || height <= 0) return;

  const pipeline = sourcePipeline.copy();
  const opacity = effect.actor.get_paint_opacity() / 255;
  const color = new Cogl.Color();
  color.init_from_4f(opacity, opacity, opacity, opacity);
  pipeline.set_color(color);
  const target = Clutter.PipelineNode.new(pipeline);
  for (const rect of rectangles) {
    const x1 = Math.max(0, rect.x1);
    const y1 = Math.max(0, rect.y1);
    const x2 = Math.min(width, rect.x2);
    const y2 = Math.min(height, rect.y2);
    if (x2 <= x1 || y2 <= y1) continue;
    target.add_texture_rectangle(
      new Clutter.ActorBox({ x1, y1, x2, y2 }),
      x1 / width, y1 / height, x2 / width, y2 / height,
    );
  }
  node.add_child(target);
}
