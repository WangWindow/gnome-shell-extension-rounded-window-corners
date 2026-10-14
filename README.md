# Rounded Window Corners

A GNOME Shell extension that adds rounded corners to windows.

## Supported GNOME Shell versions

The extension advertises GNOME Shell 50 and 51 support in `resources/metadata.json`.
The current supported runtime is Wayland.

## Install

Requirements: Node.js, npm, gettext, and `glib-compile-schemas`.

```sh
git clone https://github.com/WangWindow/rounded-window-corners.git
cd rounded-window-corners
npm install
npm run install-extension
gnome-extensions enable rounded-window-corners@choco2233
```

If GNOME Shell does not load the extension immediately, log out and back in.

To disable or re-enable the extension:

```sh
gnome-extensions disable rounded-window-corners@choco2233
gnome-extensions enable rounded-window-corners@choco2233
```

## Development

Run `npm install` once, then use:

```sh
npm run build
npm run install-extension
npm run pack
npm run clean
npm run update-translations
```

`npm run build` compiles TypeScript, schemas, and translations. `npm run pack` builds
the extension and creates `rounded-window-corners@choco2233.shell-extension.zip`.
Validate window startup, close, and disable/re-enable behavior in a disposable GNOME
Shell 50 or 51 Wayland session before using an implementation change on a daily desktop.
