# Changelog

## Unreleased — 6.1.1 candidate

- Replaced the consumer-root-relative `../strong-type/index.js` import with the bare `strong-type` package name so Node selects event-pubsub's declared nested exact dependency under a root version conflict.
- Declared the shared `index.js` source as the explicit browser entry and documented normal and conflict-scoped import maps for unbundled browsers.
- Added a packed-consumer regression that installs `strong-type` 1.1.0 at the consumer root, poisons that copy, instruments event-pubsub's nested 2.0.0, and proves both ESM and CommonJS execute the nested validator.
- Staged the exact validator beneath event-pubsub and mapped that same copy explicitly for real-Chrome coverage.
- Added a 12-scenario Behavioral suite with Given/When/Then consumer workflows for audited delivery, nested events, lifecycle teardown, routing, synchronous replies, shared payloads, failure propagation, asynchronous side effects, live subscriber changes, and hub isolation.
- Expanded the shared host-neutral Node/Chrome registry to 131 checks and added the focused `npm run test:behavioral` command.
- Added a focused Behavioral inventory page and carried the 131-check total through CI, coverage, status, and deployment validation without adding a test dependency.

## 6.1.0 — 2026-08-21

Published to npm and GitHub from the same verified source commit as the current release.

- Added direct CommonJS `require('event-pubsub')` support while keeping one native ESM implementation for both module systems.

- Restored `strong-type` 2.0.0 as the sole production dependency and preserved the original package-shaped `../strong-type/index.js` Node/browser shim.
- Kept wildcard and typed registrations together in one null-prototype registry, with the real wildcard stored under `Symbol.for('event-pubsub-all')`.
- Moved one-shot state from user functions into per-registration `{handler, once}` records and removed each one-shot registration before invocation.
- Restored delegated public validation; invalid-input `TypeError` messages can differ from the direct checks in 6.0.0.
- Restored live-array dispatch behavior while making duplicate removal linear and registry reset constant-time.
- Set the production and development floor to Node.js 22.12.0, where synchronous ESM can be loaded directly through `require()` without a duplicate build.
- Expanded the shared Node/Chrome inventory to 119 cases, including mixed once/persistent handlers, live mutation, strict wildcard removal, stale cleanup, and throwing-handler regressions.
- Kept `copyfiles` out of the runtime and development dependency trees.

## 6.0.0 — 2026-08-21

Published as the GitHub source release after complete `main` verification. At that milestone npm latest remained 5.0.3; 6.1.0 later became the registry release.

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
