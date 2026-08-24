import EventPubSub from './package-entry.js';
import {arrayEqual, assert, equal} from './assertions.js';

const wildcard = Symbol.for('event-pubsub-all');

export default Object.freeze({
    name: 'Functional',
    description: 'Core registration, dispatch, wildcard, removal, reset, and chaining behavior.',
    tests: Object.freeze([
        {name: 'on exposes the registered handler in list', run() {
            const events = new EventPubSub(); const handler = () => {};
            events.on('topic', handler); equal(events.list.topic[0], handler);
        }},
        {name: 'on preserves registration order in list', run() {
            const events = new EventPubSub(); const first = () => {}; const second = () => {};
            events.on('topic', first).on('topic', second); arrayEqual(events.list.topic, [first, second]);
        }},
        {name: 'duplicate registrations remain visible as separate entries', run() {
            const events = new EventPubSub(); const handler = () => {};
            events.on('topic', handler).on('topic', handler); arrayEqual(events.list.topic, [handler, handler]);
        }},
        {name: 'emit runs a registered handler synchronously', run() {
            const events = new EventPubSub(); let called = false;
            events.on('topic', () => { called = true; }).emit('topic'); equal(called, true);
        }},
        {name: 'emit runs handlers in registration order', run() {
            const events = new EventPubSub(); const order = [];
            events.on('topic', () => order.push('first')).on('topic', () => order.push('second')).emit('topic');
            arrayEqual(order, ['first', 'second']);
        }},
        {name: 'emit forwards every payload argument by identity', run() {
            const events = new EventPubSub(); const object = {id: 7}; const received = [];
            events.on('topic', (...args) => { received.push(args); });
            events.emit('topic').emit('topic', object).emit('topic', object, 'two').emit('topic', object, 'two', 3);
            arrayEqual(received[0], []); equal(received[1][0], object);
            equal(received[2][0], object); arrayEqual(received[2].slice(1), ['two']);
            equal(received[3][0], object); arrayEqual(received[3].slice(1), ['two', 3]);
        }},
        {name: 'handlers run without an emitter-bound this value', run() {
            const events = new EventPubSub(); let context = 'unset';
            events.on('topic', function handler() { context = this; }).emit('topic'); equal(context, undefined);
        }},
        {name: 'once runs a handler exactly once', run() {
            const events = new EventPubSub(); let calls = 0;
            events.once('topic', () => { calls += 1; }).emit('topic').emit('topic'); equal(calls, 1);
        }},
        {name: 'on with an explicit false once flag remains persistent', run() {
            const events = new EventPubSub(); let calls = 0;
            events.on('topic', () => { calls += 1; }, false).emit('topic').emit('topic'); equal(calls, 2);
        }},
        {name: 'on with an explicit true once flag matches once', run() {
            const events = new EventPubSub(); let calls = 0;
            events.on('topic', () => { calls += 1; }, true).emit('topic').emit('topic'); equal(calls, 1);
        }},
        {name: 'wildcard handlers receive the emitted type before payloads', run() {
            const events = new EventPubSub(); const received = [];
            events.on('*', (...args) => { received.push(args); });
            events.emit('zero').emit('one', 1).emit('two', 1, 2).emit('three', 1, 2, 3);
            arrayEqual(received[0], ['zero']); arrayEqual(received[1], ['one', 1]);
            arrayEqual(received[2], ['two', 1, 2]); arrayEqual(received[3], ['three', 1, 2, 3]);
        }},
        {name: 'wildcard handlers run before typed handlers', run() {
            const events = new EventPubSub(); const order = [];
            events.on('topic', () => order.push('typed')).on('*', () => order.push('wildcard')).emit('topic');
            arrayEqual(order, ['wildcard', 'typed']);
        }},
        {name: 'multiple wildcard handlers retain registration order', run() {
            const events = new EventPubSub(); const order = [];
            events.on('*', () => order.push(1)).on('*', () => order.push(2)).emit('topic'); arrayEqual(order, [1, 2]);
        }},
        {name: 'once supports wildcard subscriptions', run() {
            const events = new EventPubSub(); const types = []; let persistentCalls = 0;
            events.once('*', (type) => types.push(type)).on('*', () => { persistentCalls += 1; });
            events.emit('first').emit('second'); arrayEqual(types, ['first']); equal(persistentCalls, 2);
        }},
        {name: 'wildcard handlers are exposed under the stable symbol', run() {
            const events = new EventPubSub(); const handler = () => {};
            events.on('*', handler); equal(events.list[wildcard][0], handler);
        }},
        {name: 'off removes a matching handler', run() {
            const events = new EventPubSub(); const handler = () => {};
            events.on('topic', handler).off('topic', handler); equal(events.list.topic, undefined);
        }},
        {name: 'off removes every duplicate registration of a handler', run() {
            const events = new EventPubSub(); const handler = () => {};
            events.on('topic', handler).on('topic', handler).off('topic', handler); equal(events.list.topic, undefined);
        }},
        {name: 'off leaves nonmatching handlers registered', run() {
            const events = new EventPubSub(); const keep = () => {}; const remove = () => {};
            events.on('topic', keep).on('topic', remove).off('topic', remove); arrayEqual(events.list.topic, [keep]);
        }},
        {name: 'off with a wildcard handler removes an event type', run() {
            const events = new EventPubSub().on('topic', () => {}); events.off('topic', '*'); equal(events.list.topic, undefined);
        }},
        {name: 'off defaults the handler argument to wildcard removal', run() {
            const events = new EventPubSub().on('topic', () => {}); events.off('topic'); equal(events.list.topic, undefined);
        }},
        {name: 'off defaults the event type to wildcard subscriptions only', run() {
            const events = new EventPubSub(); events.on('*', () => {}).on('topic', () => {}).off();
            equal(events.list[wildcard], undefined); assert(Array.isArray(events.list.topic));
        }},
        {name: 'off removes one wildcard handler without touching typed handlers', run() {
            const events = new EventPubSub(); const remove = () => {}; const keep = () => {}; const typed = () => {};
            events.on('*', remove).on('*', keep).on('topic', typed).off('*', remove);
            arrayEqual(events.list[wildcard], [keep]); equal(events.list.topic[0], typed);
            events.off('*', keep); equal(events.list[wildcard], undefined);
        }},
        {name: 'reset removes typed and wildcard registrations', run() {
            const events = new EventPubSub(); events.on('*', () => {}).on('one', () => {}).on('two', () => {}).reset();
            equal(Object.keys(events.list).length, 0); equal(Object.getOwnPropertySymbols(events.list).length, 0);
        }},
        {name: 'emitting an unknown type does not run other typed handlers', run() {
            const events = new EventPubSub(); let calls = 0;
            events.on('known', () => { calls += 1; }).emit('unknown'); equal(calls, 0);
        }},
        {name: 'all public mutators support fluent chaining', run() {
            const events = new EventPubSub(); const handler = () => {};
            const result = events.on('topic', handler).once('once', handler).emit('topic').off('topic', handler).reset();
            equal(result, events);
        }},
        {name: 'the same function can be once and persistent independently', run() {
            const events = new EventPubSub(); let calls = 0; const handler = () => { calls += 1; };
            events.once('once', handler).on('always', handler);
            events.emit('once').emit('once').emit('always').emit('always'); equal(calls, 3);
        }}
    ])
});
