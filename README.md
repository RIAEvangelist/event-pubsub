# event-pubsub

[![CI](https://github.com/RIAEvangelist/event-pubsub/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/RIAEvangelist/event-pubsub/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/event-pubsub.svg)](https://www.npmjs.com/package/event-pubsub)
[![Node lines](https://img.shields.io/endpoint?url=https://riaevangelist.github.io/event-pubsub/badges/lines.json)](https://riaevangelist.github.io/event-pubsub/reports/node/)
[![license](https://img.shields.io/github/license/RIAEvangelist/event-pubsub.svg)](./licence)

Small, synchronous, extensible publish/subscribe events for modern Node.js and browsers.

> **Release status:** `6.0.0` is prepared and verified on `main`, but is not yet published to npm. The npm badge and unversioned install command continue to resolve the current registry release, `5.0.3`, until publication.

![event-pubsub signal fan-out](https://riaevangelist.github.io/event-pubsub/og.png)

```sh
npm install event-pubsub
```

```js
import EventPubSub from 'event-pubsub';

const events = new EventPubSub();

events.on('ready', (payload) => {
    console.log(payload);
});

events.emit('ready', {fast: true});
```

## Why this module

- Five fluent methods: `on`, `once`, `off`, `emit`, and `reset`.
- Synchronous, registration-order dispatch with wildcard subscribers first.
- One-shot subscribers are removed before invocation, including reentrant emits.
- Subscribers added during an emit wait for the next emit; subscribers removed before their turn are skipped.
- Safe event names, including `__proto__`, `constructor`, and `toString`.
- Isolated `list` snapshots that cannot mutate the live registry.
- Native ESM for Node and browsers, without a transpilation or build requirement.

## API

| Member | Signature | Behavior |
| --- | --- | --- |
| `on` | `on(type, handler, once = false)` | Register a persistent or explicitly one-shot handler. |
| `once` | `once(type, handler)` | Register a handler removed immediately before its first call. |
| `off` | `off(type = '*', handler = '*')` | Remove every matching handler or a whole event type. |
| `emit` | `emit(type, ...payload)` | Run wildcard handlers, then typed handlers, synchronously. |
| `reset` | `reset()` | Clear the complete registry. |
| `list` | `get list()` | Return an isolated null-prototype object snapshot of handler arrays. |

All public mutators return the current instance. Event types must be strings, and `on`/`once` validate their handler immediately. For 5.x compatibility, `off` returns early for a missing type before validating its optional handler. Synchronous handler throws propagate to the publisher; return values and promises are ignored, so applications must handle asynchronous rejections themselves.

### Wildcard events

`*` subscribers run before typed subscribers and receive the emitted type as their first argument.

```js
events.on('*', (type, ...payload) => {
    console.log(type, payload);
});

events.emit('invoice.paid', {id: 42});
```

The wildcard list entry is exposed at `Symbol.for('event-pubsub-all')`.

### Browser import map

The prepared 6.0.0 runtime has zero dependencies. An unbundled browser can map the package directly:

```html
<script type="importmap">
{
  "imports": {
    "event-pubsub": "./node_modules/event-pubsub/index.js"
  }
}
</script>
<script type="module">
  import EventPubSub from 'event-pubsub';
</script>
```

## Verification

The shared host-neutral suite contains 90 unique checks:

| Suite | Cases | Focus |
| --- | ---: | --- |
| Unit | 16 | Exports, state, fluent identity, validation, and list shape |
| Functional | 26 | Registration, dispatch, wildcard, once, removal, reset, and chaining |
| Integration | 14 | Subclassing, routing, isolation, namespaces, lifecycle, and errors |
| Regression | 34 | Mutation, reentrancy, snapshots, safe names, throws, and legacy edges |

```sh
npm test
npm run coverage
npm run benchmark
npm run test:package
npm run site:check
npm run verify
```

`vanilla-test` 2.1.1 executes the same registry in Node and real Chrome. Each runtime independently gates `index.js` at 100% executable ranges, block ranges, function ranges, and executable lines. The configuration keys retain the familiar `statements`, `branches`, `functions`, and `lines` names, but the first two are native V8 ranges rather than parser-derived Istanbul counts. The package smoke installs the generated tarball in a clean temporary consumer. The benchmark validates each scenario before timing and publishes machine-readable medians.

## Documentation

- [Overview](https://riaevangelist.github.io/event-pubsub/)
- [Guide](https://riaevangelist.github.io/event-pubsub/guide.html)
- [API](https://riaevangelist.github.io/event-pubsub/api.html)
- [Examples](https://riaevangelist.github.io/event-pubsub/examples.html)
- [Playground](https://riaevangelist.github.io/event-pubsub/playground.html)
- [All 90 tests](https://riaevangelist.github.io/event-pubsub/testing.html)
- [Node and Chrome coverage](https://riaevangelist.github.io/event-pubsub/coverage.html)
- [Benchmarks](https://riaevangelist.github.io/event-pubsub/benchmarks.html)
- [5.x → 6.x migration](./MIGRATION.md)
- [Security policy](./SECURITY.md)
- [Changelog](./CHANGELOG.md)

## Runtime support

- Node.js 22.12.0 or newer.
- Modern browsers with native modules, private class fields, `Symbol`, and import-map or bundler support for package imports.

## License

MIT. See [licence](./licence).
