/**
 * @file This file contains the implementation of the DBus interface for the
 * window picker. See the {@link WindowPicker} class for more information.
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';

import { Inspector } from 'resource:///org/gnome/shell/ui/lookingGlass.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { readRelativeFile } from '../utils/file.js';
import { logDebug } from '../utils/log.js';

const iface = await readRelativeFile(import.meta.url, 'iface.xml');

type ActivePicker = {
  lookingGlass: ReturnType<typeof Main.createLookingGlass>;
  inspector: Inspector;
  targetConnection: number;
  closedConnection: number;
};

/**
 * This class provides the implementation of the DBus interface for the window
 * picker. It implements a single method - `pick` - which opens the window picker
 * and allows the user to select a window.
 */
export class WindowPicker {
  readonly #dbus = Gio.DBusExportedObject.wrapJSObject(iface, this);
  #activePicker: ActivePicker | null = null;
  #exported = false;

  /** Emit the wm_class of the picked window to the `picked` signal. */
  #sendPickedWindow(wmClass: string) {
    this.#dbus.emit_signal('picked', new GLib.Variant('(s)', [wmClass]));
  }

  /**
   * Open the window picker and select a window.
   *
   * This uses the window picker from GNOME's Looking Glass. This is the
   * easiest way to pick a window, and this is also what's used by other
   * extensions such as Blur my Shell.
   */
  pick() {
    if (this.#activePicker) this.#finishPicker(this.#activePicker, true);

    const lookingGlass = Main.createLookingGlass();
    const inspector = new Inspector(lookingGlass);
    const activePicker: ActivePicker = {
      lookingGlass,
      inspector,
      targetConnection: 0,
      closedConnection: 0,
    };
    this.#activePicker = activePicker;

    activePicker.targetConnection = inspector.connect(
      'target',
      (me, target, x, y) => {
        if (this.#activePicker !== activePicker) return;

        logDebug(`${me}: pick ${target} in ${x}, ${y}`);

        // Remove the red border effect when the window is picked.
        const effectName = 'lookingGlass_RedBorderEffect';
        for (const effect of target.get_effects()) {
          if (effect.toString().includes(effectName)) {
            target.remove_effect(effect);
          }
        }

        let actor = target;

        // If the picked actor is not a Meta.WindowActor, which happens
        // often since it's usually a Meta.SurfaceActor, try to find its
        // parent which is a Meta.WindowActor.
        for (let i = 0; i < 2; i++) {
          if (actor === null || actor instanceof Meta.WindowActor) {
            break;
          }
          actor = actor.get_parent();
        }

        if (!(actor instanceof Meta.WindowActor)) {
          this.#sendPickedWindow('window-not-found');
          return;
        }

        this.#sendPickedWindow(
          actor.metaWindow?.wmClass ?? 'window-not-found',
        );
      },
    );

    activePicker.closedConnection = inspector.connect('closed', () =>
      this.#finishPicker(activePicker, true),
    );
  }

  export() {
    if (this.#exported) return;
    this.#dbus.export(
      Gio.DBus.session,
      '/org/gnome/shell/extensions/RoundedWindowCorners',
    );
    this.#exported = true;
    logDebug('DBus Service exported');
  }

  unexport() {
    if (this.#activePicker) this.#finishPicker(this.#activePicker, true);
    if (!this.#exported) return;
    this.#dbus.unexport();
    this.#exported = false;
  }

  #finishPicker(activePicker: ActivePicker, closeLookingGlass: boolean) {
    if (this.#activePicker === activePicker) this.#activePicker = null;

    for (const [object, id] of [
      [activePicker.inspector, activePicker.targetConnection],
      [activePicker.inspector, activePicker.closedConnection],
    ] as const) {
      if (id && GObject.signal_handler_is_connected(object, id)) {
        object.disconnect(id);
      }
    }

    if (closeLookingGlass) {
      activePicker.inspector.destroy();
      activePicker.lookingGlass.close();
    }
  }
}
