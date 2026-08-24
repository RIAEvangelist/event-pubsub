import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {basename, extname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import {rollup} from 'rollup';
import {launchChrome} from '../node_modules/vanilla-test/lib/coverage/chrome-session.js';
import {
    conflictConsumerImportMap,
    importMapScript,
    normalConsumerImportMap
} from './browser-contract.js';

const projectRoot = resolve(import.meta.dirname, '..');
const temporaryPrefix = 'event-pubsub-browser-consumer-';
const temporaryRoot = mkdtempSync(join(tmpdir(), temporaryPrefix));
const npmCli = process.env.npm_execpath;
const sourceManifest = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'));
const markerName = 'event-pubsub-browser-consumer:strong-type';
const rootConflictMessage = 'poisoned browser consumer root strong-type executed';

assert.ok(npmCli && existsSync(npmCli), 'Run the browser consumer smoke through npm.');

function run(program, args, options = {}) {
    return execFileSync(program, args, {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'inherit'],
        ...options
    });
}

function runNpm(args, options) {
    return run(process.execPath, [npmCli, ...args], options);
}

function removeTemporaryRoot(target) {
    const resolvedTarget = resolve(target);
    const systemTemporaryPrefix = `${resolve(tmpdir())}${sep}`;
    const comparableTarget = process.platform === 'win32' ? resolvedTarget.toLowerCase() : resolvedTarget;
    const comparablePrefix = process.platform === 'win32'
        ? systemTemporaryPrefix.toLowerCase()
        : systemTemporaryPrefix;
    assert.ok(comparableTarget.startsWith(comparablePrefix));
    assert.ok(basename(resolvedTarget).startsWith(temporaryPrefix));
    rmSync(resolvedTarget, {recursive: true});
}

function installConsumer(name, dependencies) {
    const directory = join(temporaryRoot, name);
    mkdirSync(directory);
    writeFileSync(join(directory, 'package.json'), `${JSON.stringify({
        name: `event-pubsub-${name}-consumer`,
        private: true,
        type: 'module',
        dependencies
    }, null, 2)}\n`);
    runNpm(
        ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--install-strategy=hoisted'],
        {cwd: directory}
    );
    return directory;
}

function prependMarker(filePath, value) {
    writeFileSync(
        filePath,
        `globalThis[Symbol.for(${JSON.stringify(markerName)})] = ${JSON.stringify(value)};\n${readFileSync(filePath, 'utf8')}`
    );
}

function browserBehavior(expectedMarker, passedResult) {
    return `try {
    const marker = Symbol.for(${JSON.stringify(markerName)});
    const {default: EventPubSub, EventPubSub: NamedEventPubSub} = await import('event-pubsub');
    if (EventPubSub !== NamedEventPubSub) throw new Error('default and named exports differ');
    if (globalThis[marker] !== ${JSON.stringify(expectedMarker)}) throw new Error('wrong strong-type copy executed');
    const events = new EventPubSub();
    let calls = 0;
    events.once('ready', () => { calls += 1; }).on('ready', () => { calls += 10; });
    if (events.emit('ready').emit('ready') !== events || calls !== 21) throw new Error('event behavior failed');
    let validationPassed = false;
    try { events.on(1, () => {}); } catch (error) { validationPassed = error instanceof TypeError; }
    if (!validationPassed) throw new Error('strong-type validation failed');
    document.body.dataset.result = ${JSON.stringify(passedResult)};
} catch (error) {
    document.body.dataset.result = 'failed';
    document.querySelector('output').textContent = error?.stack ?? String(error);
}`;
}

function mappedPage(importMap, expectedMarker, passedResult) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
${importMapScript(importMap)}
</head>
<body data-result="pending"><output>pending</output>
<script type="module">${browserBehavior(expectedMarker, passedResult)}</script>
</body>
</html>`;
}

function startFixtureServer(root) {
    const mimeTypes = new Map([
        ['.html', 'text/html; charset=utf-8'],
        ['.js', 'text/javascript; charset=utf-8'],
        ['.json', 'application/json; charset=utf-8']
    ]);
    const server = createServer((request, response) => {
        if (request.method !== 'GET') {
            response.writeHead(405, {'content-type': 'text/plain; charset=utf-8'}).end('Method not allowed');
            return;
        }
        let pathname;
        try {
            pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
        } catch {
            response.writeHead(400, {'content-type': 'text/plain; charset=utf-8'}).end('Bad request');
            return;
        }
        const target = resolve(root, `.${pathname}`);
        const relativeTarget = relative(root, target);
        if (relativeTarget === '..' || relativeTarget.startsWith(`..${sep}`) || isAbsolute(relativeTarget)) {
            response.writeHead(403, {'content-type': 'text/plain; charset=utf-8'}).end('Forbidden');
            return;
        }
        if (!existsSync(target) || !statSync(target).isFile()) {
            response.writeHead(404, {'content-type': 'text/plain; charset=utf-8'}).end('Not found');
            return;
        }
        response.writeHead(200, {
            'content-type': mimeTypes.get(extname(target).toLowerCase()) ?? 'application/octet-stream',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff'
        });
        createReadStream(target).pipe(response);
    });
    return new Promise((resolveServer, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => resolveServer(server));
    });
}

async function runChrome(browser, server, pagePath, expectedResult) {
    const {port} = server.address();
    let page;
    const exceptions = [];
    try {
        page = await browser.createPage({
            viewport: {width: 1280, height: 720, deviceScaleFactor: 1},
            timeoutMs: 30_000
        });
        page.on('Runtime.exceptionThrown', ({exceptionDetails}) => {
            exceptions.push(exceptionDetails?.exception?.description ?? exceptionDetails?.text ?? 'Unknown browser exception');
        });
        await page.goto(`http://127.0.0.1:${port}/${pagePath}`, {
            waitUntil: 'load',
            timeoutMs: 30_000
        });
        await page.waitForFunction(
            "document.body.dataset.result !== 'pending'",
            {timeoutMs: 30_000}
        );
        const outcome = await page.evaluate(`({
            result: document.body.dataset.result,
            detail: document.querySelector('output')?.textContent ?? ''
        })`);
        assert.equal(outcome.result, expectedResult, outcome.detail);
        assert.deepEqual(exceptions, []);
    } finally {
        await page?.close().catch(() => {});
    }
}

let server;
let browser;
try {
    const packed = JSON.parse(runNpm(['pack', '--json', '--pack-destination', temporaryRoot]));
    assert.equal(packed.length, 1);
    assert.equal(packed[0].filename, `event-pubsub-${sourceManifest.version}.tgz`);
    assert.match(packed[0].integrity, /^sha512-/);
    const tarballDependency = `file:../${packed[0].filename}`;

    const normal = installConsumer('normal', {'event-pubsub': tarballDependency});
    const normalStrongType = join(normal, 'node_modules', 'strong-type');
    assert.equal(JSON.parse(readFileSync(join(normalStrongType, 'package.json'), 'utf8')).version, '2.0.0');
    prependMarker(join(normalStrongType, 'index.js'), 'normal:2.0.0');
    writeFileSync(
        join(normal, 'index.html'),
        mappedPage(normalConsumerImportMap, 'normal:2.0.0', 'normal-passed')
    );

    const conflict = installConsumer('conflict', {
        'event-pubsub': tarballDependency,
        'strong-type': '1.1.0'
    });
    const conflictRoot = join(conflict, 'node_modules', 'strong-type');
    const conflictNested = join(conflict, 'node_modules', 'event-pubsub', 'node_modules', 'strong-type');
    assert.equal(JSON.parse(readFileSync(join(conflictRoot, 'package.json'), 'utf8')).version, '1.1.0');
    assert.equal(JSON.parse(readFileSync(join(conflictNested, 'package.json'), 'utf8')).version, '2.0.0');
    writeFileSync(join(conflictRoot, 'index.js'), `throw new Error(${JSON.stringify(rootConflictMessage)});\n`);
    prependMarker(join(conflictNested, 'index.js'), 'nested:2.0.0');
    writeFileSync(
        join(conflict, 'index.html'),
        mappedPage(conflictConsumerImportMap, 'nested:2.0.0', 'conflict-passed')
    );

    const bundleEntry = join(conflict, 'bundle-entry.js');
    writeFileSync(bundleEntry, browserBehavior('nested:2.0.0', 'bundle-passed'));
    const bundle = await rollup({
        input: bundleEntry,
        plugins: [nodeResolve({browser: true})]
    });
    const bundleInputs = bundle.watchFiles.map((input) => input.replaceAll('\\', '/'));
    assert.ok(bundleInputs.some((input) => input.includes('event-pubsub/node_modules/strong-type/index.js')));
    assert.equal(bundleInputs.some((input) => /(^|\/)node_modules\/strong-type\/index\.js$/.test(input)
        && !input.includes('event-pubsub/node_modules/strong-type/index.js')), false);
    await bundle.write({
        file: join(conflict, 'bundle.js'),
        format: 'es',
        inlineDynamicImports: true
    });
    await bundle.close();
    writeFileSync(join(conflict, 'bundle.html'), '<!doctype html><body data-result="pending"><output>pending</output><script type="module" src="./bundle.js"></script>');

    server = await startFixtureServer(temporaryRoot);
    browser = await launchChrome({
        executablePath: process.env.CHROME_PATH ?? null,
        headless: true,
        timeoutMs: 30_000
    });
    await runChrome(browser, server, 'normal/index.html', 'normal-passed');
    await runChrome(browser, server, 'conflict/index.html', 'conflict-passed');
    await runChrome(browser, server, 'conflict/bundle.html', 'bundle-passed');

    process.stdout.write(
        `Packed browser consumers passed: normal import map, scoped conflict map, and Rollup ${sourceManifest.devDependencies.rollup} bundle; ${packed[0].integrity}\n`
    );
} finally {
    await browser?.close({force: true}).catch(() => {});
    if (server) await new Promise((resolveClose) => server.close(resolveClose));
    removeTemporaryRoot(temporaryRoot);
}
