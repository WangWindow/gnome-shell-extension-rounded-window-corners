# `effect`

Window corners and shadow interiors are clipped with native Clutter textured
rectangles. No custom GPU programs are loaded or compiled by the extension.

`rounded_corners_effect.ts` draws the window inside a rounded rectangle.
`clip_shadow_effect.ts` draws only the area outside the shadow's rounded body,
so transparent windows do not acquire an opaque background.
The shadow body has a transparent fill: St generates its shadow from the rounded
silhouette, without white edge texels leaking through during window movement.
`texture.ts` builds the disjoint strips and draws them through the pipeline
provided by `Clutter.OffscreenEffect`, preserving opacity and transformations.

Border colors, border widths and squircle smoothing are no longer supported.
