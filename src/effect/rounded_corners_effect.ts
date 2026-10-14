/** @file Binds the actual corner rounding shader to the windows. */

import type Clutter from 'gi://Clutter';
import type { Bounds, RoundedCornerSettings } from '../utils/types.js';

import Cogl from 'gi://Cogl';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';

import {
  ClutterShaderEffect,
  createFragmentSnippet,
  usesLegacyShaderEffect,
  type ModernShaderEffect,
} from './shader_effect.js';
import { readShader } from '../utils/file.js';
import { getPref } from '../utils/settings.js';

const [declarations, code] = await readShader(
  import.meta.url,
  'shader/rounded_corners.frag',
);

class Uniforms {
  bounds: number | string = 'bounds';
  clipRadius: number | string = 'clipRadius';
  borderWidth: number | string = 'borderWidth';
  borderColor: number | string = 'borderColor';
  borderedAreaBounds: number | string = 'borderedAreaBounds';
  borderedAreaClipRadius: number | string = 'borderedAreaClipRadius';
  exponent: number | string = 'exponent';
  pixelStep: number | string = 'pixelStep';
}

const uniforms = new Uniforms();

function cacheLegacyUniformLocations(effect: Clutter.Effect) {
  if (!usesLegacyShaderEffect) {
    return;
  }

  const legacyEffect = effect as unknown as Shell.GLSLEffect;
  const uniformNames = Object.keys(uniforms) as (keyof Uniforms)[];
  for (const name of uniformNames) {
    uniforms[name] = legacyEffect.get_uniform_location(name);
  }
}

function updateRoundedCornerUniforms(
  effect: Clutter.Effect,
  config: RoundedCornerSettings,
  windowBounds: Bounds,
) {
  const borderWidth = getPref('border-width');
  const borderColor = config.borderColor;

  const outerRadius = config.borderRadius;
  const { padding, smoothing } = config;

  const bounds = [
    windowBounds.x1 + padding.left,
    windowBounds.y1 + padding.top,
    windowBounds.x2 - padding.right,
    windowBounds.y2 - padding.bottom,
  ];

  const borderedAreaBounds = [
    bounds[0] + borderWidth,
    bounds[1] + borderWidth,
    bounds[2] - borderWidth,
    bounds[3] - borderWidth,
  ];

  let borderedAreaRadius = outerRadius - borderWidth;
  if (borderedAreaRadius < 0.001) {
    borderedAreaRadius = 0.0;
  }

  const pixelStep = [
    1 / effect.actor.get_width(),
    1 / effect.actor.get_height(),
  ];

  // This is needed for squircle corners
  let exponent = smoothing * 10 + 2;
  let radius = outerRadius * 0.5 * exponent;
  const maxRadius = Math.min(
    bounds[3] - bounds[0],
    bounds[4] - bounds[1],
  );
  if (radius > maxRadius) {
    exponent *= maxRadius / radius;
    radius = maxRadius;
  }
  borderedAreaRadius *= radius / outerRadius;

  setUniforms(
    effect,
    bounds,
    radius,
    borderWidth,
    borderColor,
    borderedAreaBounds,
    borderedAreaRadius,
    pixelStep,
    exponent,
  );
}

function setUniforms(
  effect: Clutter.Effect,
  bounds: number[],
  radius: number,
  borderWidth: number,
  borderColor: [number, number, number, number],
  borderedAreaBounds: number[],
  borderedAreaRadius: number,
  pixelStep: number[],
  exponent: number,
) {
  setUniformFloat(effect, 'bounds', uniforms.bounds, 4, bounds);
  setUniformFloat(effect, 'clipRadius', uniforms.clipRadius, 1, [radius]);
  setUniformFloat(effect, 'borderWidth', uniforms.borderWidth, 1, [borderWidth]);
  setUniformFloat(effect, 'borderColor', uniforms.borderColor, 4, borderColor);
  setUniformFloat(
    effect,
    'borderedAreaBounds',
    uniforms.borderedAreaBounds,
    4,
    borderedAreaBounds,
  );
  setUniformFloat(
    effect,
    'borderedAreaClipRadius',
    uniforms.borderedAreaClipRadius,
    1,
    [borderedAreaRadius],
  );
  setUniformFloat(effect, 'pixelStep', uniforms.pixelStep, 2, pixelStep);
  setUniformFloat(effect, 'exponent', uniforms.exponent, 1, [exponent]);
  effect.queue_repaint();
}

function setUniformFloat(
  effect: Clutter.Effect,
  name: string,
  location: number | string,
  nComponents: number,
  values: number[],
) {
  if (usesLegacyShaderEffect) {
    (effect as unknown as Shell.GLSLEffect).set_uniform_float(
      location as number,
      nComponents,
      values,
    );
  } else {
    (effect as unknown as ModernShaderEffect).set_uniform_float(
      name,
      nComponents,
      values,
    );
  }
}

export const RoundedCornersEffect = usesLegacyShaderEffect
  ? GObject.registerClass(
    {},
    class RoundedCornersEffect extends Shell.GLSLEffect {
      constructor() {
        super();
        cacheLegacyUniformLocations(this);
      }

      updateUniforms(config: RoundedCornerSettings, windowBounds: Bounds) {
        updateRoundedCornerUniforms(this, config, windowBounds);
      }

      vfunc_build_pipeline() {
        this.add_glsl_snippet(
          Cogl.SnippetHook.FRAGMENT,
          declarations,
          code,
          false,
        );
      }
    },
  )
  : GObject.registerClass(
    {},
    class RoundedCornersEffect extends ClutterShaderEffect! {
      updateUniforms(config: RoundedCornerSettings, windowBounds: Bounds) {
        updateRoundedCornerUniforms(this, config, windowBounds);
      }

      vfunc_get_static_snippet() {
        return createFragmentSnippet(declarations, code);
      }
    },
  );
