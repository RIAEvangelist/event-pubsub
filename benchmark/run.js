import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {cpus, release as osRelease} from 'node:os';
import {dirname, resolve} from 'node:path';
import EventPubSub from '../test-runtime/event-pubsub/index.js';
import manifest from '../package.json' with {type: 'json'};

const smoke = process.argv.includes('--smoke');
const printJson = process.argv.includes('--json');
const sampleCount = smoke ? 1 : 7;
const targetSampleNanoseconds = smoke ? 25_000_000 : 250_000_000;
const warmupNanoseconds = smoke ? 10_000_000 : 75_000_000;
const projectRoot = resolve(import.meta.dirname, '..');
const noop = () => {};
const counterModulus = 1_073_741_824;
const counterMask = counterModulus - 1;

function percentile(values, fraction) {
    const sorted = [...values].sort((left, right) => left - right);
    const position = (sorted.length - 1) * fraction;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return sorted[lower];
    const weight = position - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function sourceCommit() {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try {
        const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
            cwd: projectRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
        const dirty = execFileSync(
            'git',
            ['status', '--porcelain', '--untracked-files=all', '--', 'index.js', 'benchmark/run.js', 'package.json'],
            {cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}
        ).trim();
        return dirty ? `${commit}-dirty` : commit;
    } catch {
        return 'local-source';
    }
}

function timeExecution(createRun, operations) {
    const sample = createRun();
    const start = process.hrtime.bigint();
    sample.execute(operations);
    const elapsedNanoseconds = Number(process.hrtime.bigint() - start);
    const checksum = sample.verify(operations);
    const nanosecondsPerOperation = elapsedNanoseconds / operations;
    return {
        operations,
        elapsedNanoseconds,
        nanosecondsPerOperation,
        operationsPerSecond: 1_000_000_000 / nanosecondsPerOperation,
        checksum
    };
}

function calibratedOperations(createRun) {
    let operations = 1_000;
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const sample = timeExecution(createRun, operations);
        if (sample.elapsedNanoseconds >= targetSampleNanoseconds / 8) {
            const projected = Math.ceil(
                operations * targetSampleNanoseconds / sample.elapsedNanoseconds
            );
            return Math.max(1_000, Math.min(100_000_000, projected));
        }
        operations = Math.min(100_000_000, operations * 10);
    }
    return operations;
}

function warm(createRun, calibrated) {
    const operations = Math.max(
        1_000,
        Math.round(calibrated * warmupNanoseconds / targetSampleNanoseconds)
    );
    const sample = createRun();
    sample.execute(operations);
    sample.verify(operations);
}

function typedEmit(handlerCount) {
    return {
        validate() {
            const events = new EventPubSub();
            let calls = 0;
            for (let index = 0; index < handlerCount; index += 1) {
                events.on('pulse', (value) => {
                    assert.equal(value, 42);
                    calls += 1;
                });
            }
            events.emit('pulse', 42);
            assert.equal(calls, handlerCount);
        },
        createRun() {
            const events = new EventPubSub();
            let observed = 0;
            let expectedPerOperation = 0;
            for (let index = 0; index < handlerCount; index += 1) {
                expectedPerOperation += 42 + index;
                events.on('pulse', (value) => {
                    observed = (observed + value + index) & counterMask;
                });
            }
            return {
                execute(operations) {
                    for (let index = 0; index < operations; index += 1) {
                        events.emit('pulse', 42);
                    }
                },
                verify(operations) {
                    assert.equal(events.list.pulse.length, handlerCount);
                    assert.equal(observed, operations * expectedPerOperation % counterModulus);
                    return observed;
                }
            };
        }
    };
}

const scenarios = [
    {
        id: 'typed-emit-1',
        name: 'Typed emit · 1 handler',
        group: 'dispatch',
        description: 'One stable typed subscriber with one payload value.',
        unit: 'ns/emit',
        workload: {
            setup: 'Create one emitter and register one minimal observable typed handler.',
            timed: "events.emit('pulse', 42)",
            apiCallsPerOperation: 1,
            handlerInvocationsPerOperation: 1,
            payloadValues: 1
        },
        ...typedEmit(1)
    },
    {
        id: 'typed-emit-5',
        name: 'Typed emit · 5 handlers',
        group: 'dispatch',
        description: 'Five stable typed subscribers with one payload value.',
        unit: 'ns/emit',
        workload: {
            setup: 'Create one emitter and register five distinct minimal observable typed handlers.',
            timed: "events.emit('pulse', 42)",
            apiCallsPerOperation: 1,
            handlerInvocationsPerOperation: 5,
            payloadValues: 1
        },
        ...typedEmit(5)
    },
    {
        id: 'typed-emit-20',
        name: 'Typed emit · 20 handlers',
        group: 'dispatch',
        description: 'Twenty stable typed subscribers with one payload value.',
        unit: 'ns/emit',
        workload: {
            setup: 'Create one emitter and register twenty distinct minimal observable typed handlers.',
            timed: "events.emit('pulse', 42)",
            apiCallsPerOperation: 1,
            handlerInvocationsPerOperation: 20,
            payloadValues: 1
        },
        ...typedEmit(20)
    },
    {
        id: 'wildcard-typed-emit',
        name: 'Wildcard + typed emit',
        group: 'dispatch',
        description: 'One wildcard subscriber followed by five typed subscribers.',
        unit: 'ns/emit',
        workload: {
            setup: 'Create one emitter with one wildcard and five distinct minimal observable typed handlers.',
            timed: "events.emit('pulse', 42)",
            apiCallsPerOperation: 1,
            handlerInvocationsPerOperation: 6,
            payloadValues: 1
        },
        validate() {
            const order = [];
            const events = new EventPubSub();
            events.on('*', (type, value) => order.push(`wildcard:${type}:${value}`));
            events.on('pulse', (value) => order.push(`typed:${value}`));
            events.emit('pulse', 42);
            assert.deepEqual(order, ['wildcard:pulse:42', 'typed:42']);
        },
        createRun() {
            let observed = 0;
            const events = new EventPubSub().on('*', (type, value) => {
                observed = (observed + type.length + value) & counterMask;
            });
            let expectedPerOperation = 'pulse'.length + 42;
            for (let index = 0; index < 5; index += 1) {
                expectedPerOperation += 42 + index;
                events.on('pulse', (value) => {
                    observed = (observed + value + index) & counterMask;
                });
            }
            return {
                execute(operations) {
                    for (let index = 0; index < operations; index += 1) {
                        events.emit('pulse', 42);
                    }
                },
                verify(operations) {
                    assert.equal(events.list.pulse.length, 5);
                    assert.equal(events.list[Symbol.for('event-pubsub-all')].length, 1);
                    assert.equal(observed, operations * expectedPerOperation % counterModulus);
                    return observed;
                }
            };
        }
    },
    {
        id: 'once-emit-cycle',
        name: 'Once register + emit',
        group: 'lifecycle',
        description: 'Register, invoke, and remove one one-shot subscriber.',
        unit: 'ns/cycle',
        workload: {
            setup: 'Create one empty emitter and one reusable minimal observable handler.',
            timed: "events.once('pulse', handler).emit('pulse')",
            apiCallsPerOperation: 2,
            handlerInvocationsPerOperation: 1,
            payloadValues: 0
        },
        validate() {
            const events = new EventPubSub();
            let calls = 0;
            events.once('pulse', () => { calls += 1; }).emit('pulse').emit('pulse');
            assert.equal(calls, 1);
            assert.equal(events.list.pulse, undefined);
        },
        createRun() {
            const events = new EventPubSub();
            let observed = 0;
            const handler = () => {
                observed = (observed + 1) & counterMask;
            };
            return {
                execute(operations) {
                    for (let index = 0; index < operations; index += 1) {
                        events.once('pulse', handler).emit('pulse');
                    }
                },
                verify(operations) {
                    assert.equal(events.list.pulse, undefined);
                    assert.equal(observed, operations % counterModulus);
                    return observed;
                }
            };
        }
    },
    {
        id: 'on-off-cycle',
        name: 'On + off pair',
        group: 'lifecycle',
        description: 'Append one typed subscriber and remove the matching record.',
        unit: 'ns/cycle',
        workload: {
            setup: 'Create one empty emitter and one reusable no-op handler.',
            timed: "events.on('pulse', handler).off('pulse', handler)",
            apiCallsPerOperation: 2,
            handlerInvocationsPerOperation: 0,
            payloadValues: 0
        },
        validate() {
            const events = new EventPubSub().on('pulse', noop).off('pulse', noop);
            assert.equal(events.list.pulse, undefined);
        },
        createRun() {
            const events = new EventPubSub();
            return {
                execute(operations) {
                    for (let index = 0; index < operations; index += 1) {
                        events.on('pulse', noop).off('pulse', noop);
                    }
                },
                verify(operations) {
                    assert.equal(events.list.pulse, undefined);
                    return operations;
                }
            };
        }
    },
    {
        id: 'list-snapshot-5',
        name: 'List snapshot · 5 handlers',
        group: 'state',
        description: 'Create an isolated snapshot for one five-subscriber type.',
        unit: 'ns/snapshot',
        workload: {
            setup: 'Create one emitter with five typed handlers.',
            timed: 'snapshot = events.list',
            apiCallsPerOperation: 1,
            handlerInvocationsPerOperation: 0,
            payloadValues: 0
        },
        validate() {
            const events = new EventPubSub();
            for (let index = 0; index < 5; index += 1) events.on('pulse', noop);
            const snapshot = events.list;
            snapshot.pulse.length = 0;
            assert.equal(events.list.pulse.length, 5);
        },
        createRun() {
            const events = new EventPubSub();
            for (let index = 0; index < 5; index += 1) events.on('pulse', noop);
            let snapshot;
            return {
                execute(operations) {
                    for (let index = 0; index < operations; index += 1) snapshot = events.list;
                },
                verify(operations) {
                    assert.equal(snapshot.pulse.length, 5);
                    assert.equal(events.list.pulse.length, 5);
                    return operations * snapshot.pulse.length;
                }
            };
        }
    },
    {
        id: 'register-5-reset-cycle',
        name: 'Register 5 + reset cycle',
        group: 'state',
        description: 'Register five typed subscribers and clear the complete registry.',
        unit: 'ns/cycle',
        workload: {
            setup: 'Create one empty emitter and one reusable no-op handler.',
            timed: "five events.on('pulse', handler) calls, then events.reset()",
            apiCallsPerOperation: 6,
            handlerInvocationsPerOperation: 0,
            payloadValues: 0
        },
        validate() {
            const events = new EventPubSub();
            for (let index = 0; index < 5; index += 1) events.on('pulse', noop);
            events.reset();
            assert.deepEqual(Object.keys(events.list), []);
        },
        createRun() {
            const events = new EventPubSub();
            return {
                execute(operations) {
                    for (let operation = 0; operation < operations; operation += 1) {
                        for (let index = 0; index < 5; index += 1) events.on('pulse', noop);
                        events.reset();
                    }
                },
                verify(operations) {
                    assert.deepEqual(Object.keys(events.list), []);
                    return operations;
                }
            };
        }
    }
];

const results = [];
for (const scenario of scenarios) {
    scenario.validate();
    const operations = calibratedOperations(scenario.createRun);
    warm(scenario.createRun, operations);
    const samples = [];
    for (let index = 0; index < sampleCount; index += 1) {
        samples.push({index: index + 1, ...timeExecution(scenario.createRun, operations)});
    }
    const durations = samples.map((sample) => sample.nanosecondsPerOperation);
    const medianNanosecondsPerOperation = percentile(durations, 0.5);
    results.push({
        id: scenario.id,
        name: scenario.name,
        group: scenario.group,
        description: scenario.description,
        unit: scenario.unit,
        workload: scenario.workload,
        samples,
        summary: {
            medianNanosecondsPerOperation,
            p25NanosecondsPerOperation: percentile(durations, 0.25),
            p75NanosecondsPerOperation: percentile(durations, 0.75),
            minNanosecondsPerOperation: Math.min(...durations),
            maxNanosecondsPerOperation: Math.max(...durations),
            medianOperationsPerSecond: 1_000_000_000 / medianNanosecondsPerOperation
        }
    });
}

const output = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    package: {
        name: manifest.name,
        version: manifest.version,
        commit: sourceCommit()
    },
    environment: {
        node: process.version,
        v8: process.versions.v8,
        platform: process.platform,
        osRelease: osRelease(),
        architecture: process.arch,
        cpuModel: cpus()[0]?.model ?? 'unknown',
        logicalCpus: cpus().length,
        execArgv: process.execArgv
    },
    methodology: {
        clock: 'process.hrtime.bigint',
        statistic: 'median with p25 and p75',
        sampleCount,
        targetSampleNanoseconds,
        timingBoundary: 'execute(operations) only',
        excluded: [
            'scenario setup',
            'behavior validation',
            'iteration calibration',
            'warmup',
            'post-run verification',
            'summary calculation',
            'serialization',
            'file I/O',
            'CI orchestration'
        ],
        harnessAdjustment: 'none; fixed-count loops avoid per-operation clock reads and deadline polling',
        checksum: 'observed from timed handler effects where dispatch invokes subscribers'
    },
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
        const duration = result.summary.medianNanosecondsPerOperation;
        const throughput = result.summary.medianOperationsPerSecond / 1_000_000;
        process.stdout.write(
            `${result.name.padEnd(34)} ${duration.toFixed(2).padStart(9)} ${result.unit} · ${throughput.toFixed(2)} M ops/s\n`
        );
    }
    process.stdout.write(`${smoke ? 'Benchmark smoke' : 'Benchmark'} completed with execution-only timing boundaries.\n`);
}
