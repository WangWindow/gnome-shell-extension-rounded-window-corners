# Rounded Window Corners

A GNOME Shell extension that adds rounded corners to windows.

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

## Development

Run `npm install` once, then use:

```sh
npm run build
npm run install-extension
npm run pack
npm run clean
npm run update-translations
```
