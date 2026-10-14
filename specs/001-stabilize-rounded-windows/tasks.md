---
description: "Implementation tasks for stabilizing and completing the rounded corners extension"
---

# Tasks: Complete and Stabilize the Rounded Corners Extension

**Input**: Design documents from `/specs/001-stabilize-rounded-windows/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: No automated test tasks are included; the project has no test harness and the request did not ask for one. Use the project build/package checks and the runtime scenarios in `quickstart.md` during implementation validation.

## Phase 1: Setup

**Purpose**: Verify repository setup artifacts required by the implementation workflow.

- [X] T001 Add missing Node build/log/environment ignore patterns to `.gitignore` while retaining existing extension artifacts.

---

## Phase 2: Foundational

**Purpose**: Clear the strict TypeScript issue that blocks validating the implementation.

- [X] T002 Import the existing `logError` helper used by `/proc` error handling in `src/manager/utils.ts`.

**Checkpoint**: Shared project setup is ready for story implementation.

---

## Phase 3: User Story 1 — Use rounded windows without losing the desktop (Priority: P1) 🎯 MVP

**Goal**: Keep Shell usable while existing and new eligible windows are decorated across startup, mapping, asynchronous eligibility checks, closure, and disable.

**Independent Test**: In a disposable GNOME Shell 50 and 51 Wayland environment, enable the extension, open/close windows immediately and repeatedly, close a window while app detection is pending, and disable while updates are pending. Shell remains interactive, eligible windows receive the effect, and stale work does not reattach it.

### Implementation for User Story 1

- [X] T003 [US1] Add per-window lifecycle state, activation tokens, tracked readiness/update connections, and retry handling for missing WM class/first child/texture in `src/manager/event_manager.ts` and `src/utils/types.ts`.
- [X] T004 [US1] Revalidate activation and actor/window liveness after async eligibility checks and before effect updates or timeout callbacks in `src/manager/event_handlers.ts`.
- [X] T005 [US1] Invalidate pending lifecycle work before synchronously removing effects, disconnecting callbacks, restoring patches, and uninitializing settings in `src/extension.ts` and `src/manager/event_manager.ts`.
- [X] T006 [US1] Correct the maximum-radius bounds indexing and keep the clamped radius finite in `src/effect/rounded_corners_effect.ts`.
- [X] T007 [US1] Contain rejected async signal-handler promises and log errors without allowing one unsafe window to interrupt other windows in `src/manager/event_manager.ts` and `src/manager/event_handlers.ts`.

**Checkpoint**: Startup, window readiness, close-during-work, and disable-during-work paths are safe; the confirmed small-window shader defect is corrected.

---

## Phase 4: User Story 2 — Configure the appearance (Priority: P2)

**Goal**: Persist and apply global appearance, per-app appearance values, and selected resets consistently.

**Independent Test**: Change global and custom appearance settings, shadows, and maximized/fullscreen behavior; confirm open/new windows update and values survive reopening preferences and extension re-enable. Reset selected categories and confirm defaults are restored.

### Implementation for User Story 2

- [X] T008 [US2] Encode border-color variants consistently with the schema default and use the effective global or per-app smoothing value when styling shadows in `src/utils/settings.ts` and `src/manager/utils.ts`.
- [X] T009 [US2] Expose reset choices for inclusion mode, app lists, custom profiles, and category skip settings in `src/preferences/pages/reset.ts`, preserving schema defaults.

**Checkpoint**: Global and per-app values remain persisted and affect open and new windows consistently.

---

## Phase 5: User Story 3 — Control behavior for individual applications (Priority: P2)

**Goal**: Make inclusion/exclusion lists and custom profile management reliable, including deletion, duplicate rejection, and renaming.

**Independent Test**: Add, rename, and delete entries in both list and custom-profile pages; verify duplicate identifiers are rejected, only the intended row/profile changes, and the chosen list mode is honored by new windows.

### Implementation for User Story 3

- [X] T010 [US3] Delete blacklist/whitelist entries using the row WM class subtitle and guard against a missing identifier in `src/preferences/pages/blacklist.ts`.
- [X] T011 [US3] Disconnect a custom row's old WM-class-bound handlers before rebinding it after rename, so later edits update only the renamed profile in `src/preferences/pages/custom.ts`.

**Checkpoint**: App rules and custom profiles can be managed without stale settings callbacks or accidental deletion of another entry.

---

## Phase 6: User Story 4 — Install, update, and disable the extension safely (Priority: P2)

**Goal**: Ensure Shell-owned visuals, window-picker registrations, and documented build/install/package workflows have clear lifetimes.

**Independent Test**: Build, install, package, enable, disable, and re-enable in each supported disposable Shell environment. Confirm the picker service and visual clones do not remain active after disable and windows retain normal behavior.

### Implementation for User Story 4

- [X] T012 [US4] Track the active Looking Glass inspector and its signal handlers so unexport/disable closes or disconnects outstanding window-picker work in `src/window_picker/service.ts` and `src/extension.ts`.
- [X] T013 [US4] Tie overview and workspace shadow clones and their signal/property bindings to preview/workspace destruction and remove only extension-owned visuals in `src/patch/add_shadow_in_overview.ts` and `src/patch/workspace_switch.ts`.
- [X] T014 [US4] Document GNOME Shell 50/51 support and the existing build, install, package, disable, and re-enable workflow in `README.md`.

**Checkpoint**: Installation/package instructions match repository commands and disable/re-enable leaves no extension-owned visual or picker state behind.

---

## Phase 7: Polish and Cross-Cutting Validation

**Purpose**: Check the integrated implementation against the design and project workflow.

- [X] T015 Run `npm run build` and `npm run pack`, resolve implementation regressions, and record the results against `specs/001-stabilize-rounded-windows/quickstart.md`.
- [X] T016 Review the final implementation diff against `specs/001-stabilize-rounded-windows/spec.md`, `plan.md`, and both contracts; record any GNOME 50/51 runtime scenarios that remain unverified in `specs/001-stabilize-rounded-windows/quickstart.md`.

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No prerequisites.
- **Foundational (Phase 2)**: Depends on setup; clears the known strict TypeScript diagnostic.
- **User Story 1 (Phase 3)**: Depends on the foundational phase and is the MVP. Complete lifecycle ownership before appearance or preference work.
- **User Stories 2–4 (Phases 4–6)**: Depend on the foundational phase; integrate with the stable lifecycle from US1.
- **Polish (Phase 7)**: Depends on all implementation stories.

### User Story Dependencies

- **US1 (P1)**: MVP; no dependency on later stories.
- **US2 (P2)**: Depends on the lifecycle refresh path from US1 for reliable updates to open windows.
- **US3 (P2)**: Can be implemented after the foundational phase; runtime rule behavior is validated with the US1 lifecycle.
- **US4 (P2)**: Cleanup integrates with US1 teardown; documentation follows the final command behavior.

### Parallel Opportunities

- T001 and T002 touch separate files and can be done independently.
- After US1 lifecycle work, T006 is isolated to the shader effect file and can proceed independently of manager refinements.
- T008 and T009 touch separate settings/manager and preferences-reset files.
- T010 and T011 touch separate preferences pages.
- T012 and T013 are separate picker and visual-patch subsystems.

## Implementation Strategy

1. Complete setup and the strict TypeScript import fix.
2. Deliver US1 first as the MVP: lifecycle cancellation/readiness, cleanup, error containment, and shader bounds correction.
3. Complete appearance settings and application-rule fixes without changing the persisted public contracts.
4. Complete picker/visual teardown and update the README workflow.
5. Run the build/package checks. Use the disposable GNOME 50/51 matrix in `quickstart.md`; do not treat successful compilation as proof that the compositor crash is fixed.
