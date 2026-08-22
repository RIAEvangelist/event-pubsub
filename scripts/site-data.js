import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expectedTestTotal = 119;

function readJson(path) {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8'));
}

function coverageFor(runtime) {
    const summary = readJson(resolve(projectRoot, 'coverage', runtime, 'coverage-summary.json'));
    if (!summary?.total) return {};
    return Object.fromEntries(
        ['statements', 'branches', 'functions', 'lines'].map((name) => [name, summary.total[name].pct])
    );
}

function testsFor(runtime) {
    const result = readJson(resolve(projectRoot, 'coverage', runtime, 'test-results.json'));
    if (!result) return {};
    return {
        ok: result.ok,
        total: result.total,
        passedCount: result.passedCount ?? result.passed?.length ?? result.total - result.failureCount,
        failureCount: result.failureCount
    };
}

function latency(value, denominator) {
    if (!Number.isFinite(value) || value <= 0) return undefined;
    if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(3))} ms/${denominator}`;
    if (value >= 1_000) return `${Number((value / 1_000).toFixed(3))} µs/${denominator}`;
    return `${Number(value.toFixed(value >= 10 ? 2 : 3))} ns/${denominator}`;
}

function benchmarkData() {
    const benchmark = readJson(resolve(projectRoot, 'benchmark', 'results.json'));
    if (!benchmark?.scenarios) return {};
    const byId = new Map(benchmark.scenarios.map((scenario) => [scenario.id, scenario]));
    return {
        emitOneTime: latency(byId.get('typed-emit-1')?.summary?.medianNanosecondsPerOperation, 'emit'),
        emitFiveTime: latency(byId.get('typed-emit-5')?.summary?.medianNanosecondsPerOperation, 'emit'),
        wildcardTime: latency(byId.get('wildcard-typed-emit')?.summary?.medianNanosecondsPerOperation, 'emit'),
        onceTime: latency(byId.get('once-emit-cycle')?.summary?.medianNanosecondsPerOperation, 'cycle')
    };
}

function commit() {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 12);
    try {
        return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {cwd: projectRoot, encoding: 'utf8'}).trim();
    } catch {
        return 'local source';
    }
}

export function createStatus() {
    const manifest = readJson(resolve(projectRoot, 'package.json'));
    const nodeTests = testsFor('node');
    const chromeTests = testsFor('chrome');
    return {
        generated: nodeTests.total === expectedTestTotal && chromeTests.total === expectedTestTotal,
        version: manifest.version,
        commit: commit(),
        tests: {
            total: expectedTestTotal,
            node: nodeTests,
            chrome: chromeTests
        },
        coverage: {
            node: coverageFor('node'),
            chrome: coverageFor('chrome')
        },
        benchmark: benchmarkData(),
        dependencies: {
            runtime: Object.keys(manifest.dependencies ?? {}).length,
            strongType: manifest.dependencies?.['strong-type'],
            vanillaTest: manifest.devDependencies?.['vanilla-test']
        }
    };
}

export function writeStatus(outputPath) {
    const status = createStatus();
    writeFileSync(outputPath, `${JSON.stringify(status, null, 2)}\n`);
    return status;
}
