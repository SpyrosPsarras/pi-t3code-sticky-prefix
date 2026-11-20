# pi-t3code-sticky-prefix

When T3 Code delegates from one Pi agent to another, this extension adds the parent's account prefix to an unprefixed child model from the same provider if Pi lists the prefixed model.

## Do you need this?

Only if all three are true:

1. You run T3 Code with Pi, and your Pi agent starts another Pi agent with `delegate_task`.
2. The parent runs on a model with an account prefix, and your gateway uses that prefix to select an account. For example, CLIProxyAPI lets you set a `prefix` on an account's credential.
3. The gateway can route the unprefixed child model (`cliproxy/claude-haiku-5-5`) to another account, and Pi lists the version with the parent's prefix (`cliproxy/acme/claude-haiku-5-5`).

Without this extension: you start a thread on `cliproxy/acme/claude-opus-5-5`, the agent delegates to `cliproxy/claude-haiku-5-5`, and the gateway picks the account. The child can then use another account's quota, rate limit and billing.

With it, Pi changes the child model before T3 Code receives the call:

```text
before: cliproxy/claude-haiku-5-5
after:  cliproxy/acme/claude-haiku-5-5
```

It does nothing in plain Pi without T3 Code. It does not fix wrong provider or model selection in T3 Code.

## Install

```sh
pi install npm:pi-t3code-sticky-prefix
```

To turn it off: `pi remove npm:pi-t3code-sticky-prefix`.

## When it rewrites

It rewrites `target.model` in a `delegate_task` call only when all of these hold:

- The parent model has an account prefix, like `acme/` in `cliproxy/acme/claude-opus-5-5`.
- `target.providerInstanceId` is omitted or `pi`.
- `target.model` is an unprefixed model from the parent's provider, like `cliproxy/claude-haiku-5-5`.
- Pi's model registry has the prefixed model, `cliproxy/acme/claude-haiku-5-5`.

The extension asks Pi to show a notification after each rewrite. Every other call stays unchanged. An explicit prefix like `cliproxy/team-b/claude-haiku-5-5` stays. If `target.model` is omitted and the child uses the same provider instance, T3 Code gives it the parent's model.

## Limits

- It relies on T3 Code's tool names (`mcp__t3-code__delegate_task`, `mcp__t3_code__delegate_task`) and argument shape. A T3 Code change can break it without warning.
- It cannot pin a model that has no prefixed version in Pi's model registry.
