import EventPubSub from '../index.js';
import {arrayEqual, assert, equal, throws} from './assertions.js';

const wildcard = Symbol.for('event-pubsub-all');

export default Object.freeze({
    name: 'Regression',
    description: 'Mutation, reentrancy, prototype-like names, snapshots, throws, and legacy edges.',
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
        {name: 'the legacy wildcard symbol string still removes wildcard handlers', run() {
            const events = new EventPubSub().on('*', () => {});
            events.off(Symbol.for('event-pubsub-all').toString()); equal(events.list[wildcard], undefined);
        }},
        {name: 'the legacy wildcard alias prefers exact typed registrations before wildcard fallback', run() {
            const events = new EventPubSub(); const removed = () => {}; const kept = () => {};
            const exactType = wildcard.toString(); let typedCalls = 0;
            const typed = () => { typedCalls += 1; };
            events.on('*', removed).on('*', kept).on(exactType, typed);
            events.off(exactType, typed).emit(exactType); equal(typedCalls, 0);
            arrayEqual(events.list[wildcard], [removed, kept]);
            events.off(exactType, removed);
            arrayEqual(events.list[wildcard], [kept]);
        }},
        {name: 'emitting the literal wildcard type invokes wildcard handlers once', run() {
            const events = new EventPubSub(); let calls = 0;
            events.on('*', () => { calls += 1; }).emit('*'); equal(calls, 1);
        }},
        {name: 'handlers added during dispatch wait for the next emit', run() {
            const events = new EventPubSub(); const order = []; const late = () => order.push('late');
            events.once('topic', () => { order.push('first'); events.on('topic', late); });
            events.on('topic', () => order.push('second')).emit('topic');
            arrayEqual(order, ['first', 'second']); events.emit('topic');
            arrayEqual(order, ['first', 'second', 'second', 'late']);
        }},
        {name: 'typed handlers added by a wildcard wait for the next emit', run() {
            const events = new EventPubSub(); const order = []; const late = () => order.push('late');
            events.once('*', () => { order.push('wildcard'); events.on('topic', late); });
            events.on('topic', () => order.push('typed')).emit('topic');
            arrayEqual(order, ['wildcard', 'typed']); events.emit('topic');
            arrayEqual(order, ['wildcard', 'typed', 'typed', 'late']);
        }},
        {name: 'wildcard handlers added during wildcard dispatch wait for the next emit', run() {
            const events = new EventPubSub(); const order = []; const late = () => order.push('late');
            events.once('*', () => { order.push('first'); events.on('*', late); });
            events.on('*', () => order.push('second')).emit('topic');
            arrayEqual(order, ['first', 'second']); events.emit('topic');
            arrayEqual(order, ['first', 'second', 'second', 'late']);
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
        {name: 'reset during dispatch prevents remaining handlers', run() {
            const events = new EventPubSub(); const order = [];
            events.on('topic', () => { order.push('first'); events.reset(); });
            events.on('topic', () => order.push('second')).emit('topic'); arrayEqual(order, ['first']);
        }},
        {name: 'reset from a wildcard prevents later wildcard and typed handlers', run() {
            const events = new EventPubSub(); const order = [];
            events.on('*', () => { order.push('first'); events.reset(); });
            events.on('*', () => order.push('second')).on('topic', () => order.push('typed')).emit('topic');
            arrayEqual(order, ['first']);
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
