import EventPubSub from '../index.js';
import {arrayEqual, assert, equal, throws} from './assertions.js';

const wildcard = Symbol.for('event-pubsub-all');

export default Object.freeze({
    name: 'Regression',
    description: 'Live mutation, reentrancy, per-registration once state, snapshots, safe names, and throws.',
    tests: Object.freeze([
        {name: '__proto__ is a safe event name', run() {
            const events = new EventPubSub(); const handler = () => {};
            events.on('__proto__', handler); equal(events.list.__proto__[0], handler);
            equal(Object.getPrototypeOf(events.list), null);
        }},
        {name: 'constructor is a safe event name', run() {
            const events = new EventPubSub(); const handler = () => {};
            events.on('constructor', handler); equal(events.list.constructor[0], handler);
        }},
        {name: 'toString is a safe event name', run() {
            const events = new EventPubSub(); let calls = 0;
            events.on('toString', () => { calls += 1; }).emit('toString'); equal(calls, 1);
        }},
        {name: 'hasOwnProperty is a safe event name', run() {
            const events = new EventPubSub(); let calls = 0;
            events.on('hasOwnProperty', () => { calls += 1; }).emit('hasOwnProperty'); equal(calls, 1);
        }},
        {name: 'numeric-looking event names remain strings', run() {
            const events = new EventPubSub(); let value;
            events.on('0', (payload) => { value = payload; }).emit('0', 7); equal(value, 7);
        }},
        {name: 'the wildcard symbol description remains an exact typed event', run() {
            const events = new EventPubSub(); const order = [];
            const wildcardHandler = (type) => order.push(`wildcard:${type}`);
            const typedHandler = () => order.push('typed');
            const exactType = wildcard.toString();
            events.on('*', wildcardHandler).on(exactType, typedHandler).emit(exactType);
            arrayEqual(order, [`wildcard:${exactType}`, 'typed']);
            events.off(exactType, typedHandler).off(exactType, wildcardHandler);
            equal(events.list[exactType], undefined); arrayEqual(events.list[wildcard], [wildcardHandler]);
        }},
        {name: 'off compares the remove-all handler sentinel strictly', run() {
            const events = new EventPubSub(); const removed = () => {}; const kept = () => {};
            removed[Symbol.toPrimitive] = () => '*';
            events.on('topic', removed).on('topic', kept).off('topic', removed);
            arrayEqual(events.list.topic, [kept]);
        }},
        {name: 'emitting the literal wildcard type invokes wildcard handlers once', run() {
            const events = new EventPubSub(); let calls = 0;
            events.on('*', () => { calls += 1; }).emit('*'); equal(calls, 1);
        }},
        {name: 'handlers added during typed dispatch run in that emit', run() {
            const events = new EventPubSub(); const order = []; const late = () => order.push('late');
            events.once('topic', () => { order.push('first'); events.on('topic', late); });
            events.on('topic', () => order.push('second')).emit('topic');
            arrayEqual(order, ['first', 'second', 'late']); events.emit('topic');
            arrayEqual(order, ['first', 'second', 'late', 'second', 'late']);
        }},
        {name: 'typed handlers added by a wildcard run in that emit', run() {
            const events = new EventPubSub(); const order = []; const late = () => order.push('late');
            events.once('*', () => { order.push('wildcard'); events.on('topic', late); });
            events.on('topic', () => order.push('typed')).emit('topic');
            arrayEqual(order, ['wildcard', 'typed', 'late']); events.emit('topic');
            arrayEqual(order, ['wildcard', 'typed', 'late', 'typed', 'late']);
        }},
        {name: 'wildcard handlers added during wildcard dispatch run in that emit', run() {
            const events = new EventPubSub(); const order = []; const late = () => order.push('late');
            events.once('*', () => { order.push('first'); events.on('*', late); });
            events.on('*', () => order.push('second')).emit('topic');
            arrayEqual(order, ['first', 'second', 'late']); events.emit('topic');
            arrayEqual(order, ['first', 'second', 'late', 'second', 'late']);
        }},
        {name: 'handlers removed during dispatch do not run later in that dispatch', run() {
            const events = new EventPubSub(); const order = []; const removed = () => order.push('removed');
            events.on('topic', () => { order.push('first'); events.off('topic', removed); });
            events.on('topic', removed).emit('topic'); arrayEqual(order, ['first']);
            const wildcardEvents = new EventPubSub(); const wildcardOrder = [];
            const removedWildcard = () => wildcardOrder.push('removed');
            wildcardEvents.on('*', () => { wildcardOrder.push('first'); wildcardEvents.off('*', removedWildcard); });
            wildcardEvents.on('*', removedWildcard).emit('topic'); arrayEqual(wildcardOrder, ['first']);
        }},
        {name: 'a wildcard can remove a typed handler before the typed phase', run() {
            const events = new EventPubSub(); const order = []; const removed = () => order.push('removed');
            events.on('*', () => { order.push('wildcard'); events.off('topic', removed); });
            events.on('topic', removed).on('topic', () => order.push('kept')).emit('topic');
            arrayEqual(order, ['wildcard', 'kept']);
        }},
        {name: 'reset during typed dispatch leaves the active array running', run() {
            const events = new EventPubSub(); const order = [];
            events.on('topic', () => { order.push('first'); events.reset(); });
            events.on('topic', () => order.push('second')).emit('topic');
            arrayEqual(order, ['first', 'second']); equal(events.list.topic, undefined);
        }},
        {name: 'reset from a wildcard finishes that array but prevents typed dispatch', run() {
            const events = new EventPubSub(); const order = [];
            events.on('*', () => { order.push('first'); events.reset(); });
            events.on('*', () => order.push('second')).on('topic', () => order.push('typed')).emit('topic');
            arrayEqual(order, ['first', 'second']); equal(events.list.topic, undefined);
        }},
        {name: 'once is removed before a reentrant emit', run() {
            const events = new EventPubSub(); let calls = 0;
            events.once('topic', () => { calls += 1; events.emit('topic'); }).emit('topic'); equal(calls, 1);
        }},
        {name: 'persistent reentrant emits preserve nested registration order', run() {
            const events = new EventPubSub(); const order = [];
            events.on('topic', (value) => {
                order.push(`first:${value}`);
                if (value === 'outer') events.emit('topic', 'inner');
            });
            events.on('topic', (value) => order.push(`second:${value}`)).emit('topic', 'outer');
            arrayEqual(order, ['first:outer', 'first:inner', 'second:inner', 'second:outer']);
        }},
        {name: 'wildcard once is removed before a reentrant emit', run() {
            const events = new EventPubSub(); let calls = 0;
            events.once('*', () => { calls += 1; events.emit('nested'); }).emit('outer'); equal(calls, 1);
        }},
        {name: 'a throwing once handler remains removed', run() {
            const events = new EventPubSub(); let calls = 0;
            events.once('topic', () => { calls += 1; throw new Error('once'); });
            throws(() => events.emit('topic')); events.emit('topic'); equal(calls, 1);
        }},
        {name: 'a throwing once handler is absent from the next list snapshot', run() {
            const events = new EventPubSub();
            events.once('topic', () => { throw new Error('once'); });
            throws(() => events.emit('topic')); equal(events.list.topic, undefined);
        }},
        {name: 'a throwing persistent handler remains registered', run() {
            const events = new EventPubSub(); let calls = 0;
            events.on('topic', () => { calls += 1; throw new Error('persistent'); });
            throws(() => events.emit('topic')); throws(() => events.emit('topic')); equal(calls, 2);
        }},
        {name: 'a thrown wildcard handler stops typed dispatch', run() {
            const events = new EventPubSub(); let typedCalls = 0;
            events.on('*', () => { throw new Error('stop'); }).on('topic', () => { typedCalls += 1; });
            throws(() => events.emit('topic')); equal(typedCalls, 0);
        }},
        {name: 'off with a nonmatching function preserves the type', run() {
            const events = new EventPubSub(); const handler = () => {};
            events.on('topic', handler).off('topic', () => {}); equal(events.list.topic[0], handler);
        }},
        {name: 'off ignores an invalid handler when the type is absent', run() {
            const events = new EventPubSub(); equal(events.off('missing', 42), events);
        }},
        {name: 'mutating a list array does not change the registry', run() {
            const events = new EventPubSub(); let calls = 0;
            events.on('topic', () => { calls += 1; }); events.list.topic.length = 0;
            events.emit('topic'); equal(calls, 1);
        }},
        {name: 'deleting a list property does not change the registry', run() {
            const events = new EventPubSub(); let calls = 0;
            events.on('topic', () => { calls += 1; }); const list = events.list; delete list.topic;
            events.emit('topic'); equal(calls, 1);
        }},
        {name: 'mutating a wildcard list snapshot does not change the registry', run() {
            const events = new EventPubSub(); let calls = 0;
            events.on('*', () => { calls += 1; }); events.list[wildcard].pop();
            events.emit('topic'); equal(calls, 1);
        }},
        {name: 'frozen handler functions can be registered', run() {
            const events = new EventPubSub(); let calls = 0;
            const handler = Object.freeze(() => { calls += 1; });
            events.once('topic', handler).emit('topic'); equal(calls, 1);
        }},
        {name: 'nonextensible handler functions can be registered', run() {
            const events = new EventPubSub(); let calls = 0;
            const handler = Object.preventExtensions(() => { calls += 1; });
            events.on('topic', handler).emit('topic'); equal(calls, 1);
        }},
        {name: 'duplicate once registrations each run once', run() {
            const events = new EventPubSub(); let calls = 0; const handler = () => { calls += 1; };
            events.once('topic', handler).once('topic', handler).emit('topic').emit('topic'); equal(calls, 2);
        }},
        {name: 'the same handler can be wildcard-once and typed-persistent', run() {
            const events = new EventPubSub(); const received = [];
            const handler = (...args) => received.push(args.join(':'));
            events.once('*', handler).on('topic', handler).emit('topic', 1).emit('topic', 2);
            arrayEqual(received, ['topic:1', '1', '2']);
        }},
        {name: 'registration does not write the old once symbol onto handlers', run() {
            const events = new EventPubSub(); const handler = () => {};
            events.once('topic', handler); equal(handler[Symbol.for('event-pubsub-once')], undefined);
        }},
        {name: 'the same handler can be once and persistent in one bucket', run() {
            const events = new EventPubSub(); let calls = 0; const handler = () => { calls += 1; };
            events.once('topic', handler).on('topic', handler).emit('topic').emit('topic'); equal(calls, 3);
        }},
        {name: 'the same handler has independent state across instances', run() {
            const onceEvents = new EventPubSub(); const persistentEvents = new EventPubSub(); let calls = 0;
            const handler = () => { calls += 1; };
            onceEvents.once('topic', handler); persistentEvents.on('topic', handler);
            onceEvents.emit('topic').emit('topic'); persistentEvents.emit('topic').emit('topic'); equal(calls, 3);
        }},
        {name: 'typed once removal does not skip the next registration', run() {
            const events = new EventPubSub(); const order = [];
            events.once('topic', () => order.push('once')).on('topic', () => order.push('persistent'));
            events.emit('topic'); arrayEqual(order, ['once', 'persistent']);
        }},
        {name: 'wildcard once removal does not skip the next registration', run() {
            const events = new EventPubSub(); const order = [];
            events.once('*', () => order.push('once')).on('*', () => order.push('persistent'));
            events.emit('topic'); arrayEqual(order, ['once', 'persistent']);
        }},
        {name: 'a sole once handler can add a handler to its live bucket', run() {
            const events = new EventPubSub(); const order = [];
            events.once('topic', () => {
                order.push('once'); events.on('topic', () => order.push('added'));
            }).emit('topic');
            arrayEqual(order, ['once', 'added']);
        }},
        {name: 'off all during dispatch leaves the active array running', run() {
            const events = new EventPubSub(); const order = [];
            events.on('topic', () => { order.push('first'); events.off('topic'); });
            events.on('topic', () => order.push('second')).emit('topic');
            arrayEqual(order, ['first', 'second']); equal(events.list.topic, undefined);
        }},
        {name: 'stale once cleanup cannot delete a fresh same-name bucket', run() {
            const events = new EventPubSub(); const order = [];
            const fresh = () => order.push('fresh');
            events.once('topic', () => { order.push('first'); events.reset().on('topic', fresh); });
            events.once('topic', () => order.push('second')).emit('topic');
            arrayEqual(order, ['first', 'second']); equal(events.list.topic[0], fresh);
            events.emit('topic'); arrayEqual(order, ['first', 'second', 'fresh']);
        }},
        {name: 'an earlier once remains consumed when a later handler throws', run() {
            const events = new EventPubSub(); let onceCalls = 0; let persistentCalls = 0;
            events.once('topic', () => { onceCalls += 1; });
            events.on('topic', () => { persistentCalls += 1; throw new Error('stop'); });
            throws(() => events.emit('topic')); throws(() => events.emit('topic'));
            equal(onceCalls, 1); equal(persistentCalls, 2);
        }},
        {name: 'persistent self-removal preserves shifted-array iteration', run() {
            const events = new EventPubSub(); const order = [];
            function first() { order.push('first'); events.off('topic', first); }
            events.on('topic', first).on('topic', () => order.push('second')).emit('topic');
            arrayEqual(order, ['first']);
        }},
        {name: 'wildcard-only emits remain chainable', run() {
            const events = new EventPubSub().on('*', () => {}); equal(events.emit('unregistered-type'), events);
        }},
        {name: 'reset instances accept new registrations immediately', run() {
            const events = new EventPubSub(); let calls = 0;
            events.on('old', () => {}).reset().on('new', () => { calls += 1; }).emit('new');
            equal(calls, 1); assert(!('old' in events.list));
        }}
    ])
});
