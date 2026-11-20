import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export function stickyModel(
  parent: { provider: string; id: string } | undefined,
  target: unknown,
  exists: (provider: string, id: string) => boolean,
): string | undefined {
  if (!parent || target === null || typeof target !== "object") return;

  const { model, providerInstanceId } = target as { model?: unknown; providerInstanceId?: unknown };
  if (providerInstanceId !== undefined && providerInstanceId !== "pi") return;
  if (typeof model !== "string") return;

  const [provider, childId, extra] = model.split("/");
  if (provider !== parent.provider || !childId || extra !== undefined) return;

  const slash = parent.id.indexOf("/");
  if (slash < 1) return;

  const id = `${parent.id.slice(0, slash)}/${childId}`;
  return exists(provider, id) ? `${provider}/${id}` : undefined;
}

export default function (pi: ExtensionAPI): void {
  pi.on("tool_call", (event, ctx) => {
    try {
      if (event.toolName !== "mcp__t3-code__delegate_task" && event.toolName !== "mcp__t3_code__delegate_task") return;

      const target = event.input?.target;
      const after = stickyModel(ctx.model, target, (provider, id) => ctx.modelRegistry.find(provider, id) !== undefined);
      if (after === undefined) return;

      const child = target as { model: string };
      const before = child.model;
      child.model = after;
      ctx.ui.notify(`delegate_task model: ${before} → ${after}`, "info");
    } catch {}
  });
}
