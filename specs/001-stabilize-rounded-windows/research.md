# Research: Complete and Stabilize the Rounded Corners Extension

## Decisions

### Window creation and rendering readiness are separate states

**Decision**: Treat actor discovery, application metadata readiness, content/texture readiness, effect installation, and window destruction as separate lifecycle milestones. Track callbacks used to wait for readiness and disconnect or invalidate them when the actor/window is destroyed or the extension activation ends. Do not assume that `window-created` means a texture is ready.

**Rationale**: Mutter documents that the compositor actor exists when `window-created` is emitted, while `get_texture()` can return `NULL` before the window is mapped. The current `applyEffectTo()` waits for a first child, but returns permanently if the texture is absent. A readiness retry is needed to avoid missed decoration, with callback ownership bounded by the window lifecycle. These facts describe a readiness gap, not proof of the reported crash.

**Alternatives considered**: Treat every null actor or texture as a fatal error; defer every window until its first frame without tracking cancellation; silently skip the window permanently. The first option risks destabilizing Shell, the second leaves stale callbacks, and the third misses decoration for windows that become ready shortly afterward.

Sources: [Mutter `window-created`](https://mutter.gnome.org/meta/signal.Display.window-created.html), [Mutter `first-frame`](https://mutter.gnome.org/meta/signal.WindowActor.first-frame.html), [Mutter `WindowActor.get_texture()`](https://mutter.gnome.org/meta/method.WindowActor.get_texture.html), [Mutter `WindowActor`](https://gnome.pages.gitlab.gnome.org/mutter/meta/class.WindowActor.html).

### Invalidate asynchronous work before synchronous teardown

**Decision**: Use an activation generation or equivalent cancellation state. Every async window operation captures the activation/window identity, checks it again after awaits and before mutating actors or reading settings, and exits when stale. Track per-window signal connections and main-loop sources. Catch and log rejected async handler work at signal boundaries. In `disable()`, invalidate outstanding work before removing effects, disconnecting callbacks, restoring patches, and uninitializing settings.

**Rationale**: `shouldEnableEffect()` can await app-type detection that reads `/proc/<pid>/maps`. Meanwhile a window may be destroyed or `disable()` may remove effects and null the settings reference. Current event callers drop returned promises, so late work can touch stale actors/settings or reject unhandled. GNOME’s extension guidance requires cleanup of extension-owned state and signal handlers in `disable()`, and Shell 51 requires `disable()` to stay synchronous.

**Alternatives considered**: Await all operations in `disable()` (incompatible with the synchronous lifecycle contract); rely on actor destruction/GC without invalidating promises; or remove only currently attached effects. None prevents a pending continuation from resuming after teardown.

Sources: [GNOME extension review guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html), [GNOME Shell 51 porting guide](https://gjs.guide/extensions/upgrading/gnome-shell-51.html), [GJS extension lifecycle](https://gjs.guide/extensions/topics/extension.html).

### Keep the reported crash root cause open until reproduced

**Decision**: Treat the asynchronous lifetime race as a confirmed safety defect and a high-priority crash hypothesis, not as the proven cause. Add startup and teardown stress validation that captures Shell logs/backtraces and confirms the session remains interactive.

**Rationale**: Static inspection confirms async work can resume after destruction/disable, but does not show that this necessarily terminates the compositor. The observed failure could involve another supported-version-specific rendering or lifecycle interaction. A reproducible runtime trace is required to assign root cause.

**Alternatives considered**: Attribute the crash to the first suspicious async callback or to shader math alone. Neither conclusion is supported by current evidence.

Sources: [GJS extension debugging](https://gjs.guide/extensions/development/debugging.html).

### Fix the confirmed bounds-indexing defect independently

**Decision**: Correct the maximum-radius calculation to use the four existing bounds entries (`left`, `top`, `right`, `bottom`) and cover small-window clamping in rendering validation.

**Rationale**: `rounded_corners_effect.ts` builds a four-element `bounds` array but reads `bounds[4]`; this yields `undefined` and makes `maxRadius` `NaN`. This is a definite rendering bug, although current evidence does not connect it to the desktop crash.

**Alternatives considered**: Leave it out because it is not proven to crash Shell; fold it into a broad shader rewrite. The first leaves a clear defect in the requested extension stabilization, while the second expands scope unnecessarily.

### Preserve both advertised shader paths and synchronous extension lifecycle

**Decision**: Validate rendering under Shell 50 and 51, retaining the existing version-aware shader path unless implementation research finds it is not viable. Keep extension disable synchronous and make cleanup explicit for extension-owned actors, bindings, signals, and GLib sources.

**Rationale**: Project metadata advertises Shell 50/51. GNOME’s 51 upgrade guide states that `Shell.GLSLEffect` was removed in 51 in favor of `Clutter.ShaderEffect` and `Cogl.Snippet`; this extension already contains version-aware shader code. GNOME’s lifecycle guidance requires signal/source cleanup, and Shell 51 rejects async `disable()`.

**Alternatives considered**: Drop one advertised Shell version or replace the shader architecture without evidence. Either would introduce unnecessary compatibility or implementation risk.

Sources: [GNOME Shell 51 porting guide](https://gjs.guide/extensions/upgrading/gnome-shell-51.html#shellglsleffect), [Mutter `Clutter.ShaderEffect`](https://gnome.pages.gitlab.gnome.org/mutter/clutter/class.ShaderEffect.html), [GNOME extension review guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html).

### Use isolated, disposable runtime validation

**Decision**: Run the planned startup/crash matrix in disposable VM snapshots where available. A nested Shell may be used for development, but it is not considered full isolation. Test only the advertised 50/51 Wayland configurations.

**Rationale**: GJS recommends starting a fresh Shell process for extension testing because JS modules cannot be unloaded. Its GNOME 49+ nested launch applies to 50/51 but the debugging guide explicitly warns that nested Shell is not fully isolated. GNOME Shell 50 removed X11 support.

**Alternatives considered**: Rely only on compilation or use the active desktop session for crash reproduction. Compilation cannot establish compositor safety; active-session failure has avoidable user impact.

Sources: [GJS debugging guide](https://gjs.guide/extensions/development/debugging.html), [GNOME Shell 50 upgrade guide](https://gjs.guide/extensions/upgrading/gnome-shell-50.html).

## Implementation notes to verify

- `applyEffectTo()` currently returns if `get_texture()` is null and does not schedule a retry (`src/manager/event_manager.ts`). Readiness callbacks need explicit ownership and cleanup.
- New-window event paths invoke async handlers without awaiting/catching their promises. Pending work can continue after actor destruction or preference teardown (`src/manager/event_handlers.ts`, `src/manager/utils.ts`, `src/extension.ts`).
- The per-actor promise lock serializes work but currently has no activation cancellation or post-await actor-liveness check.
- `src/manager/utils.ts` calls `logError(e)` without importing it, while `src/utils/log.ts` exports `logError`. Confirm and resolve this strict-TypeScript build issue during implementation.
- The extension exposes global/per-app configuration and a D-Bus window-picker interface; see the contracts. Preserve schema key types/defaults and D-Bus method/signal signatures.
- No automated test harness or test command was found. The repository’s documented runnable checks are build, install, pack, and translation updates; runtime compositor checks remain necessary for the crash requirement.
