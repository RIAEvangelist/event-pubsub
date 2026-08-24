import EventPubSub, {EventPubSub as NamedEventPubSub} from './package-entry.js';
import {assert, equal, throws} from './assertions.js';

const noop = () => {};

export default Object.freeze({
    name: 'Unit',
    description: 'Exports, initial state, fluent returns, validation, and list shape.',
    tests: Object.freeze([
        {name: 'default and named exports reference the same class', run() {
            equal(EventPubSub, NamedEventPubSub);
        }},
        {name: 'a fresh instance exposes an empty list snapshot', run() {
            const list = new EventPubSub().list;
            equal(Object.keys(list).length, 0);
            equal(Object.getOwnPropertySymbols(list).length, 0);
        }},
        {name: 'instances own independent event registries', run() {
            const first = new EventPubSub();
            const second = new EventPubSub();
            first.on('only-first', noop);
            assert('only-first' in first.list);
            assert(!('only-first' in second.list));
        }},
        {name: 'on returns the current instance', run() {
            const events = new EventPubSub();
            equal(events.on('topic', noop), events);
        }},
        {name: 'once returns the current instance', run() {
            const events = new EventPubSub();
            equal(events.once('topic', noop), events);
        }},
        {name: 'off returns the current instance when the type is absent', run() {
            const events = new EventPubSub();
            equal(events.off('missing', noop), events);
        }},
        {name: 'emit returns the current instance when the type is absent', run() {
            const events = new EventPubSub();
            equal(events.emit('missing'), events);
        }},
        {name: 'reset returns the current instance', run() {
            const events = new EventPubSub();
            equal(events.reset(), events);
        }},
        {name: 'on requires a string event type', run() {
            for (const value of [undefined, null, 1, {}, Symbol('topic')]) {
                throws(() => new EventPubSub().on(value, noop), TypeError);
            }
        }},
        {name: 'on requires a function handler', run() {
            for (const value of [undefined, null, 1, {}, 'handler']) {
                throws(() => new EventPubSub().on('topic', value), TypeError);
            }
        }},
        {name: 'on requires a boolean once flag', run() {
            for (const value of [null, 0, 1, 'true']) {
                throws(() => new EventPubSub().on('topic', noop, value), TypeError);
            }
        }},
        {name: 'once delegates type validation to on', run() {
            throws(() => new EventPubSub().once(1, noop), TypeError);
        }},
        {name: 'once delegates handler validation to on', run() {
            throws(() => new EventPubSub().once('topic', 1), TypeError);
        }},
        {name: 'off requires a string event type', run() {
            throws(() => new EventPubSub().off(1), TypeError);
        }},
        {name: 'off validates a handler when the event exists', run() {
            const events = new EventPubSub().on('topic', noop);
            throws(() => events.off('topic', 1), TypeError);
        }},
        {name: 'emit requires a string event type', run() {
            throws(() => new EventPubSub().emit(1), TypeError);
        }}
    ])
});
