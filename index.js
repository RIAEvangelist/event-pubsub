const ALL_EVENTS = Symbol.for('event-pubsub-all');
const LEGACY_ALL_EVENTS_NAME = ALL_EVENTS.toString();

class EventPubSub {
    #events = Object.create(null);
    #wildcard;

    on(type, handler, once = false) {
        if (typeof type !== 'string') throw new TypeError('type must be a string');
        if (typeof handler !== 'function') throw new TypeError('handler must be a function');
        if (typeof once !== 'boolean') throw new TypeError('once must be a boolean');

        const entry = {handler, once};
        if (type === '*') {
            let entries = this.#wildcard;
            if (entries === undefined) entries = this.#wildcard = [];
            entries.push(entry);
        } else {
            let entries = this.#events[type];
            if (entries === undefined) entries = this.#events[type] = [];
            entries.push(entry);
        }
        return this;
    }

    once(type, handler) {
        return this.on(type, handler, true);
    }

    off(type = '*', handler = '*') {
        if (typeof type !== 'string') throw new TypeError('type must be a string');

        const isWildcard = type === '*' || type === LEGACY_ALL_EVENTS_NAME;
        const entries = isWildcard ? this.#wildcard : this.#events[type];
        if (entries === undefined) return this;

        if (handler === '*') {
            for (let index = 0; index < entries.length; index += 1) {
                entries[index].handler = undefined;
            }
            if (isWildcard) this.#wildcard = undefined;
            else delete this.#events[type];
            return this;
        }

        if (typeof handler !== 'function') throw new TypeError('handler must be a function');

        const kept = entries.filter((entry) => {
            if (entry.handler !== handler) return entry.handler !== undefined;
            entry.handler = undefined;
            return false;
        });

        if (isWildcard) {
            this.#wildcard = kept.length === 0 ? undefined : kept;
        } else if (kept.length === 0) {
            delete this.#events[type];
        } else {
            this.#events[type] = kept;
        }
        return this;
    }

    emit(type, ...args) {
        if (typeof type !== 'string') throw new TypeError('type must be a string');

        const wildcard = this.#wildcard;
        const typed = type === '*' ? undefined : this.#events[type];
        const wildcardLimit = wildcard === undefined ? 0 : wildcard.length;
        const typedLimit = typed === undefined ? 0 : typed.length;

        if (wildcard !== undefined) {
            for (let index = 0; index < wildcardLimit; index += 1) {
                const entry = wildcard[index];
                const handler = entry.handler;
                if (handler === undefined) continue;
                if (entry.once) this.#removeOnce(true, type, entry);
                if (args.length === 0) handler(type);
                else if (args.length === 1) handler(type, args[0]);
                else if (args.length === 2) handler(type, args[0], args[1]);
                else handler(type, ...args);
            }
        }

        if (typed !== undefined) {
            for (let index = 0; index < typedLimit; index += 1) {
                const entry = typed[index];
                const handler = entry.handler;
                if (handler === undefined) continue;
                if (entry.once) this.#removeOnce(false, type, entry);
                if (args.length === 0) handler();
                else if (args.length === 1) handler(args[0]);
                else if (args.length === 2) handler(args[0], args[1]);
                else handler(...args);
            }
        }
        return this;
    }

    reset() {
        const wildcard = this.#wildcard;
        if (wildcard !== undefined) {
            for (let index = 0; index < wildcard.length; index += 1) {
                wildcard[index].handler = undefined;
            }
        }

        const events = this.#events;
        const types = Object.keys(events);
        for (let typeIndex = 0; typeIndex < types.length; typeIndex += 1) {
            const entries = events[types[typeIndex]];
            for (let index = 0; index < entries.length; index += 1) {
                entries[index].handler = undefined;
            }
        }

        this.#wildcard = undefined;
        this.#events = Object.create(null);
        return this;
    }

    get list() {
        const snapshot = Object.create(null);
        if (this.#wildcard !== undefined) {
            snapshot[ALL_EVENTS] = this.#wildcard.map((entry) => entry.handler);
        }

        const types = Object.keys(this.#events);
        for (let index = 0; index < types.length; index += 1) {
            const type = types[index];
            snapshot[type] = this.#events[type].map((entry) => entry.handler);
        }
        return snapshot;
    }

    #removeOnce(isWildcard, type, removed) {
        removed.handler = undefined;
        const current = isWildcard ? this.#wildcard : this.#events[type];

        const kept = [];
        for (let index = 0; index < current.length; index += 1) {
            const entry = current[index];
            if (entry.handler !== undefined) kept.push(entry);
        }

        if (isWildcard) {
            this.#wildcard = kept.length === 0 ? undefined : kept;
        } else if (kept.length === 0) {
            delete this.#events[type];
        } else {
            this.#events[type] = kept;
        }
    }
}

export {EventPubSub as default, EventPubSub};
