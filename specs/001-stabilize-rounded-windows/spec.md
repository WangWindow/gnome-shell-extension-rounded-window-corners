# Feature Specification: Complete and Stabilize the Rounded Corners Extension

**Feature Branch**: `001-stabilize-rounded-windows`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "帮我完成这个gonme shell插件的实现，并修复当前存在的bug：启用后启动窗口会导致系统（桌面）崩溃。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Use rounded windows without losing the desktop (Priority: P1)

As a desktop user, I want the extension to apply rounded corners while the desktop
remains stable, so I can open and use applications without a Shell crash.

**Why this priority**: A desktop crash makes the extension unsafe to enable and blocks
its primary purpose.

**Independent Test**: Enable the extension, open windows immediately afterward and during
normal use, and confirm the desktop remains interactive while eligible windows receive
the configured appearance.

**Acceptance Scenarios**:

1. **Given** the extension is enabled, **When** the user opens an application window,
   **Then** the desktop remains interactive and the window receives rounded corners
   according to the current settings.
2. **Given** a window is unavailable for decoration or is excluded by the user's settings,
   **When** it opens, **Then** the desktop remains usable and other eligible windows
   continue to work.
3. **Given** windows are already open when the extension is enabled or re-enabled,
   **When** the extension becomes active, **Then** eligible windows receive the current
   appearance and remain usable through resize, focus, minimize, and restore actions.

---

### User Story 2 - Configure the appearance (Priority: P2)

As a user, I want to tune the global corner and shadow appearance, so the extension fits
my desktop and remains consistent across current and future windows.

**Why this priority**: Appearance settings are the main way users personalize the extension
after its core window handling is reliable.

**Independent Test**: Change global appearance options, observe open and newly opened
windows, reload the extension, and confirm the selected values remain in effect.

**Acceptance Scenarios**:

1. **Given** the preferences are open, **When** the user changes corner radius, smoothing,
   padding, border width, or border color, **Then** eligible open and new windows reflect
   the selected values without requiring a desktop restart.
2. **Given** focused and unfocused shadow settings are configured, **When** focus changes
   or a window becomes maximized or fullscreen, **Then** the configured shadow and corner
   behavior is applied.
3. **Given** the extension is disabled and enabled again, **When** the user opens
   preferences, **Then** the previous settings are retained; resetting settings restores
   the documented defaults.

---

### User Story 3 - Control behavior for individual applications (Priority: P2)

As a user, I want to exclude selected applications or give them custom appearance settings,
so applications that need different treatment can remain comfortable to use.

**Why this priority**: Per-application rules let users handle compatibility and appearance
differences without disabling the extension globally.

**Independent Test**: Add an application to an inclusion or exclusion list, create a custom
appearance profile for another application, then open both and verify each rule.

**Acceptance Scenarios**:

1. **Given** exclusion-list mode is active, **When** a listed application opens,
   **Then** its window is left unchanged and other eligible applications remain rounded.
2. **Given** inclusion-list mode is active, **When** a listed application opens,
   **Then** it receives the effect and unlisted applications remain unchanged.
3. **Given** an application has a custom profile, **When** its window opens,
   **Then** its configured radius, smoothing, border color, padding, and maximize/fullscreen
   behavior are used; removing the profile returns the application to global settings.
4. **Given** the user adds, changes, or removes an application rule,
   **When** the preferences are reopened, **Then** the resulting list and profile values
   are retained and duplicate entries are rejected clearly.
5. **Given** a category-specific compatibility option is configured, **When** a matching
   application opens, **Then** its behavior follows that option without changing
   unrelated applications.

---

### User Story 4 - Install, update, and disable the extension safely (Priority: P2)

As a user, I want to install and package the extension through its documented workflow,
and disable it cleanly, so I can use or remove it without leaving the desktop in a broken
state.

**Why this priority**: Reliable installation and cleanup are required for users to adopt,
update, or remove the extension safely.

**Independent Test**: Follow the documented installation flow in a supported environment,
enable the extension, then disable and enable it again while windows are open.

**Acceptance Scenarios**:

1. **Given** the documented prerequisites are present, **When** the user builds, installs,
   and packages the extension using the documented workflow, **Then** the extension can be
   enabled in each supported desktop session.
2. **Given** the extension is active, **When** the user disables it,
   **Then** its visual effects are removed and normal window and desktop behavior is
   restored.
3. **Given** the extension has been enabled and disabled repeatedly,
   **When** windows are opened and closed, **Then** there are no leftover effects or
   duplicate behavior from earlier activations.

### Edge Cases

- A window opens immediately after the extension is enabled or while the desktop is
  finishing startup.
- An application window becomes available before its visual content or identifying
  information is ready.
- A window closes while the extension is applying or updating its appearance.
- Several windows open, close, resize, or change focus in quick succession.
- A window is minimized, restored, moved between workspaces or monitors, maximized, or
  made fullscreen while settings change.
- An application matches an inclusion or exclusion rule and also has a custom profile or
  a category-specific compatibility option.
- Settings are reset or changed while affected windows are already open.
- The extension is disabled while window updates are pending.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Enabling the extension and opening application windows MUST NOT crash the
  desktop session or make it unusable.
- **FR-002**: The extension MUST apply the active corner appearance to eligible existing
  and newly opened windows.
- **FR-003**: If an individual window cannot be safely decorated, the extension MUST leave
  that window usable and keep processing other eligible windows.
- **FR-004**: The extension MUST keep window appearance correct as windows are resized,
  focused, minimized, restored, moved, maximized, or made fullscreen.
- **FR-005**: Users MUST be able to configure global corner radius, smoothing, padding,
  border width, border color, and the behavior of corners on maximized and fullscreen
  windows.
- **FR-006**: Users MUST be able to configure focused and unfocused shadows, including
  whether shadows remain visible on maximized and fullscreen windows.
- **FR-007**: Users MUST be able to create, change, and remove per-application appearance
  profiles, including enabling or disabling the profile and configuring its supported
  corner and padding options.
- **FR-008**: Users MUST be able to manage application inclusion and exclusion rules. The
  selected list mode MUST determine which applications receive the effect, and duplicate
  entries MUST be rejected with a clear explanation.
- **FR-009**: Existing compatibility controls for selected application categories MUST
  remain available and behave consistently with the user's settings.
- **FR-010**: Appearance settings and application rules MUST persist across extension
  disable/enable cycles and preference-window reopenings. Resetting settings MUST restore
  documented defaults.
- **FR-011**: Disabling the extension MUST remove its effects and restore ordinary desktop
  behavior, including after repeated enable/disable cycles.
- **FR-012**: The extension MUST remain compatible with the GNOME Shell releases it
  currently advertises as supported: versions 50 and 51.
- **FR-013**: Users MUST be able to build, install, and package the extension by following
  the documented project workflow.

### Key Entities *(include if feature involves data)*

- **Window Appearance Profile**: Global or per-application corner, padding, border color,
  and enable/maximized/fullscreen settings; global settings also include border width and
  shadow behavior.
- **Application Rule**: An application inclusion or exclusion entry, or an application
  category preference, that determines whether the effect is applied.
- **Desktop Session**: The active desktop environment in which the extension is enabled,
  handles windows, and can be disabled.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On each currently supported desktop release, the desktop remains interactive
  and does not crash during 100 window-open/close cycles, including windows opened
  immediately after enabling the extension.
- **SC-002**: Every eligible existing or new window receives the configured appearance,
  while every window excluded by the user's rules remains unchanged.
- **SC-003**: Changes to every exposed appearance setting are reflected on affected open
  windows and are retained after the extension is disabled and enabled again.
- **SC-004**: Users can complete the documented build, install, enable, disable, and
  packaging workflows in each supported environment without a fatal desktop error.
- **SC-005**: After disabling the extension, no extension-created visual effect remains
  on any open window, and ordinary desktop window operations continue to work.

## Assumptions

- "Complete the implementation" means making the user-facing features already present in
  the project usable and reliable, including settings, per-application rules, packaging,
  and lifecycle cleanup; it does not add unrelated visual features.
- The supported GNOME Shell releases remain the versions currently listed by the project:
  50 and 51.
- The reported desktop crash means that enabling the extension and then opening a window
  can terminate or destabilize the desktop session.
- If a specific window cannot be decorated safely, skipping that window is preferable to
  risking the desktop session.
- Users have the prerequisites listed in the project documentation when building or
  installing the extension.
