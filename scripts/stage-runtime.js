import assert from 'node:assert/strict';
import {cpSync, mkdirSync, readFileSync, rmSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stageRoot = resolve(projectRoot, 'test-runtime');
const eventPackage = resolve(stageRoot, 'event-pubsub');
const strongTypePackage = resolve(eventPackage, 'node_modules', 'strong-type');

assert.equal(relative(projectRoot, stageRoot), 'test-runtime');
rmSync(stageRoot, {recursive: true, force: true});
mkdirSync(eventPackage, {recursive: true});

for (const name of ['index.js', 'package.json']) {
    cpSync(resolve(projectRoot, name), resolve(eventPackage, name));
}
cpSync(resolve(projectRoot, 'test'), resolve(eventPackage, 'test'), {recursive: true});
mkdirSync(resolve(eventPackage, 'site'), {recursive: true});
for (const name of ['benchmark-data.js', 'playground-core.js']) {
    cpSync(resolve(projectRoot, 'site', name), resolve(eventPackage, 'site', name));
}

mkdirSync(strongTypePackage, {recursive: true});
for (const name of ['index.js', 'package.json', 'licence']) {
    cpSync(resolve(projectRoot, 'node_modules', 'strong-type', name), resolve(strongTypePackage, name));
}

assert.deepEqual(
    readFileSync(resolve(eventPackage, 'index.js')),
    readFileSync(resolve(projectRoot, 'index.js')),
    'Staged event-pubsub source must be byte-identical to the repository source.'
);
assert.equal(
    JSON.parse(readFileSync(resolve(strongTypePackage, 'package.json'), 'utf8')).version,
    '2.0.0',
    'The staged production dependency must be strong-type 2.0.0.'
);

process.stdout.write('Staged event-pubsub with its exact nested strong-type dependency.\n');
