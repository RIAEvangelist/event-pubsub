# Migrating from event-pubsub 5.x to 6.x

Version 6 preserves the public method names and synchronous wildcard-first model, while tightening runtime support and formalizing previously inconsistent edge behavior.

## Requirements

- Upgrade production runtimes to Node.js 22.12.0 or newer.
- Install the 6.x package when it is available from your configured registry:

  ```sh
  npm install event-pubsub@6
  ```

- Continue importing the default or named ESM export:

  ```js
  import EventPubSub, {EventPubSub as NamedEventPubSub} from 'event-pubsub';
  ```

## Behavior to review

### `emit` remains fluent

`emit(type, ...payload)` continues to return the current instance, including when no typed subscriber exists. Version 6 adds regression coverage for this established contract; no migration is required.

### One-shot state is internal

Version 5 wrote `Symbol.for('event-pubsub-once')` onto handler functions. Version 6 stores one-shot state in packed internal records, so frozen and nonextensible functions work. Code that inspected or changed that undocumented symbol must stop doing so.

### One-shot removal happens before invocation

A one-shot subscriber cannot run again through a reentrant emit. It also stays removed if it throws.

### Dispatch mutation is explicit

- A subscriber added during an emit waits for the next emit.
- A subscriber removed before its turn does not run in the current emit.
- `reset()` during an emit prevents remaining subscribers from running.

### `list` is an isolated snapshot

Each `list` access creates a null-prototype object with copied handler arrays. Mutating or deleting snapshot values no longer mutates the live registry. Use `Object.hasOwn(snapshot, type)` instead of calling `snapshot.hasOwnProperty(...)`. The wildcard entry remains available through `Symbol.for('event-pubsub-all')`.

### Browser package imports

The prepared 6.0.0 source has zero runtime dependencies. Bundlers resolve the package normally. Unbundled browsers can import a relative module URL or use an import map for `event-pubsub`; no dependency mapping is required.

## Tooling cleanup

- `vanilla-test` is now pinned exactly at 2.1.1.
- Native Node and Chrome coverage replaces c8.
- Copy-based package emulation is gone.
- `copyfiles`, `c8`, and the test-only `node-http-server` dependency are removed.
- Production installs have zero dependencies. They do not install `copyfiles`, `strong-type`, or `vanilla-test`.

## Suggested migration test

Run your application suite after the upgrade, paying particular attention to reentrant emit flows, handler removal during dispatch, synchronous throws, asynchronous rejections, list inspection, and browsers that use unbundled ESM.
