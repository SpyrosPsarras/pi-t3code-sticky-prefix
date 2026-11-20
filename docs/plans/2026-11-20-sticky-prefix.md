# pi-t3code-sticky-prefix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Pi package whose extension makes T3 Code `delegate_task` children keep the parent model's account prefix.

**Architecture:** One extension file. A pure function decides the new model ID; the default export registers a `tool_call` handler that applies it to `event.input.target.model` in place and notifies.

**Tech Stack:** TypeScript run directly by Pi and by Node 26 type stripping; `node:test`; no runtime dependencies.

**Spec:** `docs/design.md`

## Global Constraints

- npm name `pi-t3code-sticky-prefix`, version `0.1.0`, license MIT, `"type": "module"`.
- `keywords` include `pi-package`; `pi.extensions` is `["./index.ts"]`.
- `peerDependencies`: `{"@earendil-works/pi-coding-agent": "*"}`. No `dependencies`, no `devDependencies`.
- `files`: `["index.ts", "README.md", "CHANGELOG.md", "LICENSE"]`.
- Only `import type` from Pi packages, so Node can strip it.
- Tool names: `mcp__t3-code__delegate_task` and `mcp__t3_code__delegate_task`.
- Public repo: examples use made-up prefixes such as `acme/` and `team-b/` and a gateway provider named `gateway`. No real account, company or host names.
- No code comments unless a line's reason cannot be read from the code.
- The handler never throws and never blocks the call.

## Review Focus

1. `event.input.target` missing, `null` or not an object, or `target.model` not a string: no change, no throw.
2. `ctx.model` undefined: no change.
3. Parent ID with several slashes (`acme/vendor/model`): prefix is the first segment, `acme`.
4. `target.providerInstanceId` set to anything other than `pi`: no change.
5. Child ID that already has a prefix (`gateway/team-b/claude-x`): no change, even if the parent is `acme/...`.

Each has a test in Task 1.

---

### Task 1: Extension, tests and package

**Files:**
- Create: `index.ts`, `index.test.ts`, `package.json`, `README.md`, `CHANGELOG.md`, `LICENSE`, `.gitignore`

**Interfaces:**
- Produces:
  - `export function stickyModel(parent: { provider: string; id: string } | undefined, target: unknown, exists: (provider: string, id: string) => boolean): string | undefined` returns the rewritten `provider/prefix/id`, or `undefined` for no change. Rules are the four conditions in `docs/design.md` § Behavior.
  - `export default function (pi: ExtensionAPI): void` registers `pi.on("tool_call", ...)`. For the two tool names, calls `stickyModel(ctx.model, event.input?.target, (p, id) => ctx.modelRegistry.find(p, id) !== undefined)`. On a result: sets `event.input.target.model`, then `ctx.ui.notify(\`delegate_task model: ${before} → ${after}\`, "info")`. Returns `undefined`.

- [ ] **Step 1: Write the failing tests in `index.test.ts`**

Fixture: parent `{ provider: "gateway", id: "acme/claude-opus" }`; `exists` returns true only for `("gateway", "acme/claude-haiku")` and `("gateway", "acme/claude-opus")`.

`stickyModel` tests:
- `rewrites an unprefixed child`: target `{ model: "gateway/claude-haiku" }` → `"gateway/acme/claude-haiku"`.
- `accepts providerInstanceId pi`: same with `providerInstanceId: "pi"` → `"gateway/acme/claude-haiku"`.
- `keeps a child when the prefixed model is missing`: `gateway/claude-sonnet` → `undefined`.
- `keeps a child of an unprefixed parent`: parent id `claude-opus` → `undefined`.
- `keeps an already prefixed child`: `gateway/team-b/claude-haiku` → `undefined`.
- `keeps another provider`: `other/claude-haiku` → `undefined`.
- `keeps another provider instance`: `providerInstanceId: "claudeAgent"` → `undefined`.
- `uses the first parent segment`: parent id `acme/vendor/model`, child `gateway/claude-haiku` → `"gateway/acme/claude-haiku"`.
- `ignores bad input`: targets `undefined`, `null`, `"x"`, `{}`, `{ model: 3 }`, and parent `undefined` → `undefined`, no throw.

Default export tests, with a fake `pi` that captures the `tool_call` handler and a fake `ctx` (`model`, `modelRegistry.find`, `ui.notify` recording calls):
- `rewrites delegate_task in place and notifies` for both tool names: `event.input.target.model` becomes `"gateway/acme/claude-haiku"`, handler returns `undefined`, one notify with `"delegate_task model: gateway/claude-haiku → gateway/acme/claude-haiku"`.
- `ignores other tools`: tool `mcp__t3-code__task_status` with the same input → unchanged, no notify.
- `leaves a call without target alone`: `event.input = {}` → still `{}`, no notify.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test`
Expected: FAIL, `index.ts` not found or exports missing.

- [ ] **Step 3: Implement `index.ts`** per the Interfaces block.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test`
Expected: all tests pass, 0 fail.

- [ ] **Step 5: Package files**

- `package.json` per Global Constraints, plus `description`, `repository` `github:SpyrosPsarras/pi-t3code-sticky-prefix`, `author` `Spyros Psarras`, `scripts.test` `node --test`.
- `README.md`: one-paragraph problem, install `pi install npm:pi-t3code-sticky-prefix`, the rewrite rules with an `acme/` example, when it does nothing, how to turn it off (remove the package), and a Limits section copied from `docs/design.md` § Limits.
- `CHANGELOG.md`: `## [0.1.0]` with one line.
- `LICENSE`: MIT, `Copyright (c) 2026 Spyros Psarras`.
- `.gitignore`: `node_modules/`, `*.tgz`.

- [ ] **Step 6: Verify the package**

Run: `npm test && npm pack --dry-run`
Expected: tests pass; the tarball lists exactly `index.ts`, `README.md`, `CHANGELOG.md`, `LICENSE`, `package.json`.

- [ ] **Step 7: Leave changes uncommitted** and report changed files and command output.
