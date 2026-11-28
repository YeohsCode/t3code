// @effect-diagnostics nodeBuiltinImport:off - Tests exercise root env file precedence directly.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { loadRepoEnv } from "./public-config.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    NodeFS.rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadRepoEnv", () => {
  it("defaults Connect off even when a relay and Clerk are configured", () => {
    const repoRoot = makeTemporaryDirectory();
    const env = loadRepoEnv({
      repoRoot,
      baseEnv: {
        T3CODE_RELAY_URL: "https://relay.example.test",
        T3CODE_CLERK_PUBLISHABLE_KEY: "pk_test_key",
      },
    });
    expect(env.T3CODE_CONNECT_ENABLED).toBe("false");
    expect(env.VITE_T3CODE_CONNECT_ENABLED).toBe("false");
    expect(env.EXPO_PUBLIC_T3CODE_CONNECT_ENABLED).toBe("false");
  });

  it("normalizes explicit opt-in for every client and honors process opt-out", () => {
    const repoRoot = makeTemporaryDirectory();
    NodeFS.writeFileSync(NodePath.join(repoRoot, ".env"), "T3CODE_CONNECT_ENABLED=true\n");
    expect(loadRepoEnv({ repoRoot, baseEnv: {} })).toMatchObject({
      T3CODE_CONNECT_ENABLED: "true",
      VITE_T3CODE_CONNECT_ENABLED: "true",
      EXPO_PUBLIC_T3CODE_CONNECT_ENABLED: "true",
    });
    expect(
      loadRepoEnv({ repoRoot, baseEnv: { T3CODE_CONNECT_ENABLED: "false" } })
        .VITE_T3CODE_CONNECT_ENABLED,
    ).toBe("false");
  });

  it("applies process, root local, and root precedence in that order", () => {
    const repoRoot = makeTemporaryDirectory();
    NodeFS.writeFileSync(
      NodePath.join(repoRoot, ".env"),
      "T3CODE_CLERK_PUBLISHABLE_KEY=pk_root\nT3CODE_CLERK_JWT_TEMPLATE=template_root\nT3CODE_CLERK_CLI_OAUTH_CLIENT_ID=oauth_root\nT3CODE_RELAY_URL=https://root.example.test\n",
    );
    NodeFS.writeFileSync(
      NodePath.join(repoRoot, ".env.local"),
      "T3CODE_CLERK_PUBLISHABLE_KEY=pk_local\nT3CODE_CLERK_JWT_TEMPLATE=template_local\nT3CODE_CLERK_CLI_OAUTH_CLIENT_ID=oauth_local\nT3CODE_RELAY_URL=https://local.example.test\n",
    );

    expect(loadRepoEnv({ baseEnv: {}, repoRoot }).T3CODE_RELAY_URL).toBe(
      "https://local.example.test",
    );
    expect(
      loadRepoEnv({
        baseEnv: {
          T3CODE_CLERK_PUBLISHABLE_KEY: "pk_ci",
          T3CODE_CLERK_JWT_TEMPLATE: "template_ci",
          T3CODE_CLERK_CLI_OAUTH_CLIENT_ID: "oauth_ci",
          T3CODE_RELAY_URL: "https://ci.example.test",
        },
        repoRoot,
      }),
    ).toMatchObject({
      T3CODE_CLERK_PUBLISHABLE_KEY: "pk_ci",
      T3CODE_CLERK_CLI_OAUTH_CLIENT_ID: "oauth_ci",
      VITE_CLERK_PUBLISHABLE_KEY: "pk_ci",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_ci",
      T3CODE_CLERK_JWT_TEMPLATE: "template_ci",
      VITE_CLERK_JWT_TEMPLATE: "template_ci",
      EXPO_PUBLIC_CLERK_JWT_TEMPLATE: "template_ci",
      T3CODE_RELAY_URL: "https://ci.example.test",
      VITE_T3CODE_RELAY_URL: "https://ci.example.test",
    });
  });
});

function makeTemporaryDirectory() {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3code-public-config-"));
  temporaryDirectories.push(directory);
  return directory;
}
