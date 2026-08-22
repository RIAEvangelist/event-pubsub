import EventPubSub from './module/index.js';
import {
    formatValue,
    parseArguments,
    quotedType,
    resolveSubscriptionType
} from './playground-core.js';

const wildcard = Symbol.for('event-pubsub-all');
const timelineLimit = 200;
let events = new EventPubSub();
let subscriptions = [];
let nextSubscriptionId = 1;
let nextLogSequence = 1;
let discardedLogEntries = 0;

const elements = Object.freeze({
    status: document.querySelector('#playground-status'),
    subscriptionForm: document.querySelector('#subscription-form'),
    subscriptionKind: document.querySelector('#subscription-kind'),
    subscriptionType: document.querySelector('#subscription-type'),
    subscriptionLabel: document.querySelector('#subscription-label'),
    subscriptionLifetime: document.querySelector('#subscription-lifetime'),
    emitForm: document.querySelector('#emit-form'),
    eventType: document.querySelector('#event-type'),
    argumentMode: document.querySelector('#argument-mode'),
    eventArguments: document.querySelector('#event-arguments'),
    registry: document.querySelector('#registry-list'),
    registryHeading: document.querySelector('#registry-heading'),
    registryCount: document.querySelector('#registry-count'),
    log: document.querySelector('#event-log'),
    logRetention: document.querySelector('#log-retention')
});

function setStatus(message, state = 'ok') {
    elements.status.textContent = message;
    elements.status.dataset.state = state;
}

function createTextElement(name, text, className) {
    const node = document.createElement(name);
    node.textContent = text;
    if (className) node.className = className;
    return node;
}

function appendLog(kind, label, type, args = []) {
    elements.log.querySelector('.log-placeholder')?.remove();
    const entry = document.createElement('li');
    entry.dataset.logEntry = 'true';
    const sequence = createTextElement('span', `#${nextLogSequence}`, 'log-sequence');
    const heading = createTextElement('strong', `${kind} · ${label}`);
    const detail = document.createElement('span');
    detail.append(createTextElement('code', quotedType(type)));
    detail.append(document.createTextNode(
        args.length === 0 ? ' · no arguments' : ` · ${args.length} argument${args.length === 1 ? '' : 's'} · ${args.map((value) => formatValue(value)).join(', ')}`
    ));
    entry.append(sequence, heading, detail);
    elements.log.append(entry);
    nextLogSequence += 1;

    while (elements.log.querySelectorAll('[data-log-entry]').length > timelineLimit) {
        elements.log.querySelector('[data-log-entry]')?.remove();
        discardedLogEntries += 1;
    }
    const retained = elements.log.querySelectorAll('[data-log-entry]').length;
    elements.logRetention.textContent = `${retained} retained${discardedLogEntries ? ` · ${discardedLogEntries} discarded` : ''}`;
    elements.log.scrollTop = elements.log.scrollHeight;
}

function activeHandlers(snapshot, type) {
    return type === '*' ? snapshot[wildcard] ?? [] : snapshot[type] ?? [];
}

function reconcileSubscriptions() {
    const snapshot = events.list;
    subscriptions = subscriptions.filter((entry) => activeHandlers(snapshot, entry.type).includes(entry.handler));
}

function renderRegistry() {
    reconcileSubscriptions();
    elements.registry.replaceChildren();
    elements.registryCount.textContent = `${subscriptions.length} subscriber${subscriptions.length === 1 ? '' : 's'}`;
    if (subscriptions.length === 0) {
        elements.registry.append(createTextElement('p', 'No subscriptions. Emit remains fluent but no handlers will run.'));
        return;
    }

    const groups = new Map();
    for (const subscription of subscriptions) {
        if (!groups.has(subscription.type)) groups.set(subscription.type, []);
        groups.get(subscription.type).push(subscription);
    }

    for (const [type, entries] of groups) {
        const section = document.createElement('section');
        section.className = 'registry-group';
        const heading = document.createElement('div');
        heading.className = 'registry-heading';
        const title = createTextElement('h3', quotedType(type));
        const removeType = createTextElement('button', 'Remove type', 'button compact-button');
        removeType.type = 'button';
        removeType.setAttribute('aria-label', `Remove every subscriber for ${quotedType(type)}`);
        removeType.dataset.removeType = type;
        heading.append(title, removeType);
        const list = document.createElement('ol');
        for (const entry of entries) {
            const item = document.createElement('li');
            const copy = document.createElement('span');
            copy.append(
                createTextElement('strong', entry.label),
                document.createTextNode(` · ${entry.lifetime === 'once' ? 'once' : 'persistent'} · order ${entry.order}`)
            );
            const remove = createTextElement('button', 'Remove', 'button compact-button');
            remove.type = 'button';
            remove.setAttribute('aria-label', `Remove ${entry.label} from ${quotedType(type)}`);
            remove.dataset.removeSubscription = String(entry.id);
            item.append(copy, remove);
            list.append(item);
        }
        section.append(heading, list);
        elements.registry.append(section);
    }
}

function renderRegistryAfterRemoval(control) {
    const controls = [...elements.registry.querySelectorAll('button')];
    const position = Math.max(0, controls.indexOf(control));
    renderRegistry();
    const remaining = [...elements.registry.querySelectorAll('button')];
    const next = remaining[Math.min(position, remaining.length - 1)];
    if (next) next.focus();
    else {
        elements.registryHeading.tabIndex = -1;
        elements.registryHeading.focus();
    }
}

function addSubscription({kind, exactType, label, lifetime}, announce = true) {
    const type = resolveSubscriptionType(kind, exactType);
    const id = nextSubscriptionId;
    nextSubscriptionId += 1;
    const resolvedLabel = label.trim() || `${lifetime} ${quotedType(type)} #${id}`;
    const handler = (...received) => {
        const emittedType = type === '*' ? received[0] : type;
        const args = type === '*' ? received.slice(1) : received;
        appendLog(lifetime === 'once' ? 'once' : type === '*' ? 'wildcard' : 'typed', resolvedLabel, emittedType, args);
    };
    events[lifetime](type, handler);
    subscriptions.push({id, type, label: resolvedLabel, lifetime, handler, order: id});
    renderRegistry();
    if (announce) setStatus(`Added ${lifetime === 'once' ? 'one-shot' : 'persistent'} subscriber ${resolvedLabel} on ${quotedType(type)}.`);
}

function restoreDefaults() {
    events = new EventPubSub();
    subscriptions = [];
    nextSubscriptionId = 1;
    addSubscription({kind: 'wildcard', exactType: '', label: 'audit all events', lifetime: 'on'}, false);
    addSubscription({kind: 'typed', exactType: 'demo.message', label: 'message handler', lifetime: 'on'}, false);
    addSubscription({kind: 'typed', exactType: 'demo.message', label: 'first message only', lifetime: 'once'}, false);
    setStatus('Restored three starter subscriptions.');
}

function updateArgumentInput() {
    const disabled = elements.argumentMode.value === 'none';
    elements.eventArguments.disabled = disabled;
    elements.eventArguments.required = !disabled;
}

elements.subscriptionKind.addEventListener('change', () => {
    const wildcardMode = elements.subscriptionKind.value === 'wildcard';
    elements.subscriptionType.disabled = wildcardMode;
});

elements.subscriptionForm.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
        addSubscription({
            kind: elements.subscriptionKind.value,
            exactType: elements.subscriptionType.value,
            label: elements.subscriptionLabel.value,
            lifetime: elements.subscriptionLifetime.value
        });
    } catch (error) {
        setStatus(error.message, 'error');
    }
});

elements.argumentMode.addEventListener('change', updateArgumentInput);

for (const button of document.querySelectorAll('[data-argument-preset]')) {
    button.addEventListener('click', () => {
        const presets = {
            none: ['none', ''],
            one: ['json-array', '[{"message":"hello"}]'],
            two: ['json-array', '[{"id":42}, "ready"]'],
            many: ['json-array', '[1, "two", {"three":true}, null]']
        };
        const [mode, source] = presets[button.dataset.argumentPreset];
        elements.argumentMode.value = mode;
        elements.eventArguments.value = source;
        updateArgumentInput();
        setStatus(`Loaded the ${button.textContent.toLowerCase()}-argument preset.`);
    });
}

elements.emitForm.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
        const type = elements.eventType.value;
        const args = parseArguments(elements.argumentMode.value, elements.eventArguments.value);
        appendLog('emit', 'publisher', type, args);
        events.emit(type, ...args);
        renderRegistry();
        setStatus(`Emitted ${quotedType(type)} with ${args.length} argument${args.length === 1 ? '' : 's'}.`);
    } catch (error) {
        setStatus(error.message, 'error');
        elements.eventArguments.focus();
    }
});

elements.registry.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const removeSubscription = event.target.closest('[data-remove-subscription]');
    if (removeSubscription) {
        const id = Number(removeSubscription.dataset.removeSubscription);
        const entry = subscriptions.find((candidate) => candidate.id === id);
        if (!entry) return;
        events.off(entry.type, entry.handler);
        appendLog('off', entry.label, entry.type);
        renderRegistryAfterRemoval(removeSubscription);
        setStatus(`Removed ${entry.label}.`);
        return;
    }

    const removeType = event.target.closest('[data-remove-type]');
    if (!removeType) return;
    const type = removeType.dataset.removeType;
    events.off(type);
    appendLog('off', 'whole event type', type);
    renderRegistryAfterRemoval(removeType);
    setStatus(`Removed every subscriber on ${quotedType(type)}.`);
});

document.querySelector('#clear-log').addEventListener('click', () => {
    elements.log.replaceChildren(createTextElement('li', 'Timeline cleared.', 'log-placeholder'));
    nextLogSequence = 1;
    discardedLogEntries = 0;
    elements.logRetention.textContent = '0 entries';
    setStatus('Cleared the dispatch timeline without changing subscriptions.');
});

document.querySelector('#reset-events').addEventListener('click', () => {
    events.reset();
    subscriptions = [];
    appendLog('reset', 'complete registry', '*');
    renderRegistry();
    setStatus('Reset the registry. The timeline remains available.');
});

document.querySelector('#restore-defaults').addEventListener('click', restoreDefaults);

updateArgumentInput();
restoreDefaults();
