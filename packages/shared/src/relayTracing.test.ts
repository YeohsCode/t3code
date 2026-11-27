import { expect, it, vi } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Tracer from "effect/Tracer";
import { FetchHttpClient } from "effect/http";

import {
  layer,
  RelayClientTracer,
  withLocalTracing,
  withRelayClientTracing,
} from "./relayTracing.ts";

it.effect("keeps diagnostics local even with relay export credentials and sending enabled", () => {
  const fetchFn = vi.fn<typeof fetch>(async () => new Response(null, { status: 202 }));
  const spans: Array<string> = [];
  const tracer = Tracer.make({
    span(options) {
      spans.push(options.name);
      return new Tracer.NativeSpan(options);
    },
  });
  return Effect.gen(function* () {
    expect(Option.isNone(yield* RelayClientTracer)).toBe(true);
    yield* Effect.void.pipe(Effect.withSpan("relay.request"), withRelayClientTracing);
    yield* Effect.void.pipe(Effect.withSpan("local.work"), withLocalTracing);
    const failure = { message: "private failure" };
    expect(yield* Effect.fail(failure).pipe(withRelayClientTracing, Effect.flip)).toBe(failure);
  }).pipe(
    Effect.withTracer(tracer),
    Effect.provide(
      Layer.mergeAll(
        FetchHttpClient.layer,
        layer(
          {
            tracesUrl: "https://collector.example.test",
            tracesDataset: "relay",
            tracesToken: "legacy-token",
          },
          {
            serviceName: "test",
            runtime: "node",
            serviceInstanceId: "private-install",
            client: "web",
          },
          { isEnabled: () => true },
        ),
      ),
    ),
    Effect.provideService(FetchHttpClient.Fetch, fetchFn),
    Effect.andThen(
      Effect.sync(() => {
        expect(fetchFn).not.toHaveBeenCalled();
        expect(spans).toContain("relay.request");
        expect(spans).toContain("local.work");
      }),
    ),
  );
});
