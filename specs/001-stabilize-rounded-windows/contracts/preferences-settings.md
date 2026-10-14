# Preferences and GSettings Contract

The extension and preferences process share the schema `org.gnome.shell.extensions.rounded-window-corners` at `/org/gnome/shell/extensions/rounded-window-corners/`. Implementations must preserve active key names, value types, and defaults unless a separately reviewed migration is introduced.

| Key | Type | Existing default / purpose |
|---|---|---|
| `settings-version` | `u` | `0`; migration marker. |
| `whitelist` | `b` | `false`; selects inclusion mode when true. |
| `blacklist` | `as` | `[]`; WM class instance entries. |
| `skip-libadwaita-app` | `b` | `true`; category compatibility preference. |
| `skip-libhandy-app` | `b` | `false`; category compatibility preference. |
| `border-width` | `i` | `0`, schema range −40…40. |
| `global-rounded-corner-settings` | `a{sv}` | Global enabled flag, border radius, smoothing, border color, four-sided padding, and maximized/fullscreen corner behavior. |
| `custom-rounded-corner-settings` | `a{sv}` | `{}`; application-specific profile map. |
| `focused-shadow` | `a{si}` | Focused shadow offsets, blur, spread, and opacity. |
| `unfocused-shadow` | `a{si}` | Unfocused shadow offsets, blur, spread, and opacity. |
| `keep-shadow-for-maximized-fullscreen` | `b` | `false`. |
| `debug-mode` | `b` | `false`; controls diagnostic logging. |

## Behavioral contract

- Settings survive extension disable/enable and preferences reopenings through GSettings.
- Reset returns values to schema defaults.
- List entries identify the WM class instance and duplicates are rejected with a clear preferences message.
- `whitelist=false` excludes listed apps; `whitelist=true` includes listed apps.
- Per-application profiles override the corresponding global appearance values only for that application; removing a profile returns to global settings.
- Setting changes are reflected on eligible open windows without requiring a Shell restart.
- Async window work must not read the settings singleton after it has been uninitialized during extension disable.

Source of truth: `resources/schemas/org.gnome.shell.extensions.rounded-window-corners.gschema.xml` and its existing settings helpers.
