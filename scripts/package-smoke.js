import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {basename, join, resolve, sep} from 'node:path';
import {tmpdir} from 'node:os';

const projectRoot = resolve(import.meta.dirname, '..');
const prefix = 'event-pubsub-package-smoke-';
const npmCli = process.env.npm_execpath;
assert.ok(npmCli && existsSync(npmCli), 'Run package smoke through npm so npm_execpath is available.');
const temporaryRoot = mkdtempSync(join(tmpdir(), prefix));

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
    const temporaryPrefix = `${resolve(tmpdir())}${sep}`;
    const comparableTarget = process.platform === 'win32' ? resolvedTarget.toLowerCase() : resolvedTarget;
    const comparablePrefix = process.platform === 'win32' ? temporaryPrefix.toLowerCase() : temporaryPrefix;
    assert.ok(comparableTarget.startsWith(comparablePrefix));
    assert.ok(basename(resolvedTarget).startsWith(prefix));
    rmSync(resolvedTarget, {recursive: true});
}

try {
    const packed = JSON.parse(runNpm(['pack', '--json', '--pack-destination', temporaryRoot]));
    assert.equal(packed.length, 1);
    assert.match(packed[0].filename, /^event-pubsub-6\.1\.0\.tgz$/);
    assert.match(packed[0].integrity, /^sha512-/);

    const actualFiles = packed[0].files.map(({path}) => path).sort();
    assert.deepEqual(actualFiles, [
        'CHANGELOG.md', 'MIGRATION.md', 'README.md', 'SECURITY.md',
        'index.js', 'licence', 'package.json'
    ].sort());

    const consumer = join(temporaryRoot, 'consumer');
    mkdirSync(consumer);
    writeFileSync(join(consumer, 'package.json'), `${JSON.stringify({name: 'event-pubsub-smoke', private: true, type: 'module'}, null, 2)}\n`);
    runNpm(['install', '--ignore-scripts', '--no-audit', '--no-fund', join(temporaryRoot, packed[0].filename)], {cwd: consumer});

    const installed = join(consumer, 'node_modules', 'event-pubsub');
    const manifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
    assert.equal(manifest.version, '6.1.0');
    assert.equal(manifest.engines.node, '>=22.12.0');
    assert.deepEqual(manifest.dependencies, {'strong-type': '2.0.0'});
    assert.deepEqual(manifest.devDependencies, {'vanilla-test': '2.1.1'});
    assert.equal(existsSync(join(consumer, 'node_modules', 'strong-type', 'index.js')), true);
    assert.equal(
        JSON.parse(readFileSync(join(consumer, 'node_modules', 'strong-type', 'package.json'), 'utf8')).version,
        '2.0.0'
    );
    assert.equal(existsSync(join(consumer, 'node_modules', 'vanilla-test')), false);
    for (const repositoryOnly of ['site', 'test', 'scripts', 'benchmark', 'coverage', '.github']) {
        assert.equal(existsSync(join(installed, repositoryOnly)), false);
    }

    run(process.execPath, ['--input-type=module', '-e', [
        "import EventPubSub, {EventPubSub as Named} from 'event-pubsub';",
        "import Direct from 'event-pubsub/index.js';",
        "if (EventPubSub !== Named || EventPubSub !== Direct) process.exit(1);",
        "const events = new EventPubSub(); let count = 0;",
        "events.once('ready', () => { count += 1; }).on('ready', () => { count += 10; });",
        "if (events.emit('ready').emit('ready') !== events || count !== 21) process.exit(1);",
        "const frozen = Object.freeze(() => { count += 100; });",
        "events.once('frozen', frozen).emit('frozen');",
        "if (count !== 121 || events.list.frozen !== undefined) process.exit(1);",
        "for (const operation of [() => events.on(1, () => {}), () => events.on('x', 1), () => events.emit(1)]) {",
        "  let failed = false; try { operation(); } catch (error) { failed = error instanceof TypeError; }",
        "  if (!failed) process.exit(1);",
        "}"
    ].join(' ')], {cwd: consumer});

    run(process.execPath, ['-e', [
        "const EventPubSub = require('event-pubsub');",
        "const Direct = require('event-pubsub/index.js');",
        "if (EventPubSub !== Direct || EventPubSub.default !== EventPubSub || EventPubSub.EventPubSub !== EventPubSub) process.exit(1);",
        "const events = new EventPubSub(); let count = 0;",
        "events.on('ready', () => { count += 1; }).emit('ready');",
        "if (count !== 1) process.exit(1);"
    ].join(' ')], {cwd: consumer});

    process.stdout.write(`Packed package passed: ${packed[0].filename} ${packed[0].integrity}\n`);
} finally {
    removeTemporaryRoot(temporaryRoot);
}
