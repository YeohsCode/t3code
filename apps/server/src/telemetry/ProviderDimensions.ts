import type { ModelSelection, ServerProvider } from "@t3tools/contracts";

import { BUNDLED_MODEL_MANIFEST } from "../provider/ModelManifest.ts";

export interface ProviderDimensions {
  readonly provider: string;
  readonly model?: string;
}

/**
 * Anonymous provider and model for a model selection. Instance ids are
 * user-defined, so only the driver kind is reported.
 */
export function providerDimensions(
  providers: ReadonlyArray<ServerProvider>,
  selection: Pick<ModelSelection, "instanceId" | "model">,
): ProviderDimensions {
  const provider = providers.find((candidate) => candidate.instanceId === selection.instanceId);
  if (provider === undefined) return { provider: "unknown" };
  if (selection.model === "") return { provider: provider.driver };
  return {
    provider: provider.driver,
    model: modelLabel(providers, provider.driver, selection.model),
  };
}

const DATED_SNAPSHOT = /-\d{8}$/u;

const MANIFEST_LABELS: ReadonlyMap<string, string> = new Map(
  Object.values(BUNDLED_MODEL_MANIFEST.providers ?? {}).flatMap((catalog) =>
    catalog.models.flatMap((model) =>
      [model.slug, ...(model.aliases ?? [])].map((name) => [name, model.slug] as const),
    ),
  ),
);

// Drivers whose model lists come from the vendor. OpenCode, Pi, fx, and ACP agents list
// the user's own configuration, such as local Ollama tags or GGUF paths.
const VENDOR_CATALOG_DRIVERS: ReadonlySet<string> = new Set([
  "codex",
  "claudeAgent",
  "cursor",
  "grok",
  "antigravity",
  "kiro",
  "muse",
]);

// A custom endpoint, gateway, or Bedrock serves whatever names its owner chose.
const listsVendorModels = ({ driver, auth }: ServerProvider) =>
  VENDOR_CATALOG_DRIVERS.has(driver) &&
  auth.endpoint === undefined &&
  auth.type !== "customEndpoint" &&
  auth.type !== "bedrock";

/**
 * The model name analytics reports. A routed id, alias, or dated snapshot that the
 * bundled manifest or a vendor's own model list knows, such as `anthropic/claude-opus-5-5`
 * or `antigravity-default`, maps to its catalog slug. Any other id can name a user, a
 * deployment, or a local file, so it reports only the driver as `custom:<driver>`.
 */
function modelLabel(
  providers: ReadonlyArray<ServerProvider>,
  driver: string,
  model: string,
): string {
  return catalogSlug(providers, model) ?? `custom:${driver}`;
}

function catalogSlug(providers: ReadonlyArray<ServerProvider>, model: string) {
  const leaf = model.slice(model.lastIndexOf("/") + 1);
  const candidates = [model, leaf, leaf.replace(DATED_SNAPSHOT, "")];
  for (const candidate of candidates) {
    const label = MANIFEST_LABELS.get(candidate);
    if (label !== undefined) return label;
  }
  for (const provider of providers) {
    if (!listsVendorModels(provider)) continue;
    const match = provider.models.find(
      (entry) =>
        !entry.isCustom &&
        (candidates.includes(entry.slug) ||
          entry.aliases?.some((alias) => candidates.includes(alias)) === true),
    );
    if (match !== undefined) return match.slug;
  }
  return undefined;
}
