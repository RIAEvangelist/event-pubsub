const argumentModes = Object.freeze(['none', 'text', 'json-array']);

export function parseArguments(mode, source = '') {
    if (!argumentModes.includes(mode)) throw new RangeError(`Unknown argument mode: ${mode}`);
    if (mode === 'none') return [];
    if (mode === 'text') return [String(source)];

    let parsed;
    try {
        parsed = JSON.parse(source);
    } catch (error) {
        throw new SyntaxError(`Arguments are not valid JSON: ${error.message}`);
    }
    if (!Array.isArray(parsed)) throw new TypeError('JSON arguments must be a top-level array.');
    return parsed;
}

export function resolveSubscriptionType(kind, exactType) {
    if (kind === 'wildcard') return '*';
    if (kind !== 'typed') throw new RangeError(`Unknown subscription kind: ${kind}`);
    if (typeof exactType !== 'string') throw new TypeError('Event type must be a string.');
    if (exactType === '*') throw new RangeError('Choose wildcard mode to subscribe to all event types.');
    return exactType;
}

export function quotedType(type) {
    if (typeof type !== 'string') throw new TypeError('Event type must be a string.');
    return JSON.stringify(type);
}

export function formatValue(value, maximumLength = 180) {
    if (!Number.isSafeInteger(maximumLength) || maximumLength < 16) {
        throw new RangeError('maximumLength must be a safe integer of at least 16.');
    }
    const seen = new WeakSet();
    let formatted;
    try {
        formatted = JSON.stringify(value, (_key, current) => {
            if (typeof current === 'bigint') return `${current}n`;
            if (typeof current === 'function') return `[Function ${current.name || 'anonymous'}]`;
            if (typeof current === 'symbol') return current.toString();
            if (current && typeof current === 'object') {
                if (seen.has(current)) return '[Circular]';
                seen.add(current);
            }
            return current;
        });
    } catch {
        formatted = String(value);
    }
    if (formatted === undefined) formatted = String(value);
    if (formatted.length <= maximumLength) return formatted;
    const omitted = formatted.length - maximumLength;
    return `${formatted.slice(0, maximumLength)}… (+${omitted} chars)`;
}

export function retainNewest(entries, limit = 200) {
    if (!Array.isArray(entries)) throw new TypeError('entries must be an array.');
    if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError('limit must be a positive safe integer.');
    const discarded = Math.max(0, entries.length - limit);
    return Object.freeze({
        entries: Object.freeze(entries.slice(-limit)),
        discarded
    });
}

export {argumentModes};
