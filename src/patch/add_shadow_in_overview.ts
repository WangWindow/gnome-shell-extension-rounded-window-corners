/** @file Provides a function to add a shadow actor to a window preview in the overview. */

import type Meta from 'gi://Meta';
import type { WindowPreview } from 'resource:///org/gnome/shell/ui/windowPreview.js';
import type { RoundedWindowActor } from '../utils/types.js';

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Graphene from 'gi://Graphene';

import { overview } from 'resource:///org/gnome/shell/ui/main.js';

import { shouldEnableEffect } from '../manager/utils.js';
import { OVERVIEW_SHADOW_ACTOR, SHADOW_PADDING } from '../utils/constants.js';
import { logDebug, logError } from '../utils/log.js';

const overviewShadowClones = new Set<Clutter.Clone>();

/**
 * Add a shadow actor to a window preview in the overview.
 * @param window - The window that the preview is of.
 * @param self - The window preview that the shadow actor is added to.
 */
export async function addShadowInOverview(
  window: Meta.Window,
  self: WindowPreview,
  isCurrent: () => boolean = () => true,
) {
  let previewDestroyed = false;
  const previewDestroyConnection = self.connect('destroy', () => {
    previewDestroyed = true;
  });
  const isLive = () => isCurrent() && !previewDestroyed;

  try {
    await addShadowForLiveWindow(window, self, isLive);
  } finally {
    if (
      GObject.signal_handler_is_connected(self, previewDestroyConnection)
    ) {
      self.disconnect(previewDestroyConnection);
    }
  }
}

async function addShadowForLiveWindow(
  window: Meta.Window,
  self: WindowPreview,
  isLive: () => boolean,
) {
  if (!isLive()) return;

  // Skip attached dialogs — they are added via _updateAttachedDialogs/addDialog
  // and should not get their own shadow clone in the overview.
  // We detect them by checking if the window is transient-for another window,
  // which is always the case for attached dialogs but not for top-level windows.
  if (window.get_transient_for() !== null) {
    return;
  }

  // If the original window doesn't have rounded corners or a shadow,
  // we don't need to do anything, so we can skip it.
  const hasRoundedCorners = await shouldEnableEffect(window, isLive);
  if (!hasRoundedCorners || !isLive()) return;

  const windowActor = window.get_compositor_private() as
    | RoundedWindowActor
    | null;
  if (!windowActor || windowActor.is_destroyed()) return;
  const shadow = windowActor.rwcCustomData?.shadow;
  if (!shadow) return;

  if (
    self.get_children().some(child => child.get_name() === OVERVIEW_SHADOW_ACTOR)
  ) {
    return;
  }

  logDebug(`Adding shadow for ${window.wmClass} in overview`);

  // windowContainer has the actual contents of the window preview
  const windowContainer = self.windowContainer;

  // Create a clone of the window's shadow actor and add it to the preview
  const shadowActorClone = new OverviewShadowActorClone(shadow, self);
  const bindings = [
    windowContainer.bind_property('scale-x', shadowActorClone, 'scale-x', 1),
    windowContainer.bind_property('scale-y', shadowActorClone, 'scale-y', 1),
  ];
  let destroyConnection = 0;
  destroyConnection = shadowActorClone.connect('destroy', () => {
    for (const binding of bindings) binding?.unbind();
    overviewShadowClones.delete(shadowActorClone);
    if (GObject.signal_handler_is_connected(shadowActorClone, destroyConnection)) {
      shadowActorClone.disconnect(destroyConnection);
    }
  });
  overviewShadowClones.add(shadowActorClone);
  self.insert_child_below(shadowActorClone, windowContainer);
}

/** Remove overview-only clones synchronously when the extension is disabled. */
export function clearOverviewShadowClones() {
  for (const clone of [...overviewShadowClones]) {
    try {
      clone.destroy();
    } catch (error) {
      logError('Could not remove an overview shadow clone:', error);
      overviewShadowClones.delete(clone);
    }
  }
}

/**
 * A clone of a window's shadow actor that is shown in the overview. Binds the
 * size of the shadow to the size of the window preview in the overview.
 */
const OverviewShadowActorClone = GObject.registerClass(
  {},
  class extends Clutter.Clone {
    windowPreview: WindowPreview;

    /**
     * Create the clone of the shadow actor.
     * @param source the shadow actor to clone.
     * @param windowPreview the window preview that the clone is applied to.
     */
    constructor(source: Clutter.Actor, windowPreview: WindowPreview) {
      super({
        source, // the source shadow actor shown in desktop
        name: OVERVIEW_SHADOW_ACTOR,
        pivotPoint: new Graphene.Point({ x: 0.5, y: 0.5 }),
      });

      this.windowPreview = windowPreview;
    }

    /**
     * Recompute the position and size of shadow in overview
     * This virtual function will be called when we:
     * - entering/closing overview
     * - dragging window
     * - position and size of window preview in overview changed
     * @param box The bound box of shadow actor
     */
    vfunc_allocate(box: Clutter.ActorBox) {
      // The layout box of the window has to be obtained in a different
      // way when leaving the overview (eg. by pressing ESC). I have no
      // idea why this is the case, but oh well. GNOME.
      const leavingOverview =
        overview._overview.controls._workspacesDisplay._leavingOverview;
      const windowContainerBox = leavingOverview
        ? this.windowPreview.windowContainer.get_allocation_box()
        : this.windowPreview.get_allocation_box();

      const metaWindow =
        this.windowPreview._windowActor.get_meta_window();
      if (!metaWindow) {
        return;
      }

      // Scale the shadow by the same scale factor that the window preview
      // is scaled by.
      const containerScaleFactor =
        windowContainerBox.get_width() /
        metaWindow.get_frame_rect().width;
      const paddings = SHADOW_PADDING * containerScaleFactor;

      // Setup the bounding box of the shadow actor.
      box.set_origin(-paddings, -paddings);
      box.set_size(
        windowContainerBox.get_width() + 2 * paddings,
        windowContainerBox.get_height() + 2 * paddings,
      );

      // Apply the bounding box.
      super.vfunc_allocate(box);
    }
  },
);
