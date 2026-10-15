/** @file Rounds window textures using native Clutter paint geometry. */

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';

import type { Bounds, RoundedCornerSettings } from '../utils/types.js';
import { paintTexture, roundedStrips, textureBounds } from './texture.js';

export const RoundedCornersEffect = GObject.registerClass(
  class RoundedCornersEffect extends Clutter.OffscreenEffect {
    private bounds: Bounds | null = null;
    private radius = 0;

    update(config: RoundedCornerSettings, bounds: Bounds) {
      this.bounds = {
        x1: bounds.x1 + config.padding.left,
        y1: bounds.y1 + config.padding.top,
        x2: bounds.x2 - config.padding.right,
        y2: bounds.y2 - config.padding.bottom,
      };
      this.radius = config.borderRadius;
      this.queue_repaint();
    }

    vfunc_paint_target(node: Clutter.PaintNode, context: Clutter.PaintContext) {
      if (!this.bounds) {
        super.vfunc_paint_target(node, context);
        return;
      }

      const scale = this.actor.get_resource_scale();
      const bounds = textureBounds(this, this.bounds);
      paintTexture(this, node, roundedStrips(bounds, this.radius * scale));
    }
  },
);
