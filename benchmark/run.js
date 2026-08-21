import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import {cpus} from 'node:os';
import {dirname, resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import EventPubSub from '../index.js';
import manifest from '../package.json' with {type: 'json'};

const smoke = process.argv.includes('--smoke');
const printJson = process.argv.includes('--json');
const sampleCount = smoke ? 1 : 7;
const sampleDurationMs = smoke ? 25 : 250;
const warmupDurationMs = smoke ? 10 : 75;
const projectRoot = resolve(import.meta.dirname, '..');

function median(values) {
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
}

function measure(createRun, durationMs, batchSize) {
    const {run, verify} = createRun();
    const start = performance.now();
    const deadline = start + durationMs;
    let operations = 0;

    do {
        for (let index = 0; index < batchSize; index += 1) run();
        operations += batchSize;
    } while (performance.now() < deadline);

    const elapsedMs = performance.now() - start;
    const checksum = verify(operations);
    return {
        checksum,
        operationsPerSecond: operations / (elapsedMs / 1000)
    };
}

function typedEmit(handlerCount) {
    return () => {
        const events = new EventPubSub();
        let calls = 0;
        for (let index = 0; index < handlerCount; index += 1) {
            events.on('pulse', () => { calls += 1; });
        }
        return {
            run() {
                events.emit('pulse', 42);
            },
            verify(operations) {
                assert.equal(calls, operations * handlerCount);
                return calls;
            }
        };
    };
}

const scenarios = [
    {
        name: 'typed emit · 1 handler',
        description: 'One stable typed subscriber with one payload value.',
        batchSize: 10_000,
        createRun: typedEmit(1)
    },
    {
        name: 'typed emit · 5 handlers',
        description: 'Five stable typed subscribers with one payload value.',
        batchSize: 5_000,
        createRun: typedEmit(5)
    },
    {
        name: 'typed emit · 20 handlers',
        description: 'Twenty stable typed subscribers with one payload value.',
        batchSize: 2_000,
        createRun: typedEmit(20)
    },
    {
        name: 'wildcard + typed emit',
        description: 'One wildcard subscriber followed by five typed subscribers.',
        batchSize: 5_000,
        createRun() {
            const order = [];
            const validation = new EventPubSub();
            validation.on('*', (type, value) => order.push(`wildcard:${type}:${value}`));
            validation.on('pulse', (value) => order.push(`typed:${value}`));
            validation.emit('pulse', 42);
            assert.deepEqual(order, ['wildcard:pulse:42', 'typed:42']);

            const events = new EventPubSub();
            let wildcardCalls = 0;
            let typedCalls = 0;
            events.on('*', () => { wildcardCalls += 1; });
            for (let index = 0; index < 5; index += 1) {
                events.on('pulse', () => { typedCalls += 1; });
            }
            return {
                run() {
                    events.emit('pulse', 42);
                },
                verify(operations) {
                    assert.equal(wildcardCalls, operations);
                    assert.equal(typedCalls, operations * 5);
                    return wildcardCalls + typedCalls;
                }
            };
        }
    },
    {
        name: 'once register + emit',
        description: 'Register, invoke, and remove one one-shot subscriber.',
        batchSize: 1_000,
        createRun() {
            const events = new EventPubSub();
            let calls = 0;
            const handler = () => { calls += 1; };
            return {
                run() {
                    events.once('pulse', handler).emit('pulse');
                },
                verify(operations) {
                    assert.equal(calls, operations);
                    assert.equal(events.list.pulse, undefined);
                    return calls;
                }
            };
        }
    },
    {
        name: 'on + off pair',
        description: 'Append one typed subscriber and remove the matching record.',
        batchSize: 1_000,
        createRun() {
            const events = new EventPubSub();
            const handler = () => assert.fail('A removed handler must not run.');
            let pairs = 0;
            return {
                run() {
                    events.on('pulse', handler).off('pulse', handler);
                    pairs += 1;
                },
                verify(operations) {
                    assert.equal(pairs, operations);
                    assert.equal(events.list.pulse, undefined);
                    events.emit('pulse');
                    return pairs;
                }
            };
        }
    },
    {
        name: 'list snapshot · 5 handlers',
        description: 'Create an isolated snapshot for one five-subscriber type.',
        batchSize: 2_000,
        createRun() {
            const events = new EventPubSub();
            const handler = () => {};
            for (let index = 0; index < 5; index += 1) events.on('pulse', handler);
            let observed = 0;
            let lastSnapshot;
            return {
                run() {
                    lastSnapshot = events.list;
                    observed += lastSnapshot.pulse.length;
                },
                verify(operations) {
                    assert.equal(observed, operations * 5);
                    lastSnapshot.pulse.length = 0;
                    assert.equal(events.list.pulse.length, 5);
                    return observed;
                }
            };
        }
    },
    {
        name: 'reset · 5 handlers',
        description: 'Clear a registry containing five typed subscribers.',
        batchSize: 500,
        createRun() {
            const events = new EventPubSub();
            const handler = () => {};
            let resets = 0;
            return {
                run() {
                    for (let index = 0; index < 5; index += 1) events.on('pulse', handler);
                    events.reset();
                    resets += 1;
                },
                verify(operations) {
                    assert.equal(resets, operations);
                    assert.deepEqual(Object.keys(events.list), []);
                    return resets;
                }
            };
        }
    }
];

const results = [];
for (const scenario of scenarios) {
    measure(scenario.createRun, warmupDurationMs, scenario.batchSize);
    const samples = [];
    let checksum = 0;
    for (let index = 0; index < sampleCount; index += 1) {
        const result = measure(scenario.createRun, sampleDurationMs, scenario.batchSize);
        checksum += result.checksum;
        samples.push(Math.round(result.operationsPerSecond));
    }
    results.push({
        name: scenario.name,
        description: scenario.description,
        medianOpsPerSecond: Math.round(median(samples)),
        samplesOpsPerSecond: samples,
        checksum
    });
}

const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    package: `event-pubsub@${manifest.version}`,
    runtime: process.version,
    platform: process.platform,
    architecture: process.arch,
    cpu: cpus()[0]?.model ?? 'unknown',
    sampleCount,
    sampleDurationMs,
    warmupDurationMs,
    scenarios: results
};

if (!smoke) {
    const outputPath = resolve(projectRoot, 'benchmark', 'results.json');
    mkdirSync(dirname(outputPath), {recursive: true});
    writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
}

if (printJson) {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} else {
    for (const result of results) {
        process.stdout.write(`${result.name.padEnd(34)} ${result.medianOpsPerSecond.toLocaleString('en-US')} ops/s\n`);
    }
    process.stdout.write(`${smoke ? 'Benchmark smoke' : 'Benchmark'} completed with validated checksums.\n`);
}
