# pi-t3code-sticky-prefix

Some model gateways use a prefix in the model ID to select an account. When a Pi thread runs on `gateway/acme/claude-opus` and asks T3 Code to delegate to `gateway/claude-haiku`, the gateway may pick a different account for the child. This extension keeps the parent's account prefix when the matching model is available.

## Install

```sh
pi install npm:pi-t3code-sticky-prefix
```

## When it rewrites

The extension handles both T3 Code `delegate_task` tool names. It rewrites `target.model` when the parent has a prefix, the target provider instance is omitted or `pi`, the child explicitly names an unprefixed model from the parent's provider, and the prefixed child model exists in Pi's model registry. For example, a parent on `gateway/acme/claude-opus` changes `gateway/claude-haiku` to `gateway/acme/claude-haiku`. Pi shows a notification for the rewrite.

Otherwise the call is unchanged. Explicit prefixes like `team-b/` are kept. If `target.model` is omitted, T3 Code already gives the child the parent's model.

To turn it off, remove the package from Pi's settings.

## Limits

- It relies on T3's tool name and argument shape; a T3 change breaks it without warning.
- It cannot pin a model that has no prefixed variant in the registry.
