# Implementation Plan: Complete and Stabilize the Rounded Corners Extension

**Branch**: `001-stabilize-rounded-windows` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-stabilize-rounded-windows/spec.md`

## Summary

Complete the extension’s existing window, settings, preferences, and packaging flows while making window effect attachment safe across GNOME Shell startup, window mapping, asynchronous eligibility checks, window destruction, and extension disable. Use tracked per-window lifecycle state and invalidate pending work synchronously during teardown. Correct the confirmed shader bounds indexing defect. The available evidence identifies lifecycle races and readiness gaps but does not establish the reported desktop crash’s exact root cause; the implementation and runtime validation must therefore cover the whole startup-to-teardown path rather than treating one suspected race as proven.

## Technical Context

**Language/Version**: TypeScript, targeting ES2022; strict compiler settings.

**Primary Dependencies**: GNOME Shell/GJS 50 and 51; Mutter, Clutter, Cogl, Shell, St, GLib/GObject; GTK 4/libadwaita preferences APIs. Use existing GNOME introspection dependencies and project scripts; no new runtime dependency is planned.

**Storage**: GSettings schema `org.gnome.shell.extensions.rounded-window-corners` at `/org/gnome/shell/extensions/rounded-window-corners/`; global and per-application values are stored in existing schema keys. No external database or service storage.

**Testing**: The repository currently has no discovered automated test suite or test script. Implementation checks should include `npm run build`, `npm run pack`, schema validation through the existing build workflow, and manual Shell 50/51 Wayland validation in a disposable VM or snapshot. Exercise the 100 open/close cycle acceptance criterion from the spec. Do not treat a build-only check as proof of compositor stability.

**Target Platform**: GNOME Shell 50 and 51 on Wayland, matching `resources/metadata.json` and the supported runtime guidance.

**Project Type**: TypeScript GNOME Shell extension with a separate GTK preferences process, GSettings configuration, shader effects, and a small D-Bus window-picker interface.

**Performance Goals**: Keep startup and window handling responsive; bound signal handlers, timeouts, and deferred readiness callbacks to the window/session that owns them. Preserve the spec’s 100 window open/close cycle stability target.

**Constraints**: `disable()` must remain synchronous on GNOME Shell 51. A `Meta.WindowActor` may exist before its texture is available. Async eligibility checks may outlive a window or extension activation. Maintain supported Shell 50/51 shader compatibility, persisted settings, existing D-Bus behavior, and ordinary behavior for windows skipped by the extension.

**Scale/Scope**: One Shell session, its existing and newly created top-level windows, current global and per-application settings, and the existing preferences, window-picker, build, install, and package paths.

## Constitution Check

**Pre-design gate: PASS**

- Changes can remain focused on the specified window lifecycle, settings, compatibility, and packaging behavior.
- The implementation can follow existing TypeScript and GNOME extension patterns without adding dependencies or unrelated abstractions.
- Verification can use project-defined build/package commands and manual runtime scenarios; no test framework is required to create this plan.
- No constitution exception is identified.

**Post-design gate: PASS**

- The design records lifecycle and ownership boundaries without introducing a new project layer or external service.
- Public settings and D-Bus interfaces are documented as compatibility contracts; preserving those contracts keeps the scope reviewable.
- Runtime validation is limited to advertised Shell versions and the extension’s actual Wayland target.

## Project Structure

### Documentation (this feature)

```text
specs/001-stabilize-rounded-windows/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── preferences-settings.md
│   └── window-picker-dbus.md
└── tasks.md                 # Created by $speckit-tasks, not this command
```

### Source Code (repository root)

```text
src/
├── effect/                  # Clutter shader effects and shader assets
├── manager/                 # Window lifecycle, event handlers, eligibility rules
├── patch/                   # Reversible Shell method overrides
├── preferences/             # GTK preferences pages and widgets
├── utils/                   # Settings, types, logging, shared helpers
├── window_picker/           # D-Bus window selection service and client
├── extension.ts             # Extension enable/disable lifecycle
└── prefs.ts                 # Preferences process entry point
resources/
├── metadata.json
├── schemas/                 # GSettings interface
└── *.css
scripts/tasks.mjs            # Existing build/install/package workflows
```

**Structure Decision**: Keep the existing single-extension layout. Implement lifecycle changes in `src/manager/` and `src/extension.ts`, rendering fixes in `src/effect/`, and only touch preferences/schema code where the existing feature requirements are not already complete. Preserve the D-Bus and GSettings boundaries documented under `contracts/`.

## Complexity Tracking

No constitution violations or additional architecture are proposed.
