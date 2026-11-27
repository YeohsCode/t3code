import { SourceControlProviderKind } from "@t3tools/contracts";
import { it, expect } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SourceControlDrivers } from "./builtInDrivers.ts";
import * as SourceControlSignIn from "./SourceControlSignIn.ts";

it.effect("never reads or uses server credentials for repository stars", () =>
  Effect.gen(function* () {
    const service = yield* SourceControlSignIn.SourceControlSignIn;
    for (const repository of ["pingdotgg/t3code", "attacker/another-repository"]) {
      const input = {
        provider: SourceControlProviderKind.make("github"),
        host: "github.com",
        repository,
      };
      expect(yield* service.starred(input)).toBe(false);
      expect(yield* service.star(input)).toBe(false);
    }
  }).pipe(
    Effect.provide(
      SourceControlSignIn.layer.pipe(
        Layer.provide(
          Layer.succeed(
            SourceControlDrivers,
            new Proxy([], {
              get() {
                throw new Error("Star RPC accessed a host account driver");
              },
            }),
          ),
        ),
      ),
    ),
  ),
);
