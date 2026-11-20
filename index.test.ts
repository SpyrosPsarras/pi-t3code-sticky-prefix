import assert from "node:assert/strict";
import test from "node:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import extension, { stickyModel } from "./index.ts";

const parent = { provider: "gateway", id: "acme/claude-opus" };
const child = "gateway/claude-haiku";
const prefixedChild = "gateway/acme/claude-haiku";
const delegate = "mcp__t3-code__delegate_task";
const delegateAlias = "mcp__t3_code__delegate_task";

function exists(provider: string, id: string): boolean {
  return provider === "gateway" && (id === "acme/claude-haiku" || id === "acme/claude-opus");
}

test("rewrites an unprefixed child", () => {
  assert.equal(stickyModel(parent, { model: child }, exists), prefixedChild);
});

test("accepts providerInstanceId pi", () => {
  assert.equal(stickyModel(parent, { model: child, providerInstanceId: "pi" }, exists), prefixedChild);
});

test("keeps a child when the prefixed model is missing", () => {
  assert.equal(stickyModel(parent, { model: "gateway/claude-sonnet" }, exists), undefined);
});

test("keeps a child of an unprefixed parent", () => {
  assert.equal(stickyModel({ ...parent, id: "claude-opus" }, { model: child }, exists), undefined);
});

test("keeps an already prefixed child", () => {
  assert.equal(stickyModel(parent, { model: "gateway/team-b/claude-haiku" }, exists), undefined);
});

test("keeps another provider", () => {
  assert.equal(stickyModel(parent, { model: "other/claude-haiku" }, exists), undefined);
});

test("keeps another provider instance", () => {
  assert.equal(stickyModel(parent, { model: child, providerInstanceId: "claudeAgent" }, exists), undefined);
});

test("uses the first parent segment", () => {
  assert.equal(stickyModel({ ...parent, id: "acme/vendor/model" }, { model: child }, exists), prefixedChild);
});

test("ignores bad input", () => {
  for (const target of [undefined, null, "x", {}, { model: 3 }, { model: "gateway" }, { model: "gateway/" }]) {
    assert.equal(stickyModel(parent, target, exists), undefined);
  }
  assert.equal(stickyModel(undefined, { model: child }, exists), undefined);
  assert.equal(stickyModel({ provider: "gateway", id: "/x" }, { model: child }, exists), undefined);
});

type ToolCall = { type: "tool_call"; toolCallId: string; toolName: string; input: Record<string, unknown> };

function find(provider: string, id: string) {
  return exists(provider, id) ? { provider, id } : undefined;
}

function register(overrides: { find?: typeof find; notify?: (message: string, level: string) => void } = {}) {
  const notifications: [string, string][] = [];
  const ctx = {
    model: parent,
    modelRegistry: { find: overrides.find ?? find },
    ui: { notify: overrides.notify ?? ((message: string, level: string) => notifications.push([message, level])) },
  };
  let handler: ((event: ToolCall, context: typeof ctx) => unknown) | undefined;
  extension({
    on(event: string, callback: NonNullable<typeof handler>) {
      if (event === "tool_call") handler = callback;
    },
  } as ExtensionAPI);
  assert.ok(handler);
  const run = handler;
  return {
    notifications,
    call: (toolName: string, input: ToolCall["input"]) => run({ type: "tool_call", toolCallId: "test-call", toolName, input }, ctx),
  };
}

for (const toolName of [delegate, delegateAlias]) {
  test(`rewrites delegate_task in place and notifies (${toolName})`, () => {
    const { call, notifications } = register();
    const target = { model: child };
    assert.equal(call(toolName, { target }), undefined);
    assert.equal(target.model, prefixedChild);
    assert.deepEqual(notifications, [["delegate_task model: gateway/claude-haiku → gateway/acme/claude-haiku", "info"]]);
  });
}

test("ignores other tools", () => {
  const { call, notifications } = register();
  const input = { target: { model: child } };
  assert.equal(call("mcp__t3-code__task_status", input), undefined);
  assert.deepEqual(input, { target: { model: child } });
  assert.deepEqual(notifications, []);
});

test("leaves a call without target alone", () => {
  const { call, notifications } = register();
  const input = {};
  assert.equal(call(delegate, input), undefined);
  assert.deepEqual(input, {});
  assert.deepEqual(notifications, []);
});

test("does not block a call when registry lookup fails", () => {
  const { call, notifications } = register({ find() { throw new Error("lookup failed"); } });
  const input = { target: { model: child } };
  assert.equal(call(delegate, input), undefined);
  assert.deepEqual(input, { target: { model: child } });
  assert.deepEqual(notifications, []);
});

test("does not block a call when notification fails", () => {
  const { call } = register({ notify() { throw new Error("notification failed"); } });
  const input = { target: { model: child } };
  assert.equal(call(delegate, input), undefined);
  assert.deepEqual(input, { target: { model: prefixedChild } });
});
