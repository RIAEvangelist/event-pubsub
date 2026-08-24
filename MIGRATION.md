# Migrating from event-pubsub 5.x to 6.x

Version 6 preserves the public method names and synchronous wildcard-first model while formalizing previously inconsistent edge behavior. The 6.1.0 npm release restored delegated validation and shared-source CommonJS consumption. The prepared 6.1.1 correction makes Node resolve that validator through event-pubsub's declared dependency boundary.

## Requirements

- Use Node.js 22.12.0 or newer for production and repository development.
- Install the current 6.x package from your configured registry:

  ```sh
  npm install event-pubsub@6
  ```

- Continue importing the default or named ESM export, or require the same source directly from CommonJS:

  ```js
  import EventPubSub, {EventPubSub as NamedEventPubSub} from 'event-pubsub';
  ```

  ```js
  const EventPubSub = require('event-pubsub');
  ```

### Package layout

The package keeps its historical ESM entry at `event-pubsub/index.js` without a restrictive export map and declares that same source as its browser entry. Applications should normally import `event-pubsub`; repository-only paths are not part of the supported API.

## Behavior to review

### `emit` remains fluent

`emit(type, ...payload)` continues to return the current instance, including when no typed subscriber exists. Version 6 adds regression coverage for this established contract; no migration is required.

### One-shot state is internal

Version 5 wrote `Symbol.for('event-pubsub-once')` onto handler functions. Version 6.1.0 stores one-shot state in internal `{handler, once}` registration records, so frozen and nonextensible functions work. Code that inspected or changed that undocumented symbol must stop doing so.

### One-shot removal happens before invocation

A one-shot subscriber cannot run again through a reentrant emit. It also stays removed if it throws.

### Validation is delegated again

Public argument checks again come from `strong-type` 2.0.0. Invalid inputs still throw `TypeError`, but applications must not depend on the exact error text introduced by the direct checks in the 6.0.0 source release.

### Dispatch remains live

- A subscriber appended to the active array can run in the same emit.
- A specifically removed subscriber does not run if its turn has not arrived. Removing a whole bucket detaches it from future lookup while an already-active array finishes.
- `reset()` replaces the registry, but an array already being dispatched continues. If reset happens in the wildcard phase, the old typed bucket is not looked up afterward.

### `list` is an isolated snapshot

Each `list` access creates a null-prototype object with copied handler arrays. Mutating or deleting snapshot values no longer mutates the live registry. Use `Object.hasOwn(snapshot, type)` instead of calling `snapshot.hasOwnProperty(...)`. The wildcard entry remains available through `Symbol.for('event-pubsub-all')`.

### Package dependency resolution

The 6.1.0 entry reached `strong-type` through `../strong-type/index.js`. In a consumer with an incompatible root validator and event-pubsub's exact 2.0.0 nested beneath it, that relative path could execute the root package. The prepared 6.1.1 entry uses the bare `strong-type` name, so Node and bundlers resolve from event-pubsub outward and select its nested declared dependency first.

Browser support is explicit in both modes: bundlers resolve both package names normally, while unbundled native ESM runs the same source directly with an import map and no build step. Native browsers do not read the npm `browser` field. Put the map before the first module script, serve the app over HTTP(S), and map both `event-pubsub` and `strong-type`. When npm nests event-pubsub's validator because the root version conflicts, add an import-map scope for `./node_modules/event-pubsub/` that maps `strong-type` to `./node_modules/event-pubsub/node_modules/strong-type/index.js`. The README contains complete hoisted and conflicting-layout examples, both exercised from a packed install in real Chrome.

## Tooling cleanup

- `vanilla-test` is now pinned exactly at 2.1.1.
- Rollup 4.62.5 with node-resolve 16.0.3 is exact-pinned and configured only for JavaScript as the bundled-browser conformance probe.
- Native Node and Chrome coverage replaces c8.
- The old `copyfiles` dependency is gone; a dependency-free staging script now verifies the nested exact dependency in Node and maps that same copy for browser coverage.
- `copyfiles`, `c8`, and the test-only `node-http-server` dependency are removed.
- Production installs contain exactly one dependency: `strong-type` 2.0.0. They do not install `copyfiles` or the development-only `vanilla-test`.

## Suggested migration test

Run your application suite after the upgrade, paying particular attention to reentrant emit flows, handler removal during dispatch, synchronous throws, asynchronous rejections, list inspection, and browsers that use unbundled ESM.
