import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {extname, resolve} from 'node:path';
import {categories} from '../test-runtime/event-pubsub/test/CI.js';
import {validateBenchmark} from '../site/benchmark-data.js';
import {conflictConsumerImportMap, normalConsumerImportMap} from './browser-contract.js';
import {createStatus} from './site-data.js';

const siteRoot = resolve(import.meta.dirname, '../site');
const projectRoot = resolve(siteRoot, '..');
const pages = [
    'index.html', 'guide.html', 'api.html', 'examples.html', 'playground.html', 'playground-scenarios.html',
    'testing.html', 'tests-unit.html', 'tests-functional.html', 'tests-integration.html',
    'tests-behavioral.html', 'tests-regression.html', 'tests-interface.html', 'live.html',
    'coverage.html', 'benchmarks.html',
    'benchmarks-dispatch.html', 'benchmarks-lifecycle.html', 'benchmarks-methodology.html',
    'security.html', 'migration.html', 'changelog.html'
];
const htmlByPage = new Map(pages.map((name) => [name, readFileSync(resolve(siteRoot, name), 'utf8')]));
const generatedPrefixes = ['reports/', 'module/', 'vendor/', 'badges/'];
const generatedFiles = new Set(['licence']);
const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function assertBalanced(html, name) {
    const stack = [];
    for (const match of html.matchAll(/<(\/)?([a-z][a-z\d-]*)\b[^>]*>/gi)) {
        const tag = match[2].toLowerCase();
        if (voidElements.has(tag)) continue;
        if (!match[1]) stack.push(tag);
        else assert.equal(stack.pop(), tag, `${name} closes <${tag}> out of order`);
    }
    assert.deepEqual(stack, [], `${name} has unclosed elements`);
}

for (const [name, html] of htmlByPage) {
    assertBalanced(html, name);
    assert.match(html, /<!doctype html>/i, `${name} needs a doctype`);
    assert.match(html, /<html\s+lang="en">/i, `${name} needs a language`);
    assert.match(html, /<meta\s+name="description"/i, `${name} needs a description`);
    assert.match(html, /<link\s+rel="canonical"\s+href="https:\/\/riaevangelist\.github\.io\/event-pubsub\//i, `${name} needs a canonical URL`);
    assert.match(html, /https:\/\/riaevangelist\.github\.io\/event-pubsub\/og\.png/, `${name} needs the social image`);
    assert.match(html, /class="skip-link"\s+href="#main"/, `${name} needs a skip link`);
    assert.match(html, /<main\s+id="main"/, `${name} needs the main target`);
    assert.match(html, /href="\.\/styles\.css"/, `${name} needs shared styles`);
    assert.match(html, /src="\.\/script\.js"/, `${name} needs shared behavior`);
    assert.doesNotMatch(html, /(?:href|src)="http:\/\//i, `${name} contains an insecure link`);
    assert.equal((html.match(/<h1\b/gi) ?? []).length, 1, `${name} needs exactly one h1`);
    assert.ok((html.match(/aria-current="page"/g) ?? []).length <= 1, `${name} has multiple current-page links`);
    for (const current of html.matchAll(/<a\s+href="\.\/([^"]+)"[^>]*aria-current="page"/g)) {
        assert.equal(current[1], name, `${name} marks ${current[1]} as the current page`);
    }

    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${name} has duplicate IDs`);
    const localAnchors = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(localAnchors, ['main'], `${name} should use focused pages instead of in-page navigation`);

    for (const match of html.matchAll(/(?:href|src)="\.\/([^"]+)"/g)) {
        const target = match[1].split(/[?#]/, 1)[0];
        if (!target || generatedFiles.has(target) || generatedPrefixes.some((prefix) => target.startsWith(prefix))) continue;
        if (target === 'data/benchmark.json') continue;
        assert.ok(existsSync(resolve(siteRoot, target)), `${name} links missing local file ${target}`);
    }
    assert.match(html, /href="\.\/licence"/, `${name} needs the distributed license link`);

    for (const field of html.matchAll(/<(?:input|select|textarea)\b[^>]*\sid="([^"]+)"[^>]*>/g)) {
        assert.match(html, new RegExp(`<label\\s+for="${field[1]}"`), `${name} needs a label for ${field[1]}`);
    }
}

const reachable = new Set(['index.html']);
const queue = ['index.html'];
while (queue.length > 0) {
    const current = queue.shift();
    for (const match of htmlByPage.get(current).matchAll(/href="\.\/([^"#?]+\.html)"/g)) {
        if (!htmlByPage.has(match[1]) || reachable.has(match[1])) continue;
        reachable.add(match[1]);
        queue.push(match[1]);
    }
}
assert.deepEqual([...reachable].sort(), [...pages].sort(), 'Every documentation page must be reachable from the homepage');

const suitePages = new Map([
    ['Unit', 'tests-unit.html'], ['Functional', 'tests-functional.html'],
    ['Integration', 'tests-integration.html'], ['Behavioral', 'tests-behavioral.html'],
    ['Regression', 'tests-regression.html'], ['Interface', 'tests-interface.html']
]);
const totalCases = categories.reduce((total, category) => total + category.tests.length, 0);
assert.equal(totalCases, 131);

for (const category of categories) {
    const html = htmlByPage.get(suitePages.get(category.name));
    const list = html.match(new RegExp(`<ol class="case-list" data-suite="${category.name}">([\\s\\S]*?)<\\/ol>`));
    assert.ok(list, `${category.name} page needs its case inventory`);
    const names = [...list[1].matchAll(/<li>([^<]+)<\/li>/g)].map((match) => match[1]);
    assert.deepEqual(names, category.tests.map((test) => test.name), `${category.name} page must show every exact test`);
}

const testing = htmlByPage.get('testing.html');
assert.match(testing, /131 unique checks/i);
for (const category of categories) {
    assert.match(testing, new RegExp(`${category.name} · ${category.tests.length}`));
}

const readme = readFileSync(resolve(projectRoot, 'README.md'), 'utf8');
assert.match(readme, /131 unique checks/i);
assert.match(readme, /works with bundlers and without a bundler/i);
assert.match(readme, /That example is non-bundled browser code/i);
assert.match(readme, /before the first module script/i);
assert.match(readme, /native browsers do not read npm package metadata/i);
assert.match(readme, /strict Content Security Policy[\s\S]*nonce or hash/i);
const documentedImportMaps = [...readme.matchAll(/<script type="importmap">\s*([\s\S]*?)\s*<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
assert.deepEqual(documentedImportMaps.slice(0, 2), [normalConsumerImportMap, conflictConsumerImportMap]);
for (const category of categories) {
    const details = readme.match(new RegExp(
        `<summary><strong>${category.name} — ${category.tests.length} (?:cases|scenarios)<\\/strong><\\/summary>\\s*([\\s\\S]*?)<\\/details>`
    ));
    assert.ok(details, `README needs the ${category.name} inventory`);
    const names = [...details[1].matchAll(/^\d+\. (.+)$/gm)]
        .map((match) => match[1].replaceAll('`', ''));
    assert.deepEqual(
        names,
        category.tests.map((test) => test.name),
        `README must show every exact ${category.name} test`
    );
}

for (const page of ['playground.html', 'playground-scenarios.html', 'live.html']) {
    assert.match(
        htmlByPage.get(page),
        /<script type="importmap">[^<]*"event-pubsub":"\.\/module\/index\.js","strong-type":"\.\/strong-type\/index\.js"[^<]*<\/script>/,
        `${page} must map the bare event-pubsub entry and strong-type dependency`
    );
}

const visibleBrowserContract = /&lt;script type="importmap"&gt;\s*\{"imports":\{"event-pubsub":"\.\/node_modules\/event-pubsub\/index\.js","strong-type":"\.\/node_modules\/strong-type\/index\.js"\}\}\s*&lt;\/script&gt;/;
for (const page of [
    'index.html', 'guide.html', 'examples.html', 'playground.html', 'playground-scenarios.html',
    'testing.html', 'live.html', 'coverage.html', 'migration.html'
]) {
    assert.match(htmlByPage.get(page), visibleBrowserContract, `${page} must visibly document the non-bundled import-map script`);
    assert.match(htmlByPage.get(page), /strict CSP[\s\S]*nonce or hash/i, `${page} must explain strict-CSP authorization for inline browser scripts`);
}
assert.match(readFileSync(resolve(siteRoot, 'playground.js'), 'utf8'), /from 'event-pubsub'/);
assert.match(readFileSync(resolve(siteRoot, 'playground-scenarios.js'), 'utf8'), /from 'event-pubsub'/);
assert.match(readFileSync(resolve(projectRoot, 'test', 'package-entry.js'), 'utf8'), /: 'event-pubsub'/);

assert.match(htmlByPage.get('coverage.html'), /Node coverage/);
assert.match(htmlByPage.get('coverage.html'), /Chrome coverage/);
assert.match(htmlByPage.get('benchmarks.html'), /execution latency/i);
assert.match(htmlByPage.get('benchmarks.html'), /data-benchmark-group="dispatch"/);
assert.match(htmlByPage.get('benchmarks-dispatch.html'), /data-benchmark-group="dispatch"/);
assert.match(htmlByPage.get('benchmarks-lifecycle.html'), /data-benchmark-group="lifecycle"/);
assert.match(htmlByPage.get('benchmarks-lifecycle.html'), /data-benchmark-group="state"/);
assert.match(htmlByPage.get('benchmarks-methodology.html'), /Only operation execution/i);
const playground = htmlByPage.get('playground.html');
for (const id of ['subscription-form', 'emit-form', 'argument-mode', 'registry-list', 'event-log', 'clear-log', 'reset-events', 'restore-defaults']) {
    assert.match(playground, new RegExp(`id="${id}"`), `playground.html needs ${id}`);
}
assert.match(playground, /role="log"/);
assert.match(playground, /role="status"/);
assert.doesNotMatch(playground, /\son[a-z]+=/i, 'playground.html must not use inline event handlers');
assert.match(htmlByPage.get('migration.html'), /5\.x → 6\.x/);
assert.match(htmlByPage.get('index.html'), /bundled browser applications, and unbundled native ESM/i);
assert.match(htmlByPage.get('guide.html'), /works with a bundler and without one/i);
assert.match(htmlByPage.get('security.html'), /security\/advisories\/new/);
assert.match(htmlByPage.get('changelog.html'), /6\.0\.0 · 2026-08-21/);
assert.match(htmlByPage.get('changelog.html'), /5\.0\.3 · 2020-11-26/);
assert.match(htmlByPage.get('changelog.html'), /6\.1\.1 · 2026-08-23/);
assert.match(htmlByPage.get('index.html'), /6\.1\.1 is the current npm and GitHub release/);

const status = createStatus();
assert.equal(status.version, '6.1.1');
assert.equal(status.tests.total, totalCases);
assert.ok(statSync(resolve(siteRoot, 'og.png')).size > 100_000, 'Social image must be a substantive raster asset');
assert.ok(statSync(resolve(siteRoot, 'benchmark-summary.svg')).size > 5_000, 'Benchmark summary must be a substantive generated chart.');
validateBenchmark(
    JSON.parse(readFileSync(resolve(projectRoot, 'benchmark', 'results.json'), 'utf8')),
    {name: 'event-pubsub', version: status.version}
);

const css = readFileSync(resolve(siteRoot, 'styles.css'), 'utf8');
assert.equal((css.match(/{/g) ?? []).length, (css.match(/}/g) ?? []).length, 'CSS braces must balance');
assert.match(css, /prefers-reduced-motion/);
assert.doesNotMatch(css, /scroll-behavior:\s*smooth/i);

for (const file of ['script.js', 'playground.js', 'playground-core.js', 'playground-scenarios.js', 'live.js', 'benchmark-data.js', 'benchmark-charts.js']) {
    execFileSync(process.execPath, ['--check', resolve(siteRoot, file)], {stdio: 'pipe'});
}

function walk(directory) {
    for (const entry of readdirSync(directory, {withFileTypes: true})) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) walk(path);
        else assert.ok(!['.ts', '.tsx'].includes(extname(path)), `TypeScript is not allowed: ${path}`);
    }
}
walk(projectRoot);

for (const file of ['README.md', 'CHANGELOG.md', 'MIGRATION.md', 'SECURITY.md', 'licence']) {
    assert.ok(existsSync(resolve(projectRoot, file)), `Missing project document: ${file}`);
}

process.stdout.write(`Validated ${pages.length} focused pages, ${totalCases} displayed tests, navigation, metadata, accessibility hooks, scripts, and assets.\n`);
