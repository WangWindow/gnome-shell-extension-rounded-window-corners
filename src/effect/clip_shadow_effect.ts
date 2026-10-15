/** @file Clips the shadow's interior using native paint geometry. */

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import type St from 'gi://St';

import type { Bounds } from '../utils/types.js';
import { paintTexture, roundedStrips, textureBounds } from './texture.js';

export const ClipShadowEffect = GObject.registerClass(
  class ClipShadowEffect extends Clutter.OffscreenEffect {
    vfunc_paint_target(node: Clutter.PaintNode, _context: Clutter.PaintContext) {
      const child = this.actor.firstChild as St.Bin | null;
      if (!child?.has_allocation()) return;

      const scale = this.actor.get_resource_scale();
      const box = child.get_allocation_box();
      const bounds = textureBounds(this, box);
      const texture = this.get_texture();
      if (!texture) return;
      const width = texture.get_width();
      const height = texture.get_height();
      const radius = child.get_theme_node().get_border_radius(0) * scale;
      const rectangles: Bounds[] = [
        { x1: 0, y1: 0, x2: width, y2: bounds.y1 },
        { x1: 0, y1: bounds.y2, x2: width, y2: height },
      ];
      for (const strip of roundedStrips(bounds, radius)) {
        rectangles.push(
          { x1: 0, y1: strip.y1, x2: strip.x1, y2: strip.y2 },
          { x1: strip.x2, y1: strip.y1, x2: width, y2: strip.y2 },
        );
      }
      paintTexture(this, node, rectangles);
    }
  },
);
