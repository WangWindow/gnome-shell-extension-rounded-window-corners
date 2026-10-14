/**
 * @file Manages Shell event connections and the lifecycle of rounded-corner
 * effects attached to window actors.
 */

import GObject from 'gi://GObject';
import type Meta from 'gi://Meta';
import type Shell from 'gi://Shell';

import { logDebug, logError } from '../utils/log.js';
import { prefs } from '../utils/settings.js';
import { hasMetaWindow, type RoundedWindowActor } from '../utils/types.js';
import * as handlers from './event_handlers.js';

type SignalConnection = {
  object: GObject.Object;
  id: number;
};

type WindowState =
  | 'discovered'
  | 'waiting-for-class'
  | 'waiting-for-child'
  | 'waiting-for-content'
  | 'ready'
  | 'evaluating'
  | 'applied'
  | 'skipped'
  | 'closed';

type WindowLifecycle = {
  actor: RoundedWindowActor;
  window: Meta.Window;
  generation: number;
  state: WindowState;
  closed: boolean;
  firstFrameSeen: boolean;
  updatesConnected: boolean;
  connections: SignalConnection[];
  readinessConnections: SignalConnection[];
};

const connections: SignalConnection[] = [];
const windowLifecycles = new Map<Meta.WindowActor, WindowLifecycle>();

let generation = 0;
let enabled = false;

/** Enable window tracking and decorate windows that are already open. */
export function enableEffect() {
  if (enabled) return;

  generation++;
  enabled = true;

  connect(prefs, 'changed', refreshAllWindows);

  const wm = global.windowManager;
  for (const actor of global.get_window_actors()) {
    if (hasMetaWindow(actor)) trackWindow(actor);
  }

  connect(
    global.display,
    'window-created',
    (_: Meta.Display, win: Meta.Window) => {
      const actor = win.get_compositor_private();
      if (actor) trackWindow(actor as Meta.WindowActor);
    },
  );

  connect(wm, 'minimize', (_: Shell.WM, actor: Meta.WindowActor) => {
    const lifecycle = windowLifecycles.get(actor);
    if (lifecycle && isCurrent(lifecycle)) {
      dispatchSyncWindowTask(lifecycle, handlers.onMinimize);
    }
  });

  connect(wm, 'unminimize', (_: Shell.WM, actor: Meta.WindowActor) => {
    const lifecycle = windowLifecycles.get(actor);
    if (lifecycle && isCurrent(lifecycle)) {
      dispatchWindowTask(lifecycle, handlers.onUnminimize);
    }
  });

  connect(wm, 'destroy', (_: Shell.WM, actor: Meta.WindowActor) =>
    removeEffectFrom(actor),
  );

  connect(global.display, 'restacked', () => {
    try {
      handlers.onRestacked();
    } catch (error) {
      logError('Could not restack shadow actors:', error);
    }
  });
}

/** Invalidate pending work before synchronously removing all extension state. */
export function disableEffect() {
  enabled = false;
  generation++;

  for (const lifecycle of [...windowLifecycles.values()]) {
    closeLifecycle(lifecycle);
  }

  disconnectConnections(connections);
}

/** Connect a process-wide signal and retain ownership for disable cleanup. */
function connect(
  object: GObject.Object,
  signal: string,
  // biome-ignore lint/suspicious/noExplicitAny: GObject signal callbacks vary by signal.
  callback: (...args: any[]) => any,
) {
  connections.push({ object, id: object.connect(signal, callback) });
}

/** Connect a window-owned signal and retain it for lifecycle cleanup. */
function connectWindow(
  lifecycle: WindowLifecycle,
  object: GObject.Object,
  signal: string,
  // biome-ignore lint/suspicious/noExplicitAny: GObject signal callbacks vary by signal.
  callback: (...args: any[]) => any,
  readiness = false,
) {
  const connection = { object, id: object.connect(signal, callback) };
  lifecycle.connections.push(connection);
  if (readiness) lifecycle.readinessConnections.push(connection);
}

/** Disconnect and release a set of owned signal connections. */
function disconnectConnections(ownedConnections: SignalConnection[]) {
  while (ownedConnections.length > 0) {
    const connection = ownedConnections.pop();
    if (!connection) continue;

    try {
      if (GObject.signal_handler_is_connected(connection.object, connection.id)) {
        connection.object.disconnect(connection.id);
      }
    } catch (error) {
      logDebug(`Signal was already disconnected: ${error}`);
    }
  }
}

/** Disconnect readiness callbacks before retrying a window readiness check. */
function disconnectReadinessConnections(lifecycle: WindowLifecycle) {
  while (lifecycle.readinessConnections.length > 0) {
    const connection = lifecycle.readinessConnections.pop();
    if (!connection) continue;

    const index = lifecycle.connections.indexOf(connection);
    if (index >= 0) lifecycle.connections.splice(index, 1);
    disconnectConnections([connection]);
  }
}

/** Check that an async continuation still belongs to this live actor/window. */
function isCurrent(lifecycle: WindowLifecycle) {
  if (
    !enabled ||
    lifecycle.closed ||
    lifecycle.generation !== generation ||
    windowLifecycles.get(lifecycle.actor) !== lifecycle
  ) {
    return false;
  }

  try {
    return (
      !lifecycle.actor.is_destroyed() &&
      lifecycle.actor.metaWindow === lifecycle.window
    );
  } catch {
    return false;
  }
}

/** Create one record per compositor actor and start its readiness checks. */
function trackWindow(actor: Meta.WindowActor) {
  if (!enabled) return;

  const existing = windowLifecycles.get(actor);
  if (existing && isCurrent(existing)) return;
  if (existing) closeLifecycle(existing);

  try {
    if (actor.is_destroyed() || !hasMetaWindow(actor)) return;
  } catch {
    return;
  }

  const lifecycle: WindowLifecycle = {
    actor,
    window: actor.metaWindow,
    generation,
    state: 'discovered',
    closed: false,
    firstFrameSeen: false,
    updatesConnected: false,
    connections: [],
    readinessConnections: [],
  };
  windowLifecycles.set(actor, lifecycle);

  connectWindow(lifecycle, actor, 'destroy', () => closeLifecycle(lifecycle));
  connectWindow(lifecycle, lifecycle.window, 'unmanaged', () =>
    closeLifecycle(lifecycle),
  );

  processWindow(lifecycle);
}

/** Wait for window metadata and content before attaching update handlers. */
function processWindow(lifecycle: WindowLifecycle) {
  if (!isCurrent(lifecycle)) return;

  try {
    processReadyWindow(lifecycle);
  } catch (error) {
    if (!isCurrent(lifecycle)) return;
    logError(
      `Could not prepare window ${lifecycle.window.wmClass} for decoration:`,
      error,
    );
    closeLifecycle(lifecycle);
  }
}

function processReadyWindow(lifecycle: WindowLifecycle) {
  if (!isCurrent(lifecycle)) return;
  disconnectReadinessConnections(lifecycle);

  if (lifecycle.window.wmClass === null) {
    lifecycle.state = 'waiting-for-class';
    connectWindow(
      lifecycle,
      lifecycle.window,
      'notify::wm-class',
      () => processWindow(lifecycle),
      true,
    );
    return;
  }

  if (!lifecycle.actor.firstChild) {
    lifecycle.state = 'waiting-for-child';
    connectWindow(
      lifecycle,
      lifecycle.actor,
      'notify::first-child',
      () => processWindow(lifecycle),
      true,
    );
    return;
  }

  const texture = lifecycle.actor.get_texture();
  if (!texture) {
    lifecycle.state = 'waiting-for-content';
    connectWindow(
      lifecycle,
      lifecycle.actor,
      'notify::mapped',
      () => processWindow(lifecycle),
      true,
    );
    if (!lifecycle.firstFrameSeen) {
      connectWindow(
        lifecycle,
        lifecycle.actor,
        'first-frame',
        () => {
          lifecycle.firstFrameSeen = true;
          processWindow(lifecycle);
        },
        true,
      );
    }
    return;
  }

  if (lifecycle.updatesConnected) return;

  lifecycle.state = 'ready';
  lifecycle.updatesConnected = true;
  const isLive = () => isCurrent(lifecycle);
  connectWindow(lifecycle, lifecycle.actor, 'notify::size', () => {
    dispatchWindowTask(lifecycle, handlers.onSizeChanged);
  });
  connectWindow(lifecycle, texture, 'size-changed', () => {
    dispatchWindowTask(lifecycle, handlers.onSizeChanged);
  });
  connectWindow(lifecycle, lifecycle.window, 'notify::fullscreen', () => {
    dispatchWindowTask(lifecycle, handlers.onSizeChanged);
  });
  connectWindow(lifecycle, lifecycle.window, 'notify::appears-focused', () => {
    dispatchSyncWindowTask(lifecycle, handlers.onFocusChanged);
  });
  connectWindow(lifecycle, lifecycle.window, 'workspace-changed', () => {
    dispatchSyncWindowTask(lifecycle, handlers.onFocusChanged);
  });

  dispatchWindowTask(lifecycle, handlers.onAddEffect);
}

/** Run an async handler with a cancellation guard and a rejection boundary. */
function dispatchWindowTask(
  lifecycle: WindowLifecycle,
  handler: (
    actor: RoundedWindowActor,
    isCurrent: () => boolean,
  ) => Promise<void>,
) {
  if (!isCurrent(lifecycle)) return;
  lifecycle.state = 'evaluating';
  const isLive = () => isCurrent(lifecycle);

  void Promise.resolve()
    .then(() => handler(lifecycle.actor, isLive))
    .then(() => {
      if (!isLive()) return;
      lifecycle.state = lifecycle.actor.rwcCustomData ? 'applied' : 'skipped';
    })
    .catch(error => {
      if (!isLive()) return;
      lifecycle.state = 'ready';
      logError(`Window handler failed for ${lifecycle.window.wmClass}:`, error);
    });
}

function dispatchSyncWindowTask(
  lifecycle: WindowLifecycle,
  handler: (actor: RoundedWindowActor, isCurrent: () => boolean) => void,
) {
  if (!isCurrent(lifecycle)) return;

  try {
    handler(lifecycle.actor, () => isCurrent(lifecycle));
  } catch (error) {
    logError(
      `Synchronous window handler failed for ${lifecycle.window.wmClass}:`,
      error,
    );
  }
}

/** Refresh the windows which are ready in the current activation. */
function refreshAllWindows() {
  for (const lifecycle of windowLifecycles.values()) {
    if (lifecycle.updatesConnected) {
      dispatchWindowTask(lifecycle, handlers.onSizeChanged);
    }
  }
}

/** Remove effects and all callbacks owned by a window. */
function closeLifecycle(lifecycle: WindowLifecycle) {
  if (lifecycle.closed) return;

  lifecycle.closed = true;
  lifecycle.state = 'closed';
  windowLifecycles.delete(lifecycle.actor);
  disconnectConnections(lifecycle.connections);
  lifecycle.readinessConnections.length = 0;

  try {
    handlers.onRemoveEffect(lifecycle.actor);
  } catch (error) {
    logError(`Could not clean up window ${lifecycle.window.wmClass}:`, error);
  }
}

/** Remove an effect when the Shell reports that a window actor is destroyed. */
function removeEffectFrom(actor: Meta.WindowActor) {
  const lifecycle = windowLifecycles.get(actor);
  if (lifecycle) {
    closeLifecycle(lifecycle);
    return;
  }

  try {
    handlers.onRemoveEffect(actor as RoundedWindowActor);
  } catch (error) {
    logError('Could not remove a window effect:', error);
  }
}
