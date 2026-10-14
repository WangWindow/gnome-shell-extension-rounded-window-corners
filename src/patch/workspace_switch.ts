/** @file Provides functions for handling shadows during workspace switching. */

import type { WorkspaceAnimationController } from 'resource:///org/gnome/shell/ui/workspaceAnimation.js';

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';

import { getRoundedCornersEffect } from '../manager/utils.js';
import { SHADOW_PADDING } from '../utils/constants.js';
import { hasMetaWindow } from '../utils/types.js';

type WsAnimationActor = Clutter.Actor & { shadowClone?: Clutter.Actor };

type ShadowCloneRecord = {
  source: Clutter.Actor;
  clone: Clutter.Actor;
  scope: WorkspaceScope;
  visibleBinding: GObject.Binding | null;
  translationConnection: number;
  destroyConnection: number;
};

type WorkspaceScope = {
  workspace: Clutter.Actor;
  restackedConnection: number;
  destroyConnection: number;
  shadows: Set<ShadowCloneRecord>;
};

const workspaceScopes = new Set<WorkspaceScope>();
const shadowRecords = new WeakMap<Clutter.Actor, ShadowCloneRecord>();

/** Add shadows to windows while their workspace animation clones are visible. */
export function addShadowsInWorkspaceSwitch(
  self: WorkspaceAnimationController,
) {
  for (const monitor of self._switchData.monitors) {
    for (const workspace of monitor._workspaceGroups) {
      const previousScope = findScope(workspace);
      if (previousScope) cleanupScope(previousScope, true);

      const scope: WorkspaceScope = {
        workspace,
        restackedConnection: 0,
        destroyConnection: 0,
        shadows: new Set(),
      };

      for (const { windowActor: actor, clone } of workspace._windowRecords) {
        if (!hasMetaWindow(actor) || actor.is_destroyed()) continue;

        const win = actor.metaWindow;
        const shadow = actor.rwcCustomData?.shadow;
        const enabled = getRoundedCornersEffect(actor)?.enabled;
        if (!(shadow && enabled)) continue;

        const shadowClone = new Clutter.Clone({
          source: shadow,
        });

        const frameRect = win.get_frame_rect();
        shadowClone.width = frameRect.width + SHADOW_PADDING * 2;
        shadowClone.height = frameRect.height + SHADOW_PADDING * 2;
        shadowClone.x = clone.x + frameRect.x - actor.x - SHADOW_PADDING;
        shadowClone.y = clone.y + frameRect.y - actor.y - SHADOW_PADDING;

        const record: ShadowCloneRecord = {
          source: clone,
          clone: shadowClone,
          scope,
          visibleBinding: null,
          translationConnection: 0,
          destroyConnection: 0,
        };
        record.translationConnection = clone.connect(
          'notify::translation-z',
          () => {
            shadowClone.translationZ = clone.translationZ - 0.05;
          },
        );
        record.visibleBinding = clone.bind_property(
          'visible',
          shadowClone,
          'visible',
          0,
        );
        record.destroyConnection = shadowClone.connect('destroy', () =>
          cleanupShadow(record, false),
        );

        shadowRecords.set(clone, record);
        scope.shadows.add(record);
        (clone as WsAnimationActor).shadowClone = shadowClone;
        workspace.insert_child_below(shadowClone, clone);
      }

      if (scope.shadows.size === 0) continue;

      scope.restackedConnection = global.display.connect('restacked', () => {
        for (const record of scope.shadows) {
          if (record.clone.get_parent() === workspace) {
            workspace.set_child_below_sibling(record.clone, record.source);
          }
        }
      });
      scope.destroyConnection = workspace.connect('destroy', () =>
        cleanupScope(scope, false),
      );
      workspaceScopes.add(scope);
    }
  }
}

/** Remove shadow clones after a workspace switch completes. */
export function removeShadowsAfterWorkspaceSwitch(
  self: WorkspaceAnimationController,
) {
  for (const monitor of self._switchData.monitors) {
    for (const workspace of monitor._workspaceGroups) {
      const scope = findScope(workspace);
      if (scope) cleanupScope(scope, true);

      for (const { clone } of workspace._windowRecords) {
        const record = shadowRecords.get(clone);
        if (record) {
          cleanupShadow(record, true);
        } else {
          const shadowClone = (clone as WsAnimationActor).shadowClone;
          if (shadowClone) shadowClone.destroy();
          delete (clone as WsAnimationActor).shadowClone;
        }
      }
    }
  }
}

/** Remove all extension-owned workspace visuals during extension disable. */
export function clearWorkspaceSwitchShadows() {
  for (const scope of [...workspaceScopes]) cleanupScope(scope, true);
}

function findScope(workspace: Clutter.Actor) {
  return [...workspaceScopes].find(scope => scope.workspace === workspace);
}

function cleanupScope(scope: WorkspaceScope, destroyClones: boolean) {
  if (GObject.signal_handler_is_connected(global.display, scope.restackedConnection)) {
    global.display.disconnect(scope.restackedConnection);
  }
  if (GObject.signal_handler_is_connected(scope.workspace, scope.destroyConnection)) {
    scope.workspace.disconnect(scope.destroyConnection);
  }

  for (const record of [...scope.shadows]) {
    cleanupShadow(record, destroyClones);
  }
  workspaceScopes.delete(scope);
}

function cleanupShadow(record: ShadowCloneRecord, destroyClone: boolean) {
  record.scope.shadows.delete(record);
  if (shadowRecords.get(record.source) === record) {
    shadowRecords.delete(record.source);
  }

  if (record.visibleBinding) {
    record.visibleBinding.unbind();
    record.visibleBinding = null;
  }
  if (
    GObject.signal_handler_is_connected(
      record.source,
      record.translationConnection,
    )
  ) {
    record.source.disconnect(record.translationConnection);
  }
  if (
    GObject.signal_handler_is_connected(record.clone, record.destroyConnection)
  ) {
    record.clone.disconnect(record.destroyConnection);
  }

  const source = record.source as WsAnimationActor;
  if (source.shadowClone === record.clone) delete source.shadowClone;

  if (destroyClone && record.clone.get_parent()) record.clone.destroy();
}
