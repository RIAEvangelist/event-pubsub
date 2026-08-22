# Migrating from event-pubsub 5.x to 6.x

Version 6 preserves the public method names and synchronous wildcard-first model while formalizing previously inconsistent edge behavior. The prepared 6.1.0 source on `main` restores the original delegated validation and package layout while adding shared-source CommonJS consumption.

## Requirements

- Use Node.js 22.12.0 or newer for production and repository development.
- Install the 6.x package when it is available from your configured registry:

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

The package keeps its historical ESM entry at `event-pubsub/index.js` without a restrictive export map. Applications should normally import `event-pubsub`; repository-only paths are not part of the supported API.

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

### Browser package imports

The prepared 6.1.0 source restores `strong-type` 2.0.0 as the sole production dependency and preserves the deliberate `../strong-type/index.js` include shim. Node installs both packages as siblings. For an unbundled browser, serve the same sibling directories and map the public `event-pubsub` name to its `index.js`; the relative validator import then resolves without a second package-name mapping. npm latest remains 5.0.3 until a separate registry publication.

## Tooling cleanup

- `vanilla-test` is now pinned exactly at 2.1.1.
- Native Node and Chrome coverage replaces c8.
- The old `copyfiles` dependency is gone; a dependency-free staging script now verifies the package-shaped Node/browser layout.
- `copyfiles`, `c8`, and the test-only `node-http-server` dependency are removed.
- Production installs contain exactly one dependency: `strong-type` 2.0.0. They do not install `copyfiles` or the development-only `vanilla-test`.

## Suggested migration test

Run your application suite after the upgrade, paying particular attention to reentrant emit flows, handler removal during dispatch, synchronous throws, asynchronous rejections, list inspection, and browsers that use unbundled ESM.
