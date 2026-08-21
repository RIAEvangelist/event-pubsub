import {arrayEqual, assert, equal, throws} from './assertions.js';
import {
    chartPercent,
    durationScale,
    formatDuration,
    formatLatency,
    formatThroughput,
    scenarioDefinitions,
    scenariosFor,
    validateBenchmark
} from '../site/benchmark-data.js';
import {
    formatValue,
    parseArguments,
    quotedType,
    resolveSubscriptionType,
    retainNewest
} from '../site/playground-core.js';

function benchmarkFixture() {
    return {
        schemaVersion: 2,
        methodology: {sampleCount: 7},
        scenarios: scenarioDefinitions.map(({id, group, unit}, index) => {
            const median = (index + 1) * 10;
            const durations = [median - 3, median - 2, median - 1, median, median + 1, median + 2, median + 3];
            const samples = durations.map((nanosecondsPerOperation, sampleIndex) => ({
                index: sampleIndex + 1,
                operations: 1_000,
                elapsedNanoseconds: nanosecondsPerOperation * 1_000,
                nanosecondsPerOperation,
                operationsPerSecond: 1_000_000_000 / nanosecondsPerOperation,
                checksum: (index + 1) * 1_000
            }));
            return {
                id,
                group,
                name: id,
                unit,
                workload: {timed: 'operation()'},
                samples,
                summary: {
                    medianNanosecondsPerOperation: median,
                    p25NanosecondsPerOperation: median - 1.5,
                    p75NanosecondsPerOperation: median + 1.5,
                    minNanosecondsPerOperation: median - 3,
                    maxNanosecondsPerOperation: median + 3,
                    medianOperationsPerSecond: 1_000_000_000 / median
                }
            };
        }),
    };
}

export default Object.freeze({
    name: 'Interface',
    description: 'Playground parsing, safe display, bounded state, and benchmark-chart evidence.',
    tests: Object.freeze([
        {name: 'the playground parses no-argument mode', run() {
            arrayEqual(parseArguments('none', 'ignored'), []);
        }},
        {name: 'the playground preserves one exact text argument', run() {
            arrayEqual(parseArguments('text', '  exact text  '), ['  exact text  ']);
        }},
        {name: 'the playground parses an empty JSON argument array', run() {
            arrayEqual(parseArguments('json-array', '[]'), []);
        }},
        {name: 'the playground spreads several JSON arguments', run() {
            const values = parseArguments('json-array', '[1,"two",null]');
            equal(values[0], 1); equal(values[1], 'two'); equal(values[2], null);
        }},
        {name: 'invalid playground JSON is an explicit syntax error', run() {
            throws(() => parseArguments('json-array', '{'), SyntaxError, 'not valid JSON');
        }},
        {name: 'a non-array JSON argument source is rejected', run() {
            throws(() => parseArguments('json-array', '{}'), TypeError, 'top-level array');
        }},
        {name: 'typed playground subscriptions preserve whitespace', run() {
            equal(resolveSubscriptionType('typed', '  '), '  ');
            equal(resolveSubscriptionType('typed', ''), '');
        }},
        {name: 'wildcard playground subscriptions resolve to star', run() {
            equal(resolveSubscriptionType('wildcard', 'ignored'), '*');
        }},
        {name: 'typed star subscriptions require wildcard mode', run() {
            throws(() => resolveSubscriptionType('typed', '*'), RangeError, 'wildcard mode');
        }},
        {name: 'event-type display quotes invisible characters', run() {
            equal(quotedType(' \n'), '" \\n"');
        }},
        {name: 'safe value formatting exposes undefined', run() {
            equal(formatValue(undefined), 'undefined');
        }},
        {name: 'safe value formatting marks circular references', run() {
            const value = {}; value.self = value;
            assert(formatValue(value).includes('[Circular]'));
        }},
        {name: 'safe value formatting bounds long output', run() {
            const formatted = formatValue('x'.repeat(100), 20);
            assert(formatted.length < 100); assert(formatted.includes('chars'));
        }},
        {name: 'bounded timeline retention keeps chronological tail entries', run() {
            const result = retainNewest([1, 2, 3, 4], 2);
            arrayEqual(result.entries, [3, 4]); equal(result.discarded, 2);
        }},
        {name: 'benchmark evidence accepts all eight unique scenarios', run() {
            const fixture = benchmarkFixture(); equal(validateBenchmark(fixture), fixture);
        }},
        {name: 'benchmark evidence rejects the wrong schema version', run() {
            const fixture = benchmarkFixture(); fixture.schemaVersion = 1;
            throws(() => validateBenchmark(fixture), TypeError, 'version 2');
        }},
        {name: 'benchmark evidence rejects duplicate or internally inconsistent scenarios', run() {
            const fixture = benchmarkFixture(); fixture.scenarios.push(fixture.scenarios[0]);
            throws(() => validateBenchmark(fixture), TypeError, 'Duplicate');
            const wrongUnit = benchmarkFixture(); wrongUnit.scenarios[0].unit = 'ns/cycle';
            throws(() => validateBenchmark(wrongUnit), TypeError, 'must use ns/emit');
            const wrongCount = benchmarkFixture(); wrongCount.methodology.sampleCount = 6;
            throws(() => validateBenchmark(wrongCount), TypeError, 'exactly seven');
            const wrongArithmetic = benchmarkFixture();
            wrongArithmetic.scenarios[0].samples[0].nanosecondsPerOperation += 1;
            throws(() => validateBenchmark(wrongArithmetic), TypeError, 'does not match elapsed time');
            const wrongSummary = benchmarkFixture();
            wrongSummary.scenarios[0].summary.p75NanosecondsPerOperation += 1;
            throws(() => validateBenchmark(wrongSummary), TypeError, 'does not match its samples');
        }},
        {name: 'benchmark dispatch selection returns four scenarios', run() {
            equal(scenariosFor(benchmarkFixture(), 'dispatch').length, 4);
        }},
        {name: 'benchmark durations choose readable nanosecond and microsecond units', run() {
            equal(formatDuration(12.345), '12.35 ns');
            const scale = durationScale(1_500); equal(scale.unit, 'µs'); equal(scale.divisor, 1_000);
        }},
        {name: 'benchmark chart values clamp and expose equivalent throughput', run() {
            equal(chartPercent(25, 100), 25); equal(chartPercent(200, 100), 100);
            equal(formatThroughput(10), '100.0M operations/s');
            equal(formatThroughput(10, 'ns/emit'), '100.0M emits/s');
            equal(formatLatency(10, 'ns/cycle'), '10 ns/cycle');
        }}
    ])
});
