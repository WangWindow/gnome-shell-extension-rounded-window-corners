# Data Model: Window Lifecycle and Appearance

This feature uses in-process lifecycle records plus existing GSettings values. It does not add persistent storage or a new public entity format.

## Extension Activation

Represents one enabled instance of the extension.

| Field | Type | Meaning |
|---|---|---|
| `state` | `disabled \| waiting-for-startup \| active \| disabling` | Current lifecycle phase. |
| `generation` | integer token | Identifies this activation. Increment/invalidate before teardown so late async continuations cannot mutate Shell state. |
| `signalConnections` | owned connection records | Global and per-window GObject signal connections created by this activation. |
| `pendingSources` | owned GLib source IDs | Timeouts or deferred callbacks that must be removed when their owner ends. |
| `windowRecords` | map keyed by actor identity | Window work and effect resources owned by this activation. |

### State transitions

`disabled → waiting-for-startup → active → disabling → disabled`, or `disabled → active` when Shell startup is already complete. `disable()` remains synchronous. Transitioning to `disabling` invalidates the current generation before cleanup begins.

## Window Lifecycle Record

Represents one compositor actor managed by an activation.

| Field | Type | Meaning |
|---|---|---|
| `actor` | `Meta.WindowActor` / `RoundedWindowActor` | Shell-owned actor reference; never destroy the window actor itself. |
| `metaWindow` | `Meta.Window` | Associated window while it remains managed. |
| `generation` | integer token | Activation generation captured when processing began. |
| `state` | `discovered \| waiting-for-class \| waiting-for-content \| evaluating \| applied \| skipped \| closed` | Current processing state. |
| `connections` | owned connection records | Readiness, destroy, and per-window update listeners for this record. |
| `pendingSources` | owned GLib source IDs | Deferred work associated with this window. |
| `effect` | optional named Clutter effect | Rounded-corner effect attached to the actor. |
| `shadow` | optional extension-owned actor | Shadow actor placed in the window group and removed on cleanup. |
| `bindings` | GObject bindings | Actor-to-shadow bindings that must be unbound on cleanup. |
| `eligibility` | `eligible \| excluded \| unsafe \| unknown` | Result of global, per-app, category, and window-type rules. |

### State and validation rules

- A record advances only while its activation generation is current and its actor/window is still live.
- Missing WM class, missing first child, and a null texture are readiness states, not reasons to dereference unavailable data.
- At most one active effect/shadow set may be owned by an actor for this extension.
- A destroyed actor transitions to `closed`; all listeners, sources, bindings, effects, and shadow actors owned by the record are released.
- `skipped` leaves the Shell-owned actor intact and must not prevent other records from being processed.
- Async eligibility work revalidates generation and actor/window liveness after every suspension point and before accessing settings or installing effects.

## Window Appearance Profile

The global profile and optional per-application profiles determine effect uniforms and shadow behavior.

| Field | Existing setting | Validation/meaning |
|---|---|---|
| `enabled` | `global-rounded-corner-settings.enabled` | Boolean master switch for rounding. |
| `borderRadius` | `global-rounded-corner-settings.borderRadius` | Non-negative radius bounded by the drawable content area. |
| `smoothing` | `global-rounded-corner-settings.smoothing` | Smoothing factor used by the corner shader. |
| `padding` | `global-rounded-corner-settings.padding` | Non-negative `left`, `right`, `top`, and `bottom` offsets. |
| `borderWidth` | `border-width` | Integer schema range −40…40; applies to global effect rendering. |
| `borderColor` | `global-rounded-corner-settings.borderColor` | Four-channel color. |
| `keepRoundedCorners.maximized` | nested profile field | Whether corners remain on maximized windows. |
| `keepRoundedCorners.fullscreen` | nested profile field | Whether corners remain on fullscreen windows. |
| `focusedShadow` / `unfocusedShadow` | `focused-shadow` / `unfocused-shadow` | Offset, blur, spread, and opacity values for focus states. |
| `keepShadowForMaximizedFullscreen` | `keep-shadow-for-maximized-fullscreen` | Whether shadows remain for maximized/fullscreen windows. |

The profile is selected from the global settings plus any enabled custom profile for the window’s application class. If no custom profile exists, use the global values. Exact nested variant keys/types and schema defaults remain defined by the existing GSettings schema and are preserved; see [preferences-settings.md](contracts/preferences-settings.md).

## Application Rule

An application rule uses the window’s WM class instance to choose eligibility and optional profile overrides.

| Field | Type/source | Meaning |
|---|---|---|
| `wmClassInstance` | string; `blacklist` string array | Application identifier used by existing list/profile logic. |
| `listMode` | `whitelist` boolean | `false`: listed apps are excluded; `true`: listed apps are included. |
| `profile` | entry in `custom-rounded-corner-settings` | Optional enabled per-app appearance override. |
| `categoryCompatibility` | existing booleans | Libadwaita and libhandy category skip preferences. |

Duplicate WM class entries are rejected in preferences. App-specific or category handling must not override the user’s list mode in an undocumented way; implementation must preserve a deterministic eligibility decision and cover interactions described in spec scenarios.

## D-Bus Window Picker

The preferences process requests a pick operation from the Shell process. The selected class is sent back as a `picked(window: string)` signal. Exact wire signatures are in [window-picker-dbus.md](contracts/window-picker-dbus.md).
