import { assert, it, vi } from "@effect/vitest";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";
import { FetchHttpClient } from "effect/http";

import * as AnalyticsService from "./AnalyticsService.ts";

it.effect("never collects or sends events, even with legacy telemetry explicitly enabled", () => {
  const fetchFn = vi.fn<typeof fetch>(async () => new Response(null, { status: 202 }));
  return Effect.gen(function* () {
    const analytics = yield* AnalyticsService.AnalyticsService;
    assert.isFalse(yield* analytics.record("server.boot.heartbeat", { threadCount: 2 }));
    assert.isFalse(
      yield* analytics.record("agent.feedback", { subject: "general" }, { anonymous: true }),
    );
    yield* analytics.recordOwners([{ source: "connect", ownerId: "private-account" }], "server");
    yield* analytics.recordOwners([{ source: "device", ownerId: "private-device" }], "client");
    yield* TestClock.adjust("1 hour");
    yield* analytics.flush;
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        AnalyticsService.layer,
        FetchHttpClient.layer,
        ConfigProvider.layer(
          ConfigProvider.fromEnvRecord({
            T3CODE_TELEMETRY_ENABLED: "true",
            T3CODE_POSTHOG_HOST: "https://collector.example.test",
            T3CODE_POSTHOG_KEY: "legacy-key",
          }),
        ),
      ),
    ),
    Effect.provideService(FetchHttpClient.Fetch, fetchFn),
    Effect.andThen(Effect.sync(() => assert.strictEqual(fetchFn.mock.calls.length, 0))),
  );
});

it.effect("initializes without filesystem, identity, server config or network services", () =>
  Effect.gen(function* () {
    const analytics = yield* AnalyticsService.make;
    assert.isFalse(yield* analytics.record("provider.turn.completed"));
    yield* analytics.flush;
  }),
);
