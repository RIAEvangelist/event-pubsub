const scenarioDefinitions = Object.freeze([
    Object.freeze({id: 'typed-emit-1', group: 'dispatch', unit: 'ns/emit'}),
    Object.freeze({id: 'typed-emit-5', group: 'dispatch', unit: 'ns/emit'}),
    Object.freeze({id: 'typed-emit-20', group: 'dispatch', unit: 'ns/emit'}),
    Object.freeze({id: 'wildcard-typed-emit', group: 'dispatch', unit: 'ns/emit'}),
    Object.freeze({id: 'once-emit-cycle', group: 'lifecycle', unit: 'ns/cycle'}),
    Object.freeze({id: 'on-off-cycle', group: 'lifecycle', unit: 'ns/cycle'}),
    Object.freeze({id: 'list-snapshot-5', group: 'state', unit: 'ns/snapshot'}),
    Object.freeze({id: 'register-5-reset-cycle', group: 'state', unit: 'ns/cycle'})
]);

function requireFinitePositive(value, label) {
    if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${label} must be positive.`);
}

function requireSafePositiveInteger(value, label) {
    if (!Number.isSafeInteger(value) || value < 1) {
        throw new TypeError(`${label} must be a positive safe integer.`);
    }
}

function nearlyEqual(actual, expected) {
    return Math.abs(actual - expected) <= Math.max(1e-9, Math.abs(expected) * 1e-12);
}

function percentile(values, fraction) {
    const sorted = [...values].sort((left, right) => left - right);
    const position = (sorted.length - 1) * fraction;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return sorted[lower];
    const weight = position - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function unitDenominator(unit) {
    const match = /^(?:ns|µs|ms)\/(emit|cycle|snapshot|operation)$/.exec(unit);
    if (!match) throw new TypeError(`Unsupported latency unit: ${unit}`);
    return match[1];
}

export function validateBenchmark(data) {
    if (!data || data.schemaVersion !== 2) throw new TypeError('Benchmark schema version 2 is required.');
    if (!Array.isArray(data.scenarios)) throw new TypeError('Benchmark scenarios must be an array.');
    requireSafePositiveInteger(data.methodology?.sampleCount, 'Benchmark sample count');
    if (data.methodology.sampleCount !== 7) throw new TypeError('Published benchmarks require exactly seven samples.');
    const byId = new Map();

    for (const scenario of data.scenarios) {
        if (!scenario || typeof scenario.id !== 'string') throw new TypeError('Every scenario needs an id.');
        if (byId.has(scenario.id)) throw new TypeError(`Duplicate benchmark scenario: ${scenario.id}`);
        if (typeof scenario.name !== 'string' || !scenario.name) {
            throw new TypeError(`${scenario.id} needs a name.`);
        }
        if (typeof scenario.workload?.timed !== 'string' || !scenario.workload.timed) {
            throw new TypeError(`${scenario.id} needs an exact timed workload.`);
        }
        unitDenominator(scenario.unit);
        if (!Array.isArray(scenario.samples) || scenario.samples.length !== data.methodology.sampleCount) {
            throw new TypeError(`${scenario.id} needs exactly ${data.methodology.sampleCount} timed samples.`);
        }
        for (const [sampleIndex, sample] of scenario.samples.entries()) {
            requireSafePositiveInteger(sample.index, `${scenario.id} sample index`);
            if (sample.index !== sampleIndex + 1) throw new TypeError(`${scenario.id} sample indexes must be sequential.`);
            requireSafePositiveInteger(sample.operations, `${scenario.id} sample operations`);
            requireSafePositiveInteger(sample.elapsedNanoseconds, `${scenario.id} elapsed nanoseconds`);
            requireFinitePositive(sample.nanosecondsPerOperation, `${scenario.id} sample latency`);
            requireFinitePositive(sample.operationsPerSecond, `${scenario.id} sample throughput`);
            if (!Number.isSafeInteger(sample.checksum) || sample.checksum < 0) {
                throw new TypeError(`${scenario.id} sample checksum must be an observed safe integer.`);
            }
            if (!nearlyEqual(sample.nanosecondsPerOperation, sample.elapsedNanoseconds / sample.operations)) {
                throw new TypeError(`${scenario.id} sample latency does not match elapsed time and operations.`);
            }
            if (!nearlyEqual(sample.operationsPerSecond, 1_000_000_000 / sample.nanosecondsPerOperation)) {
                throw new TypeError(`${scenario.id} sample throughput does not match latency.`);
            }
        }

        const durations = scenario.samples.map((sample) => sample.nanosecondsPerOperation);
        const summary = scenario.summary;
        const expected = {
            medianNanosecondsPerOperation: percentile(durations, 0.5),
            p25NanosecondsPerOperation: percentile(durations, 0.25),
            p75NanosecondsPerOperation: percentile(durations, 0.75),
            minNanosecondsPerOperation: Math.min(...durations),
            maxNanosecondsPerOperation: Math.max(...durations)
        };
        for (const [field, expectedValue] of Object.entries(expected)) {
            requireFinitePositive(summary?.[field], `${scenario.id} ${field}`);
            if (!nearlyEqual(summary[field], expectedValue)) {
                throw new TypeError(`${scenario.id} ${field} does not match its samples.`);
            }
        }
        if (!(
            summary.minNanosecondsPerOperation <= summary.p25NanosecondsPerOperation &&
            summary.p25NanosecondsPerOperation <= summary.medianNanosecondsPerOperation &&
            summary.medianNanosecondsPerOperation <= summary.p75NanosecondsPerOperation &&
            summary.p75NanosecondsPerOperation <= summary.maxNanosecondsPerOperation
        )) {
            throw new TypeError(`${scenario.id} summary percentiles are out of order.`);
        }
        requireFinitePositive(summary.medianOperationsPerSecond, `${scenario.id} median throughput`);
        if (!nearlyEqual(
            summary.medianOperationsPerSecond,
            1_000_000_000 / summary.medianNanosecondsPerOperation
        )) {
            throw new TypeError(`${scenario.id} median throughput does not match median latency.`);
        }
        byId.set(scenario.id, scenario);
    }

    for (const definition of scenarioDefinitions) {
        const scenario = byId.get(definition.id);
        if (!scenario) throw new TypeError(`Missing benchmark scenario: ${definition.id}`);
        if (scenario.group !== definition.group) {
            throw new TypeError(`${definition.id} must belong to ${definition.group}.`);
        }
        if (scenario.unit !== definition.unit) {
            throw new TypeError(`${definition.id} must use ${definition.unit}.`);
        }
    }
    if (byId.size !== scenarioDefinitions.length) {
        throw new TypeError(`Expected exactly ${scenarioDefinitions.length} benchmark scenarios.`);
    }
    return data;
}

export function scenariosFor(data, group) {
    return validateBenchmark(data).scenarios.filter((scenario) => scenario.group === group);
}

export function durationScale(maxNanoseconds) {
    requireFinitePositive(maxNanoseconds, 'Maximum latency');
    if (maxNanoseconds >= 1_000_000) return Object.freeze({divisor: 1_000_000, unit: 'ms'});
    if (maxNanoseconds >= 1_000) return Object.freeze({divisor: 1_000, unit: 'µs'});
    return Object.freeze({divisor: 1, unit: 'ns'});
}

export function formatDuration(nanoseconds, scale = durationScale(nanoseconds)) {
    requireFinitePositive(nanoseconds, 'Latency');
    const value = nanoseconds / scale.divisor;
    const digits = value >= 100 ? 1 : value >= 10 ? 2 : 3;
    return `${Number(value.toFixed(digits))} ${scale.unit}`;
}

export function formatLatency(nanoseconds, unit, scale = durationScale(nanoseconds)) {
    return `${formatDuration(nanoseconds, scale)}/${unitDenominator(unit)}`;
}

export function formatThroughput(nanoseconds, unit = 'ns/operation') {
    requireFinitePositive(nanoseconds, 'Latency');
    const millions = 1_000 / nanoseconds;
    return `${millions.toFixed(millions >= 100 ? 1 : 2)}M ${unitDenominator(unit)}s/s`;
}

export function chartPercent(nanoseconds, maximum) {
    if (!Number.isFinite(nanoseconds) || nanoseconds < 0) {
        throw new TypeError('Latency must be nonnegative.');
    }
    requireFinitePositive(maximum, 'Chart maximum');
    return Math.max(0, Math.min(100, nanoseconds / maximum * 100));
}

export {scenarioDefinitions};
