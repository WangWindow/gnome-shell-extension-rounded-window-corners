# Window Picker D-Bus Contract

The preferences process cannot call GNOME Shell window-selection APIs directly. It communicates with the Shell process through the existing D-Bus interface:

- **Interface**: `org.gnome.Shell.Extensions.RoundedWindowCorners`
- **Method**: `pick()` — no input arguments; asks the Shell process to start window picking.
- **Signal**: `picked(window: s)` — returns the selected window’s class identifier as a string.

The interface is declared in `src/window_picker/iface.xml`; `service.ts` exports it while enabled and `client.ts` wraps the preferences-side call. Preserve the wire names and signatures. Disable must unexport the service, and re-enable must export one service without leaving duplicate registrations or callbacks.
