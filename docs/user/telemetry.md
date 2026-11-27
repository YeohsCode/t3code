# Privacy and diagnostics

This build does not send product usage events, installation or account identifiers, relay
connection traces, crash reports, or startup measurements to T3 Code, PostHog, or Axiom.
Legacy telemetry environment variables and saved reporting preferences cannot enable them.
Agent feedback stays on this machine and is not delivered to the T3 team.

Local resource monitoring and diagnostic logs remain available. On mobile, **Settings > About T3
Code > Diagnostics** lets you read and copy startup crash records; copying does not upload them.

## Agent activity for mobile notifications

**Settings → Sharing & access → Publish agent activity** sends project/thread titles, model names, and turn status to the T3 Connect relay for [mobile notifications and live activities](./mobile-notifications.md). This is independent of telemetry—turn it off directly on the host if you don't want it.

## Export diagnostics to your own OpenTelemetry receiver

Open **Settings → Maintenance → Diagnostics** (per environment) and enter OTLP HTTP endpoints (e.g. `http://localhost:4318/v1/traces`), save, and restart the server. Use **Test** to verify connectivity.

`T3CODE_OTLP_*_URL` and standard `OTEL_EXPORTER_OTLP_*` env vars override saved settings (use `T3CODE_OTLP_HEADERS` / `T3CODE_OTLP_PROTOCOL=http/protobuf` or the standard `OTEL_EXPORTER_OTLP_*` equivalents for auth and protobuf).
