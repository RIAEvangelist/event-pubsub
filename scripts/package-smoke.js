import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {basename, join, resolve, sep} from 'node:path';
import {tmpdir} from 'node:os';

const projectRoot = resolve(import.meta.dirname, '..');
const prefix = 'event-pubsub-package-smoke-';
const npmCli = process.env.npm_execpath;
assert.ok(npmCli && existsSync(npmCli), 'Run package smoke through npm so npm_execpath is available.');
const temporaryRoot = mkdtempSync(join(tmpdir(), prefix));
const sourceManifest = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'));
const nestedExecutionMarker = 'event-pubsub-package-smoke:nested-strong-type';
const rootConflictMessage = 'conflicting root strong-type@1.1.0 executed';

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
    assert.equal(packed[0].filename, `event-pubsub-${sourceManifest.version}.tgz`);
    assert.match(packed[0].integrity, /^sha512-/);

    const actualFiles = packed[0].files.map(({path}) => path).sort();
    assert.deepEqual(actualFiles, [
        'CHANGELOG.md', 'MIGRATION.md', 'README.md', 'SECURITY.md',
        'index.js', 'licence', 'package.json'
    ].sort());

    const consumer = join(temporaryRoot, 'consumer');
    mkdirSync(consumer);
    writeFileSync(join(consumer, 'package.json'), `${JSON.stringify({
        name: 'event-pubsub-smoke',
        private: true,
        type: 'module',
        dependencies: {
            'event-pubsub': `file:../${packed[0].filename}`,
            'strong-type': '1.1.0'
        }
    }, null, 2)}\n`);
    runNpm([
        'install', '--ignore-scripts', '--no-audit', '--no-fund', '--install-strategy=hoisted'
    ], {cwd: consumer});

    const installed = join(consumer, 'node_modules', 'event-pubsub');
    const installedManifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
    assert.equal(installedManifest.version, sourceManifest.version);
    assert.equal(installedManifest.main, './index.js');
    assert.equal(installedManifest.browser, './index.js');
    assert.equal(installedManifest.engines.node, '>=22.12.0');
    assert.deepEqual(installedManifest.dependencies, {'strong-type': '2.0.0'});
    assert.deepEqual(installedManifest.devDependencies, {
        '@rollup/plugin-node-resolve': '16.0.3',
        'rollup': '4.62.5',
        'vanilla-test': '2.1.1'
    });

    const rootStrongType = join(consumer, 'node_modules', 'strong-type');
    const nestedStrongType = join(installed, 'node_modules', 'strong-type');
    assert.equal(JSON.parse(readFileSync(join(rootStrongType, 'package.json'), 'utf8')).version, '1.1.0');
    assert.equal(JSON.parse(readFileSync(join(nestedStrongType, 'package.json'), 'utf8')).version, '2.0.0');
    assert.notEqual(realpathSync(rootStrongType), realpathSync(nestedStrongType));
    assert.equal(existsSync(join(consumer, 'node_modules', 'vanilla-test')), false);
    assert.equal(existsSync(join(consumer, 'node_modules', 'rollup')), false);
    assert.equal(existsSync(join(consumer, 'node_modules', '@rollup', 'plugin-node-resolve')), false);
    for (const repositoryOnly of ['site', 'test', 'scripts', 'benchmark', 'coverage', '.github']) {
        assert.equal(existsSync(join(installed, repositoryOnly)), false);
    }

    writeFileSync(join(rootStrongType, 'index.js'), `throw new Error(${JSON.stringify(rootConflictMessage)});\n`);
    const nestedIndex = join(nestedStrongType, 'index.js');
    writeFileSync(
        nestedIndex,
        `globalThis[Symbol.for(${JSON.stringify(nestedExecutionMarker)})] = '2.0.0';\n${readFileSync(nestedIndex, 'utf8')}`
    );

    run(process.execPath, ['--input-type=module', '-e', [
        `const expected = ${JSON.stringify(rootConflictMessage)};`,
        "let observed = '';",
        "try { await import('strong-type'); } catch (error) { observed = error.message; }",
        "if (observed !== expected) process.exit(1);"
    ].join(' ')], {cwd: consumer});

    run(process.execPath, ['--input-type=module', '-e', [
        `const marker = Symbol.for(${JSON.stringify(nestedExecutionMarker)});`,
        "if (globalThis[marker] !== undefined) process.exit(1);",
        "const {default: EventPubSub, EventPubSub: Named} = await import('event-pubsub');",
        "const {default: Direct} = await import('event-pubsub/index.js');",
        "if (globalThis[marker] !== '2.0.0') process.exit(1);",
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
        `const marker = Symbol.for(${JSON.stringify(nestedExecutionMarker)});`,
        "if (globalThis[marker] !== undefined) process.exit(1);",
        "const EventPubSub = require('event-pubsub');",
        "const Direct = require('event-pubsub/index.js');",
        "if (globalThis[marker] !== '2.0.0') process.exit(1);",
        "if (EventPubSub !== Direct || EventPubSub.default !== EventPubSub || EventPubSub.EventPubSub !== EventPubSub) process.exit(1);",
        "const events = new EventPubSub(); let count = 0;",
        "events.on('ready', () => { count += 1; }).emit('ready');",
        "if (count !== 1) process.exit(1);"
    ].join(' ')], {cwd: consumer});

    process.stdout.write(`Packed conflict consumer passed: ${packed[0].filename} ${packed[0].integrity}\n`);
} finally {
    removeTemporaryRoot(temporaryRoot);
}
