// Preserve the package manager's dependency boundary instead of reaching for a consumer-root sibling.
import Is from 'strong-type';

const is = new Is();
const ALL_EVENTS = Symbol.for('event-pubsub-all');

function dispatchTyped(registrations, args) {
    for (let index = 0; index < registrations.length;) {
        const registration = registrations[index];
        const handler = registration.handler;

        if (registration.once) registrations.splice(index, 1);
        else index += 1;

        if (args.length === 0) handler();
        else if (args.length === 1) handler(args[0]);
        else if (args.length === 2) handler(args[0], args[1]);
        else handler(...args);
    }
}

function dispatchWildcard(registrations, type, args) {
    for (let index = 0; index < registrations.length;) {
        const registration = registrations[index];
        const handler = registration.handler;

        if (registration.once) registrations.splice(index, 1);
        else index += 1;

        if (args.length === 0) handler(type);
        else if (args.length === 1) handler(type, args[0]);
        else if (args.length === 2) handler(type, args[0], args[1]);
        else handler(type, ...args);
    }
}

class EventPubSub {
    #events = Object.create(null);

    on(type, handler, once = false) {
        is.string(type);
        is.function(handler);
        is.boolean(once);

        const key = type === '*' ? ALL_EVENTS : type;
        let registrations = this.#events[key];
        if (registrations === undefined) registrations = this.#events[key] = [];
        registrations.push({handler, once});
        return this;
    }

    once(type, handler) {
        return this.on(type, handler, true);
    }

    off(type = '*', handler = '*') {
        is.string(type);

        const key = type === '*' ? ALL_EVENTS : type;
        const registrations = this.#events[key];
        if (registrations === undefined) return this;

        if (handler === '*') {
            delete this.#events[key];
            return this;
        }

        is.function(handler);

        let write = 0;
        for (let read = 0; read < registrations.length; read += 1) {
            const registration = registrations[read];
            if (registration.handler === handler) continue;
            if (write !== read) registrations[write] = registration;
            write += 1;
        }
        registrations.length = write;

        if (registrations.length === 0 && this.#events[key] === registrations) {
            delete this.#events[key];
        }
        return this;
    }

    emit(type, ...args) {
        is.string(type);

        const wildcard = this.#events[ALL_EVENTS];
        if (wildcard !== undefined) {
            const startedWithRegistrations = wildcard.length !== 0;
            try {
                dispatchWildcard(wildcard, type, args);
            } finally {
                if (
                    startedWithRegistrations &&
                    wildcard.length === 0 &&
                    this.#events[ALL_EVENTS] === wildcard
                ) {
                    delete this.#events[ALL_EVENTS];
                }
            }
        }

        const typed = this.#events[type];
        if (typed !== undefined) {
            const startedWithRegistrations = typed.length !== 0;
            try {
                dispatchTyped(typed, args);
            } finally {
                if (
                    startedWithRegistrations &&
                    typed.length === 0 &&
                    this.#events[type] === typed
                ) {
                    delete this.#events[type];
                }
            }
        }
        return this;
    }

    reset() {
        this.#events = Object.create(null);
        return this;
    }

    get list() {
        const snapshot = Object.create(null);
        for (const key of Reflect.ownKeys(this.#events)) {
            snapshot[key] = this.#events[key].map(({handler}) => handler);
        }
        return snapshot;
    }
}

Object.defineProperties(EventPubSub, {
    default: {value: EventPubSub},
    EventPubSub: {value: EventPubSub}
});

export {EventPubSub as default, EventPubSub, EventPubSub as 'module.exports'};
