import EventPubSub from './module/index.js';

const events = new EventPubSub();
const log = document.querySelector('#event-log');
const typeInput = document.querySelector('#event-type');
const payloadInput = document.querySelector('#event-payload');

function append(label, detail) {
    const item = document.createElement('li');
    const heading = document.createElement('strong');
    heading.textContent = label;
    item.append(heading, document.createTextNode(` ${detail}`));
    log.prepend(item);
}

events.on('*', (type, payload) => append('wildcard', `${type} → ${JSON.stringify(payload)}`));
events.on('demo.message', (payload) => append('typed', JSON.stringify(payload)));
events.once('demo.message', () => append('once', 'This subscriber removes itself before the next emit.'));

document.querySelector('#emit-event').addEventListener('click', () => {
    const type = typeInput.value;
    let payload = payloadInput.value;
    try { payload = JSON.parse(payload); } catch { /* Keep plain text. */ }
    events.emit(type, payload);
});

document.querySelector('#reset-events').addEventListener('click', () => {
    events.reset();
    append('reset', 'All subscriptions removed. Reload to restore the demo subscribers.');
});
