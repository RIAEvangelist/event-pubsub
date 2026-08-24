import EventPubSub from 'event-pubsub';

const scenarios = Object.freeze({
    'wildcard-first'() {
        const order = [];
        new EventPubSub()
            .on('topic', () => order.push('typed'))
            .on('*', () => order.push('wildcard'))
            .emit('topic');
        return {expected: ['wildcard', 'typed'], actual: order};
    },
    'once-reentrant'() {
        const order = [];
        const events = new EventPubSub();
        events.once('topic', () => {
            order.push('once');
            events.emit('topic', 'nested');
        });
        events.on('topic', (value) => order.push(`persistent:${value}`));
        events.emit('topic', 'outer');
        return {expected: ['once', 'persistent:nested', 'persistent:outer'], actual: order};
    },
    'add-during'() {
        const order = [];
        const events = new EventPubSub();
        const late = () => order.push('late');
        events.on('topic', () => {
            order.push('first');
            events.on('topic', late);
        });
        events.on('topic', () => order.push('second'));
        events.emit('topic').emit('topic');
        return {expected: ['first', 'second', 'late', 'first', 'second', 'late', 'late'], actual: order};
    },
    'off-during'() {
        const order = [];
        const events = new EventPubSub();
        const removed = () => order.push('removed');
        events.on('topic', () => {
            order.push('first');
            events.off('topic', removed);
        });
        events.on('topic', removed).emit('topic');
        return {expected: ['first'], actual: order};
    },
    'reset-during'() {
        const order = [];
        const events = new EventPubSub();
        events.on('*', () => {
            order.push('wildcard-reset');
            events.reset();
        });
        events.on('*', () => order.push('late-wildcard'));
        events.on('topic', () => order.push('typed'));
        events.emit('topic');
        return {expected: ['wildcard-reset', 'late-wildcard'], actual: order};
    },
    'sync-throw'() {
        const order = [];
        const events = new EventPubSub();
        events.on('topic', () => {
            order.push('first');
            throw new Error('expected');
        });
        events.on('topic', () => order.push('late'));
        try {
            events.emit('topic');
        } catch (error) {
            order.push(`caught:${error.message}`);
        }
        return {expected: ['first', 'caught:expected'], actual: order};
    }
});

for (const card of document.querySelectorAll('[data-scenario]')) {
    const title = card.querySelector('h2')?.textContent ?? card.dataset.scenario;
    card.querySelector('[data-run-scenario]')?.setAttribute('aria-label', `Run ${title} scenario`);
}

function run(card) {
    const output = card.querySelector('output');
    try {
        const {expected, actual} = scenarios[card.dataset.scenario]();
        const passed = JSON.stringify(expected) === JSON.stringify(actual);
        output.textContent = `${passed ? 'Passed' : 'Failed'} · actual: ${actual.join(' → ') || '(empty)'}`;
        output.dataset.state = passed ? 'pass' : 'fail';
    } catch (error) {
        output.textContent = `Harness error · ${error.message}`;
        output.dataset.state = 'fail';
    }
}

document.querySelector('#scenario-grid').addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-run-scenario]')) return;
    run(event.target.closest('[data-scenario]'));
});

document.querySelector('#run-all-scenarios').addEventListener('click', () => {
    for (const card of document.querySelectorAll('[data-scenario]')) run(card);
});
