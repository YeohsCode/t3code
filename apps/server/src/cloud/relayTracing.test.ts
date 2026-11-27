import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as RelayTracing from "@t3tools/shared/relayTracing";

import { allowedFor, relayLayer } from "./relayTracing.ts";

it("always reports relay tracing as unavailable to clients", () => {
  assert.isFalse(allowedFor({}, undefined));
  assert.isFalse(allowedFor({ T3CODE_TELEMETRY_ENABLED: "true" }, undefined));
});

it.effect("does not create a product tracer with legacy credentials", () =>
  Effect.gen(function* () {
    assert.isTrue(Option.isNone(yield* RelayTracing.RelayClientTracer));
  }).pipe(
    Effect.provide(
      relayLayer(
        { serviceName: "test", runtime: "node", client: "environment-server" },
        {
          tracesUrl: "https://collector.example.test",
          tracesDataset: "relay",
          tracesToken: "legacy-token",
        },
      ),
    ),
  ),
);
