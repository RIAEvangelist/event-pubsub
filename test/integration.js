import EventPubSub from '../index.js';
import {arrayEqual, assert, equal, throws} from './assertions.js';

export default Object.freeze({
    name: 'Integration',
    description: 'Real composition patterns, subclassing, isolation, namespaces, and control flow.',
    tests: Object.freeze([
        {name: 'a subclass can publish state changes', run() {
            class Counter extends EventPubSub {
                value = 0;
                increment() { this.value += 1; this.emit('change', this.value); }
            }
            const counter = new Counter(); const values = [];
            counter.on('change', (value) => values.push(value)); counter.increment(); counter.increment();
            arrayEqual(values, [1, 2]);
        }},
        {name: 'multiple instances isolate same-named topics', run() {
            const first = new EventPubSub(); const second = new EventPubSub(); const values = [];
            first.on('change', () => values.push('first')); second.on('change', () => values.push('second'));
            first.emit('change'); arrayEqual(values, ['first']);
        }},
        {name: 'namespaced topic strings remain exact', run() {
            const events = new EventPubSub(); const values = [];
            events.on('user:created', () => values.push('colon')).on('user.created', () => values.push('dot'));
            events.emit('user.created'); arrayEqual(values, ['dot']);
        }},
        {name: 'a wildcard audit stream observes several domains', run() {
            const events = new EventPubSub(); const audit = [];
            events.on('*', (type, payload) => audit.push(`${type}:${payload.id}`));
            events.emit('user.created', {id: 1}).emit('invoice.paid', {id: 2});
            arrayEqual(audit, ['user.created:1', 'invoice.paid:2']);
        }},
        {name: 'a one-shot readiness gate coexists with persistent progress', run() {
            const events = new EventPubSub(); const log = [];
            events.once('ready', () => log.push('ready')).on('progress', (value) => log.push(value));
            events.emit('ready').emit('ready').emit('progress', 25).emit('progress', 100);
            arrayEqual(log, ['ready', 25, 100]);
        }},
        {name: 'a request-style payload preserves callbacks by identity', run() {
            const events = new EventPubSub(); let response;
            const reply = (value) => { response = value; };
            events.on('lookup', ({id, respond}) => respond({id, found: true}));
            events.emit('lookup', {id: 42, respond: reply}); equal(response.id, 42); equal(response.found, true);
        }},
        {name: 'a handler can publish a second event synchronously', run() {
            const events = new EventPubSub(); const order = [];
            events.on('first', () => { order.push('first'); events.emit('second'); });
            events.on('second', () => order.push('second')).emit('first');
            arrayEqual(order, ['first', 'second']);
        }},
        {name: 'a wildcard handler can route selected events', run() {
            const source = new EventPubSub(); const target = new EventPubSub(); const values = [];
            source.on('*', (type, value) => { if (type.startsWith('public.')) target.emit(type, value); });
            target.on('public.ready', (value) => values.push(value));
            source.emit('private.ready', 1).emit('public.ready', 2); arrayEqual(values, [2]);
        }},
        {name: 'reset provides a clean lifecycle boundary', run() {
            const events = new EventPubSub(); let calls = 0;
            events.on('cycle', () => { calls += 1; }).emit('cycle').reset().emit('cycle');
            events.on('cycle', () => { calls += 10; }).emit('cycle'); equal(calls, 11);
        }},
        {name: 'empty and whitespace topic names remain distinct', run() {
            const events = new EventPubSub(); const values = [];
            events.on('', () => values.push('empty')).on(' ', () => values.push('space')).emit('').emit(' ');
            arrayEqual(values, ['empty', 'space']);
        }},
        {name: 'unicode topic names and payloads pass through unchanged', run() {
            const events = new EventPubSub(); let value;
            events.on('準備完了', (payload) => { value = payload; }).emit('準備完了', '✨'); equal(value, '✨');
        }},
        {name: 'async handlers are invoked without delaying synchronous peers', async run() {
            const events = new EventPubSub(); const order = []; let release;
            const pending = new Promise((resolve) => { release = resolve; });
            events.on('topic', async () => { order.push('async-start'); await pending; order.push('async-end'); });
            events.on('topic', () => order.push('sync')).emit('topic');
            arrayEqual(order, ['async-start', 'sync']); release(); await pending; await Promise.resolve();
            arrayEqual(order, ['async-start', 'sync', 'async-end']);
        }},
        {name: 'synchronous handler exceptions propagate to the publisher', run() {
            const events = new EventPubSub(); const expected = new Error('publisher sees this');
            events.on('topic', () => { throw expected; }); equal(throws(() => events.emit('topic')), expected);
        }},
        {name: 'list supports operational introspection without exposing records', run() {
            const events = new EventPubSub(); const first = () => {}; const second = () => {};
            events.on('one', first).once('two', second); const list = events.list;
            assert(Array.isArray(list.one)); assert(Array.isArray(list.two));
            equal(list.one[0], first); equal(list.two[0], second); assert(!('once' in list.two[0]));
        }}
    ])
});
