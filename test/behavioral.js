import EventPubSub from '../index.js';
import {arrayEqual, equal, throws} from './assertions.js';

function scenario({given, when, then, run}) {
    return Object.freeze({
        name: `given ${given}, when ${when}, then ${then}`,
        run
    });
}

export default Object.freeze({
    name: 'Behavioral',
    description: 'Consumer workflows expressed as observable Given/When/Then scenarios.',
    tests: Object.freeze([
        scenario({
            given: 'an audited order retry with one-time reservation and persistent projection',
            when: 'the same order is published twice',
            then: 'the audit leads both deliveries while reservation happens once',
            run() {
                const events = new EventPubSub(); const trace = [];
                events.on('*', (type, order) => trace.push(`audit:${type}:${order.id}`));
                events.once('order.created', (order) => trace.push(`reserve:${order.id}`));
                events.on('order.created', (order) => trace.push(`project:${order.id}`));
                const order = {id: 1};
                events.emit('order.created', order).emit('order.created', order);
                arrayEqual(trace, [
                    'audit:order.created:1', 'reserve:1', 'project:1',
                    'audit:order.created:1', 'project:1'
                ]);
            }
        }),
        scenario({
            given: 'an order handler that publishes the next workflow stage',
            when: 'an order is created',
            then: 'the nested fulfillment stage completes before outer delivery continues',
            run() {
                const events = new EventPubSub(); const trace = [];
                events.on('order.created', (order) => {
                    trace.push(`create:start:${order.id}`);
                    events.emit('inventory.reserved', order);
                    trace.push(`create:end:${order.id}`);
                });
                events.on('order.created', (order) => trace.push(`project:${order.id}`));
                events.on('inventory.reserved', (order) => trace.push(`fulfill:${order.id}`));
                events.emit('order.created', {id: 42});
                arrayEqual(trace, ['create:start:42', 'fulfill:42', 'create:end:42', 'project:42']);
            }
        }),
        scenario({
            given: 'a one-time readiness gate that reenters its own topic',
            when: 'the outer readiness signal arrives',
            then: 'the gate is consumed before the nested signal',
            run() {
                const events = new EventPubSub(); const trace = [];
                events.once('ready', (value) => {
                    trace.push(`gate:${value}`);
                    events.emit('ready', 'nested');
                });
                events.on('ready', (value) => trace.push(`observer:${value}`));
                events.emit('ready', 'outer');
                arrayEqual(trace, ['gate:outer', 'observer:nested', 'observer:outer']);
            }
        }),
        scenario({
            given: 'a mounted subscriber that observes application updates',
            when: 'the subscriber unmounts',
            then: 'later updates no longer reach it',
            run() {
                const events = new EventPubSub(); const updates = [];
                const render = (value) => updates.push(value);
                events.on('state.changed', render).emit('state.changed', 'mounted');
                events.off('state.changed', render).emit('state.changed', 'unmounted');
                arrayEqual(updates, ['mounted']);
            }
        }),
        scenario({
            given: 'listeners from an authenticated session',
            when: 'logout resets the event hub and a new session starts',
            then: 'only the new session observes later activity',
            run() {
                const events = new EventPubSub(); const trace = [];
                events.on('*', (type) => trace.push(`old-audit:${type}`));
                events.on('activity', () => trace.push('old-session'));
                events.emit('activity').reset();
                events.on('activity', () => trace.push('new-session')).emit('activity');
                arrayEqual(trace, ['old-audit:activity', 'old-session', 'new-session']);
            }
        }),
        scenario({
            given: 'a bridge that forwards only public topics to another hub',
            when: 'private and public messages are published',
            then: 'only public messages cross the boundary',
            run() {
                const source = new EventPubSub(); const target = new EventPubSub();
                const observed = []; const received = [];
                source.on('*', (type, payload) => {
                    observed.push(type);
                    if (type.startsWith('public.')) target.emit(type, payload);
                });
                target.on('*', (type, payload) => received.push(`${type}:${payload.id}`));
                source.emit('private.message', {id: 1}).emit('public.message', {id: 2});
                arrayEqual(observed, ['private.message', 'public.message']);
                arrayEqual(received, ['public.message:2']);
            }
        }),
        scenario({
            given: 'a request carrying a reply callback',
            when: 'a subscriber handles the request',
            then: 'the caller receives the reply before publish returns',
            run() {
                const events = new EventPubSub(); const trace = []; let response = 'pending';
                events.on('account.lookup', ({id, reply}) => reply({id, active: true}));
                events.on('account.lookup', ({id}) => trace.push(`telemetry:${id}`));
                const result = events.emit('account.lookup', {
                    id: 7,
                    reply(value) { response = value; trace.push(`reply:${value.id}`); }
                });
                equal(result, events); equal(response.id, 7); equal(response.active, true);
                arrayEqual(trace, ['reply:7', 'telemetry:7']);
            }
        }),
        scenario({
            given: 'a wildcard normalizer and a typed consumer sharing a payload',
            when: 'the payload is published',
            then: 'the consumer and caller observe the normalized object',
            run() {
                const events = new EventPubSub(); const payload = {name: '  Ada  '}; let received;
                events.on('*', (type, value) => {
                    if (type === 'profile.saved') value.name = value.name.trim();
                });
                events.on('profile.saved', (value) => { received = value; });
                events.emit('profile.saved', payload);
                equal(received, payload); equal(received.name, 'Ada'); equal(payload.name, 'Ada');
            }
        }),
        scenario({
            given: 'a one-time preflight followed by a failing persistent subscriber',
            when: 'delivery is retried after the failure',
            then: 'preflight stays consumed and the exact failure keeps reaching the publisher',
            run() {
                const events = new EventPubSub(); const expected = new Error('delivery failed');
                let preflightCalls = 0; let failureCalls = 0; let laterCalls = 0;
                events.once('deliver', () => { preflightCalls += 1; });
                events.on('deliver', () => { failureCalls += 1; throw expected; });
                events.on('deliver', () => { laterCalls += 1; });
                equal(throws(() => events.emit('deliver')), expected);
                equal(throws(() => events.emit('deliver')), expected);
                equal(preflightCalls, 1); equal(failureCalls, 2); equal(laterCalls, 0);
            }
        }),
        scenario({
            given: 'an asynchronous side effect beside a synchronous projection',
            when: 'the event is published',
            then: 'publish returns after starting both without awaiting the side effect',
            async run() {
                const events = new EventPubSub(); const trace = []; let release;
                const pending = new Promise((resolve) => { release = resolve; });
                events.on('saved', async () => {
                    trace.push('async:start'); await pending; trace.push('async:end');
                });
                events.on('saved', () => { trace.push('sync'); events.emit('projection.updated'); });
                events.on('projection.updated', () => trace.push('projection'));
                const result = events.emit('saved');
                equal(result, events); arrayEqual(trace, ['async:start', 'sync', 'projection']);
                release(); await pending; await Promise.resolve();
                arrayEqual(trace, ['async:start', 'sync', 'projection', 'async:end']);
            }
        }),
        scenario({
            given: 'subscriber membership that changes during a notification',
            when: 'the current delivery adds one subscriber and removes another',
            then: 'the added subscriber joins immediately and the removed one is skipped',
            run() {
                const events = new EventPubSub(); const trace = [];
                const added = () => trace.push('added');
                const removed = () => trace.push('removed');
                events.once('refresh', () => {
                    trace.push('coordinator'); events.on('refresh', added).off('refresh', removed);
                });
                events.on('refresh', removed).on('refresh', () => trace.push('stable')).emit('refresh');
                arrayEqual(trace, ['coordinator', 'stable', 'added']);
            }
        }),
        scenario({
            given: 'two tenant hubs with the same topic names',
            when: 'each tenant publishes an update',
            then: 'each update stays within its originating tenant',
            run() {
                const north = new EventPubSub(); const south = new EventPubSub(); const trace = [];
                north.on('account.updated', (id) => trace.push(`north:${id}`));
                south.on('account.updated', (id) => trace.push(`south:${id}`));
                north.emit('account.updated', 11); south.emit('account.updated', 22);
                arrayEqual(trace, ['north:11', 'south:22']);
            }
        })
    ])
});
