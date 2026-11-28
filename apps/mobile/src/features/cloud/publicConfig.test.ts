import { describe, expect, it, vi } from "vite-plus/test";

import { resolveCloudPublicConfig } from "./publicConfig";

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

describe("resolveCloudPublicConfig", () => {
  it("does not use persisted cloud configuration without a boolean opt-in", () => {
    for (const connect of [undefined, { enabled: false }, { enabled: "true" }]) {
      const config = resolveCloudPublicConfig({
        connect,
        clerk: { publishableKey: "pk_test_example", jwtTemplate: "t3-relay" },
        relay: { url: "https://relay.example.test" },
      });
      expect(config.clerk.publishableKey).toBeNull();
      expect(config.relay.url).toBeNull();
    }
  });

  it("rejects an insecure relay URL", () => {
    expect(
      resolveCloudPublicConfig({
        connect: { enabled: true },
        clerk: { publishableKey: "pk_test_example", jwtTemplate: "t3-relay" },
        relay: { url: "http://relay.example.test" },
      }),
    ).toEqual({
      clerk: {
        publishableKey: "pk_test_example",
        jwtTemplate: "t3-relay",
      },
      relay: {
        url: null,
      },
      observability: {
        tracesUrl: null,
        tracesDataset: null,
        tracesToken: null,
      },
    });
  });
});
