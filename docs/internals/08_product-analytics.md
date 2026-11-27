# Product analytics

Product analytics and first-party relay tracing are removed in this fork. Legacy configuration
must not re-enable outbound collection or create installation, account, or analytics device
identifiers. The remaining internal analytics interfaces return without collecting data or
performing filesystem or network I/O; feedback reports remain local and report `sent: false`.

Local resource monitoring and operator-configured OpenTelemetry exports are independent of product
analytics and remain available for diagnostics. T3 Connect activity publishing is a user-controlled
notification feature; see [mobile notifications](../user/mobile-notifications.md).
