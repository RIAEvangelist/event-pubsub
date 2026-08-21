import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {relative, resolve} from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const output = resolve(projectRoot, process.argv[2] ?? '_site');
assert.ok(
    ['_site', '.site-preview'].includes(relative(projectRoot, output)),
    'Deployment output must be an expected root child.'
);

const pages = [
    'index.html', 'guide.html', 'api.html', 'examples.html', 'playground.html',
    'testing.html', 'tests-unit.html', 'tests-functional.html', 'tests-integration.html',
    'tests-regression.html', 'live.html', 'coverage.html', 'benchmarks.html',
    'security.html', 'migration.html', 'changelog.html'
];
const required = [
    ...pages,
    '.nojekyll', 'licence', 'styles.css', 'script.js', 'playground.js', 'live.js', 'og.png',
    'module/index.js', 'module/test/CI.js', 'module/test/assertions.js',
    'module/test/unit.js', 'module/test/functional.js', 'module/test/integration.js',
    'module/test/regression.js', 'vendor/vanilla-test/index.js',
    'vendor/vanilla-test/licence', 'vendor/strong-type/index.js',
    'vendor/strong-type/licence', 'vendor/ansi-colors-es6/index.js',
    'vendor/ansi-colors-es6/LICENSE',
    'reports/node/index.html', 'reports/node/coverage-summary.json',
    'reports/node/test-results.json', 'reports/node/lcov.info',
    'reports/chrome/index.html', 'reports/chrome/coverage-summary.json',
    'reports/chrome/test-results.json', 'reports/chrome/lcov.info',
    'reports/chrome/vanilla-test-chrome.png', 'data/benchmark.json',
    'data/status.json', 'badges/statements.json', 'badges/branches.json',
    'badges/functions.json', 'badges/lines.json'
];

for (const file of required) {
    assert.ok(existsSync(resolve(output, file)), `Missing deployment file: ${file}`);
}

const status = JSON.parse(readFileSync(resolve(output, 'data/status.json'), 'utf8'));
assert.equal(status.generated, true);
assert.equal(status.tests.total, 90);
for (const runtime of ['node', 'chrome']) {
    assert.equal(status.tests[runtime].ok, true, `${runtime} tests must pass`);
    assert.equal(status.tests[runtime].total, 90, `${runtime} must run every test`);
    assert.equal(status.tests[runtime].failureCount, 0, `${runtime} must have no failures`);
    for (const metric of ['statements', 'branches', 'functions', 'lines']) {
        assert.equal(status.coverage[runtime][metric], 100, `${runtime} ${metric} coverage must be 100%`);
    }
}
for (const field of ['emitOneOps', 'emitFiveOps', 'wildcardOps', 'onceOps']) {
    assert.ok(status.benchmark[field], `Missing benchmark status: ${field}`);
}

process.stdout.write(`Validated deployment: ${pages.length} pages, two 90-test runtime reports, 100% coverage, and benchmark evidence.\n`);
