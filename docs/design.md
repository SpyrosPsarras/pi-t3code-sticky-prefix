# pi-t3code-sticky-prefix: design

## Problem

Some model gateways put an account or route prefix in the model ID, for
example `gateway/acme/claude-opus` and `gateway/team-b/claude-opus`, next to
an unprefixed `gateway/claude-opus` that the gateway may route to any account.
When a T3 Code thread runs Pi on a prefixed model and delegates with
`delegate_task`, the agent usually names an unprefixed model. The child then
runs on a different account than its parent.

## Behavior

A Pi extension handles `tool_call` for `mcp__t3-code__delegate_task` and its
hidden alias `mcp__t3_code__delegate_task`. It rewrites `target.model` in place
when all of these hold:

1. The parent model ID has a prefix: `<prefix>/<rest>`.
2. `target.providerInstanceId` is absent or `pi`.
3. `target.model` is `<provider>/<id>`, where `<provider>` is the parent's
   provider and `<id>` contains no `/`. An ID that already has a prefix is an
   explicit choice and stays.
4. `<provider>/<prefix>/<id>` exists in Pi's model registry.

Otherwise the call is unchanged. A missing `target.model` is left alone,
because T3 already gives the child the parent's model. Each rewrite is shown
with `ctx.ui.notify`.

To turn it off, remove the package from Pi's settings.

## Verified before building

- T3 registers its tools with `pi.registerTool` and gates them with `tool_call`.
- In-place changes to `event.input` reach the tool, for direct and codemode calls.
- A live `delegate_task` from a prefixed parent ran the child on the prefixed model.

## Package

- npm `pi-t3code-sticky-prefix`, MIT, keyword `pi-package`, `pi.extensions`
  pointing at `index.ts`, Pi as a `"*"` peer dependency, no runtime dependencies.
- Tests with `node:test` and a fake `ctx`: rewrite, unprefixed parent, missing
  prefixed model, already-prefixed child, other provider instance, no model,
  both tool names.
- README: what it rewrites, when it does nothing, and that it depends on T3's
  tool name and `target.model` shape.

## Limits

- It relies on T3's tool name and argument shape. A T3 change breaks it
  quietly; the README says so.
- It cannot pin a model that has no prefixed variant in the registry.
