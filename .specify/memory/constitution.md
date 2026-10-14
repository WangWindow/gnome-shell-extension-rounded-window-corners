<!--
Sync Impact Report
Version change: unversioned template → 1.0.0 (initial ratification)
Modified principles:
- Template principle 1 → I. Repository Instructions First
- Template principle 2 → II. Small, Coherent Changes
- Template principle 3 → III. Clear, Explicit Implementation
- Template principle 4 → IV. Consistent Formatting
- Template principle 5 → V. Verifiable Delivery
Added sections: Code and Tooling Standards; Commit and Review Workflow
Removed sections: none
Follow-up TODOs: TODO(RATIFICATION_DATE): confirm the original adoption date.
-->

# Rounded Window Corners Constitution

## Core Principles

### I. Repository Instructions First
Before changing a repository, identify its root and read the applicable `AGENTS.md`,
`CONTRIBUTING.md`, `.editorconfig`, and task-specific workflow documents when present.
Treat this constitution as the shared baseline and follow narrower repository rules where
they define language, tooling, or compatibility details. Inspect the relevant code and
history before choosing an implementation pattern.

### II. Small, Coherent Changes
Each change MUST address one clear concern and make the smallest complete diff that solves
it. Preserve behavior and public interfaces outside that scope. Do not include unrelated
cleanup or broad reformatting. Add a dependency, abstraction, or tool only when the task
needs it and the repository's guidance permits it.

### III. Clear, Explicit Implementation
Prefer straightforward control flow, meaningful names, and existing project patterns over
clever or speculative abstractions. Where the language supports static types, use them to
make interfaces and assumptions clear. Validate data at external boundaries and handle
failures explicitly. Comments MUST explain rationale, constraints, or non-obvious behavior
rather than repeat the code.

### IV. Consistent Formatting
Use the formatter and configuration already adopted by the repository. Keep formatting
changes limited to edited lines unless a formatting-only change is explicitly requested.
Text files MUST use UTF-8, LF line endings, and a final newline; code and configuration
files MUST NOT contain trailing whitespace.

### V. Verifiable Delivery
Use repository-supported checks that are relevant to the change. Review their exit status
and output, inspect the complete diff before submission, and report which checks were run
and their results. Never claim a check passed if it was not run.

## Code and Tooling Standards

- When no narrower repository rule applies, use spaces for indentation: four spaces by
  default and two spaces for web files such as HTML, CSS, JavaScript, TypeScript, JSON,
  and YAML. Honor `.editorconfig` or the repository formatter when it specifies otherwise.
- Keep text UTF-8 with LF endings and a final newline. Trim trailing whitespace in source
  and configuration files. Preserve Markdown trailing whitespace only when the project's
  Markdown conventions use it intentionally, such as for hard line breaks.
- Match the conventions of the language and neighboring files. Do not impose one syntax,
  naming scheme, or import order across languages when their tools or project rules differ.
- Start tool work by anchoring commands at the repository root and checking relevant
  instructions and the working tree. Use `rg` and `rg --files` for focused searches, and
  prefer documented project scripts over ad hoc replacements for existing workflows.
- Keep commands explicit and inspect their exit status. For JSON, XML, or other
  machine-readable output, keep stderr separate from stdout. Batch independent read-only
  inspection when useful; run dependent or state-changing commands in order with clear
  arguments.
- Use the narrowest relevant build, validation, or test command supported by the project.
  Do not add tooling, dependencies, or automation unrelated to the requested change.

## Commit and Review Workflow

- Keep each commit focused on one logical change. Separate unrelated fixes, documentation,
  formatting, and build updates so each can be reviewed or reverted independently.
- Write commit subjects in Conventional Commit form:
  `type(scope): concise action-oriented summary`. The scope is optional. Use established
  lowercase types such as `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `build`,
  `ci`, `chore`, and `dev`; use the repository's established message language. Keep the
  subject concise and omit a trailing period.
- Use a commit body when context, reasoning, or impact is not clear from the subject. Mark
  breaking changes with `!` in the subject and explain migration or compatibility impact
  in the body, including a `BREAKING CHANGE:` footer when appropriate.
- Before submitting, review the full diff for scope, formatting, and accidental generated
  files. Run relevant repository-defined checks and state their results accurately in the
  review or change description.

## Governance

This constitution is the shared project-wide standard for implementation, tool use, and
commit review. Repository-specific instructions may add detail for a language or workflow,
but MUST NOT silently weaken these principles. Contributors and automated agents MUST
check changes against the applicable principles before submission; any exception MUST be
called out with its reason in the change description.

Amendments MUST include a rationale and be reviewed by the project owner before adoption.
Use semantic versioning: increment MAJOR for incompatible governance changes, MINOR for
new principles or materially expanded requirements, and PATCH for clarifications that do
not change obligations. Reviewers MUST check scope, applicable formatting, tool and check
reports, and commit subject conventions.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original date unknown | **Last Amended**: 2026-10-14
