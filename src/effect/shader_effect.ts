/** @file Provides helpers for the shader APIs used by GNOME Shell 50 and 51. */

import type Clutter from 'gi://Clutter';
import type Cogl from 'gi://Cogl';

import ClutterRuntime from 'gi://Clutter';
import CoglRuntime from 'gi://Cogl';
import Shell from 'gi://Shell';

/**
 * The Clutter.ShaderEffect API used by GNOME Shell 51. The installed GNOME 50
 * GIR types do not describe this API yet, so its runtime shape is declared here.
 */
export type ModernShaderEffect = Clutter.Effect & {
  get_pipeline: () => Cogl.Pipeline | null;
  set_uniform_float: (
    name: string,
    nComponents: number,
    values: number[],
  ) => void;
  vfunc_paint_target(): boolean;
};

const LegacyShaderEffect = (
  Shell as unknown as { GLSLEffect?: typeof Shell.GLSLEffect }
).GLSLEffect;

/** Shell.GLSLEffect is present through GNOME 50 and removed in GNOME 51. */
export const usesLegacyShaderEffect = LegacyShaderEffect !== undefined;

export const ClutterShaderEffect = (
  ClutterRuntime as unknown as {
    ShaderEffect?: new () => ModernShaderEffect;
  }
).ShaderEffect;

if (!usesLegacyShaderEffect && !ClutterShaderEffect) {
  throw new Error('Clutter.ShaderEffect is unavailable');
}

/** Create a Cogl snippet for the fragment shader used by Clutter.ShaderEffect. */
export function createFragmentSnippet(declarations: string, code?: string) {
  const snippet = new CoglRuntime.Snippet(
    CoglRuntime.SnippetHook.FRAGMENT,
    declarations,
    null,
  );

  if (code !== undefined) {
    snippet.set_replace(code);
  }

  return snippet;
}
