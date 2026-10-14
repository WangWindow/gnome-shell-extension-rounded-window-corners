# Quickstart: Stability and Feature Validation

This guide is for implementation validation. It does not claim that the current checkout has passed these checks.

## Prerequisites

- Node.js and npm
- `gettext` and `glib-compile-schemas`
- A disposable VM/snapshot with GNOME Shell 50 or 51 on Wayland
- The extension’s documented development dependencies installed

Use a disposable environment for crash testing. A nested Shell is useful for iteration but is not fully isolated from the host session.

## Build and package

From the repository root:

```sh
npm install
npm run build
npm run pack
```

Expected result: TypeScript and resource compilation complete without errors, and the package command creates the extension archive using the repository’s existing build workflow. If compilation reports the existing `logError` import issue in `src/manager/utils.ts`, resolve it before proceeding.

## Install and enable

In the disposable GNOME user session:

```sh
npm run install-extension
gnome-extensions enable rounded-window-corners@choco2233
```

Start Shell with GJS diagnostics when reproducing in a fresh session, using the documented runtime syntax for the target distribution. For GNOME 49 and later, the GJS guide documents:

```sh
SHELL_DEBUG=all dbus-run-session gnome-shell --devkit --wayland
```

The exact available flags and devkit command can vary by installed distro; consult its GNOME Shell/GJS build. A disposable VM or snapshot remains the safety boundary.

## Runtime scenarios

Run on both advertised Shell releases, 50 and 51:

1. Enable the extension while Shell is finishing startup; immediately launch several applications. Confirm Shell stays interactive and eligible windows receive rounded corners once their content is ready.
2. Open and close windows repeatedly for 100 cycles, including windows whose WM class or texture becomes available after actor creation. Confirm no crash, unhandled promise rejection, stale effect, or stuck readiness callback.
3. Close a window while eligibility detection is pending. Confirm no later callback attaches effects to the destroyed actor.
4. Disable the extension while windows are open and while window updates are pending. Confirm effects, shadow actors, bindings, signal handlers, and sources are released; re-enable and confirm each window is processed once.
5. Resize small windows and check that corner radius remains bounded and finite. Resize, focus, minimize/restore, move workspace/monitor, maximize, and fullscreen windows.
6. Exercise blacklist and whitelist mode, duplicate app entries, a custom profile, category skips, and preferences reopen/reset persistence.
7. Review Shell logs for JS exceptions, rejected promises, warnings/backtraces, and compositor failures. Confirm excluded or unsafe individual windows do not affect other windows.

## Acceptance

The behavior must satisfy [spec.md](spec.md), especially FR-001 through FR-013 and SC-001 through SC-005. Build/package success is necessary but does not replace the runtime stability matrix.

## Validation record for this implementation

- `npm run build`: passed.
- `npm run pack`: passed and created the ignored extension archive.
- Automated tests: none were added or run.
- GNOME Shell 50/51 runtime scenarios, including 100 open/close cycles: not run in this workspace; compositor stability remains to be confirmed in the disposable environments above.
