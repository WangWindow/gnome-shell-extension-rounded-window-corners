/**
 * @file Clips shadows for windows.
 *
 * Needed because of this issue:
 * https://gitlab.gnome.org/GNOME/gnome-shell/-/issues/4474
 */

import Cogl from 'gi://Cogl';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';

import {
  ClutterShaderEffect,
  createFragmentSnippet,
  usesLegacyShaderEffect,
} from './shader_effect.js';
import { readShader } from '../utils/file.js';

const [declarations, code] = await readShader(
  import.meta.url,
  'shader/clip_shadow.frag',
);

export const ClipShadowEffect = usesLegacyShaderEffect
  ? GObject.registerClass(
    {},
    class extends Shell.GLSLEffect {
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
    class extends ClutterShaderEffect!{
      vfunc_get_static_snippet() {
        return createFragmentSnippet(declarations, code);
      }
    },
  );
