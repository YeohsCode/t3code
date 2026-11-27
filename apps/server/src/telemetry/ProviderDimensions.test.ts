import { ProviderInstanceId, type ServerProvider } from "@t3tools/contracts";
import { expect, it } from "@effect/vitest";
import { providerDimensions } from "./ProviderDimensions.ts";

const provider = (
  instanceId: string,
  driver: string,
  models: ReadonlyArray<{ slug: string; isCustom: boolean }>,
) =>
  ({
    instanceId: ProviderInstanceId.make(instanceId),
    driver,
    auth: { status: "authenticated" },
    models,
  }) as unknown as ServerProvider;

const providers = [
  provider("work-codex", "codex", [{ slug: "gpt-5.5", isCustom: false }]),
  provider("claudeAgent", "claudeAgent", [
    { slug: "claude-opus-5-5", isCustom: false },
    { slug: "my-private-finetune", isCustom: true },
  ]),
  provider("opencode", "opencode", [{ slug: "ollama/acme-internal", isCustom: false }]),
];

it("keeps custom model and instance names out of local feedback dimensions", () => {
  expect(
    providerDimensions(providers, {
      instanceId: ProviderInstanceId.make("claudeAgent"),
      model: "my-private-finetune",
    }),
  ).toEqual({ provider: "claudeAgent", model: "custom:claudeAgent" });
  expect(
    providerDimensions(providers, {
      instanceId: ProviderInstanceId.make("opencode"),
      model: "ollama/acme-internal",
    }),
  ).toEqual({ provider: "opencode", model: "custom:opencode" });
  expect(
    providerDimensions(providers, {
      instanceId: ProviderInstanceId.make("removed-instance"),
      model: "gpt-5.5",
    }),
  ).toEqual({ provider: "unknown" });
});
