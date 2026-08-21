import {cpSync, existsSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {writeStatus} from './site-data.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const allowedOutputs = new Set(['_site', '.site-preview']);

function assertSafeOutput(outputPath) {
    const resolved = resolve(outputPath);
    const projectRelative = relative(projectRoot, resolved);
    if (!allowedOutputs.has(projectRelative)) {
        throw new Error(`Site output must be one of: ${[...allowedOutputs].join(', ')}.`);
    }
    return resolved;
}

function copyFile(source, destination) {
    if (!existsSync(source)) throw new Error(`Required site input is missing: ${relative(projectRoot, source)}`);
    mkdirSync(dirname(destination), {recursive: true});
    cpSync(source, destination);
}

function copyDirectoryIfPresent(source, destination) {
    if (!existsSync(source)) return;
    mkdirSync(dirname(destination), {recursive: true});
    cpSync(source, destination, {recursive: true});
}

function writeBadges(status, output) {
    const badgeDirectory = resolve(output, 'badges');
    const labels = {
        statements: 'executable ranges',
        branches: 'block ranges',
        functions: 'function ranges',
        lines: 'executable lines'
    };
    function write(name, label, message, color = 'brightgreen') {
        const schema = {
            schemaVersion: 1,
            label,
            message,
            color
        };
        writeFileSync(resolve(badgeDirectory, `${name}.json`), `${JSON.stringify(schema, null, 2)}\n`);
    }

    mkdirSync(badgeDirectory, {recursive: true});
    for (const runtime of ['node', 'chrome']) {
        const title = runtime === 'node' ? 'Node' : 'Chrome';
        const tests = status.tests[runtime];
        write(
            `${runtime}-tests`,
            `${title} tests`,
            tests.total ? `${tests.passedCount}/${tests.total}` : 'pending',
            tests.ok ? 'brightgreen' : 'red'
        );
        for (const metric of ['statements', 'branches', 'functions', 'lines']) {
            const value = status.coverage[runtime][metric];
            write(
                `${runtime}-${metric}`,
                `${title} ${labels[metric]}`,
                value === undefined ? 'pending' : `${value}%`,
                value === 100 ? 'brightgreen' : 'yellow'
            );
            if (runtime === 'node') {
                write(
                    metric,
                    `Node ${labels[metric]}`,
                    value === undefined ? 'pending' : `${value}%`,
                    value === 100 ? 'brightgreen' : 'yellow'
                );
            }
        }
    }
    write('runtime-dependencies', 'runtime dependencies', String(status.dependencies.runtime), status.dependencies.runtime === 0 ? 'brightgreen' : 'yellow');
    write('vanilla-test', 'vanilla-test', status.dependencies.vanillaTest ?? 'missing', status.dependencies.vanillaTest ? 'blue' : 'red');
}

export function assembleSite(outputPath = resolve(projectRoot, '_site')) {
    const output = assertSafeOutput(outputPath);
    if (existsSync(output)) rmSync(output, {recursive: true});
    mkdirSync(output, {recursive: true});
    cpSync(resolve(projectRoot, 'site'), output, {recursive: true});

    copyFile(resolve(projectRoot, 'index.js'), resolve(output, 'module', 'index.js'));
    copyFile(resolve(projectRoot, 'licence'), resolve(output, 'licence'));
    for (const name of ['CI.js', 'assertions.js', 'unit.js', 'functional.js', 'integration.js', 'regression.js', 'interface.js']) {
        copyFile(resolve(projectRoot, 'test', name), resolve(output, 'module', 'test', name));
    }
    for (const name of ['playground-core.js', 'benchmark-data.js']) {
        copyFile(resolve(projectRoot, 'site', name), resolve(output, 'module', 'site', name));
    }
    for (const packageName of ['strong-type', 'vanilla-test', 'ansi-colors-es6']) {
        copyFile(
            resolve(projectRoot, 'node_modules', packageName, 'index.js'),
            resolve(output, 'vendor', packageName, 'index.js')
        );
    }
    for (const [packageName, licenseName] of [
        ['strong-type', 'licence'], ['vanilla-test', 'licence'], ['ansi-colors-es6', 'LICENSE']
    ]) {
        copyFile(
            resolve(projectRoot, 'node_modules', packageName, licenseName),
            resolve(output, 'vendor', packageName, licenseName)
        );
    }

    copyDirectoryIfPresent(resolve(projectRoot, 'coverage', 'node'), resolve(output, 'reports', 'node'));
    copyDirectoryIfPresent(resolve(projectRoot, 'coverage', 'chrome'), resolve(output, 'reports', 'chrome'));
    copyFile(resolve(projectRoot, 'benchmark', 'results.json'), resolve(output, 'data', 'benchmark.json'));

    const status = writeStatus(resolve(output, 'data', 'status.json'));
    writeBadges(status, output);
    writeFileSync(resolve(output, '.nojekyll'), '');
    return {output, status};
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const {output, status} = assembleSite(process.argv[2] ? resolve(projectRoot, process.argv[2]) : undefined);
    process.stdout.write(`Assembled ${relative(projectRoot, output)} for event-pubsub ${status.version}.\n`);
}
