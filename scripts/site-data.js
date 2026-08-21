import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

function compact(value) {
    if (!Number.isFinite(value)) return undefined;
    return new Intl.NumberFormat('en', {notation: 'compact', maximumFractionDigits: 2}).format(value);
}

function benchmarkData() {
    const benchmark = readJson(resolve(projectRoot, 'benchmark', 'results.json'));
    if (!benchmark?.scenarios) return {};
    const byName = new Map(benchmark.scenarios.map((scenario) => [scenario.name, scenario]));
    return {
        emitOneOps: compact(byName.get('typed emit · 1 handler')?.medianOpsPerSecond),
        emitFiveOps: compact(byName.get('typed emit · 5 handlers')?.medianOpsPerSecond),
        wildcardOps: compact(byName.get('wildcard + typed emit')?.medianOpsPerSecond),
        onceOps: compact(byName.get('once register + emit')?.medianOpsPerSecond)
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
        generated: Boolean(nodeTests.total && chromeTests.total),
        version: manifest.version,
        commit: commit(),
        tests: {
            total: nodeTests.total ?? chromeTests.total ?? 90,
            node: nodeTests,
            chrome: chromeTests
        },
        coverage: {
            node: coverageFor('node'),
            chrome: coverageFor('chrome')
        },
        benchmark: benchmarkData()
    };
}

export function writeStatus(outputPath) {
    const status = createStatus();
    writeFileSync(outputPath, `${JSON.stringify(status, null, 2)}\n`);
    return status;
}
