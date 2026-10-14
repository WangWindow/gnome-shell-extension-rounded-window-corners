/**
 * @file Applies linear interpolation to a window. This is used to make windows
 * in the overview look better.
 */

import type Clutter from 'gi://Clutter';

import Cogl from 'gi://Cogl';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';

import {
  ClutterShaderEffect,
  createFragmentSnippet,
  usesLegacyShaderEffect,
  type ModernShaderEffect,
} from './shader_effect.js';

export const LinearFilterEffect = usesLegacyShaderEffect
  ? GObject.registerClass(
    {},
    class extends Shell.GLSLEffect {
      vfunc_build_pipeline() {
        this.add_glsl_snippet(Cogl.SnippetHook.FRAGMENT, '', '', false);
      }

      vfunc_paint_target(
        node: Clutter.PaintNode,
        ctx: Clutter.PaintContext,
      ) {
        this.get_pipeline()?.set_layer_filters(
          0,
          Cogl.PipelineFilter.LINEAR_MIPMAP_LINEAR,
          Cogl.PipelineFilter.LINEAR,
        );
        super.vfunc_paint_target(node, ctx);
      }
    },
  )
  : GObject.registerClass(
    {},
    class extends ClutterShaderEffect!{
      vfunc_get_static_snippet() {
        return createFragmentSnippet('');
      }

      vfunc_paint_target() {
        (this as ModernShaderEffect)
          .get_pipeline()
          ?.set_layer_filters(
            0,
            Cogl.PipelineFilter.LINEAR_MIPMAP_LINEAR,
            Cogl.PipelineFilter.LINEAR,
          );
        return super.vfunc_paint_target();
      }
    },
  );
