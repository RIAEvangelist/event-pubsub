# Changelog

## 6.0.0 — 2026-08-21

Published as the GitHub source release after complete `main` verification. npm publication remains a separate release action; npm latest is still 5.0.3.

### Runtime

- Rebuilt the event registry and hot dispatch paths for modern Node.js and browsers.
- Preserved wildcard-first synchronous execution and fluent public methods.
- Removed one-shot metadata mutation from user-provided functions.
- Removed one-shot records before invocation for reentrant and throwing-handler safety.
- Deferred handlers added during dispatch and skipped handlers removed before their turn.
- Regression-tested the existing fluent `emit` return contract, including wildcard-only and missing-type dispatch.
- Made `list` return isolated handler-array snapshots.
- Made prototype-like event names safe.
- Removed the runtime dependency and replaced delegated hot-path validation with direct native checks.

### Verification

- Replaced duplicated legacy tests with one shared 110-case registry.
- Split verification into Unit (16), Functional (26), Integration (14), Regression (34), and Interface (20) suites.
- Updated to exact `vanilla-test` 2.1.1.
- Added independent Node and real-Chrome native V8 coverage with 100% per-runtime gates.
- Added a packed npm consumer smoke test.
- Added eight fixed-count hot-path benchmarks with execution-only timing boundaries, nanoseconds-per-operation summaries, raw samples, and machine-readable schema v2 results.
- Added a Node 22.12/24, Ubuntu/macOS/Windows CI matrix.

### Documentation

- Added a focused 21-page GitHub Pages site, robust event-console and mutation-scenario playgrounds, live shared-suite runner, coverage reports, latency charts, migration guide, and security policy.
- Migrated the repository default branch from `master` to `main` while preserving the legacy branch.
- Removed stale committed c8 output and legacy copy-based test emulation.
- Removed `c8`, `copyfiles`, and the test-only static server from development dependencies.

## 5.0.3 — 2020-11-26

- Published the prior 5.x npm package with ESM Node/browser examples and the original vanilla-test checks.

Earlier release lines remain available in Git tags and historical branches.
