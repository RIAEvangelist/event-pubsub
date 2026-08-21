import {createReadStream, existsSync, statSync} from 'node:fs';
import {createServer} from 'node:http';
import {extname, isAbsolute, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assembleSite} from './assemble-site.js';

const root = assembleSite(resolve(fileURLToPath(new URL('..', import.meta.url)), '.site-preview')).output;
const port = Number.parseInt(process.env.PORT ?? '8000', 10);
const types = new Map([
    ['', 'text/plain; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'], ['.html', 'text/html; charset=utf-8'],
    ['.js', 'text/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
    ['.png', 'image/png'], ['.svg', 'image/svg+xml'], ['.txt', 'text/plain; charset=utf-8']
]);

if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');

createServer((request, response) => {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
        response.writeHead(400, {'content-type': 'text/plain; charset=utf-8'}).end('Bad request');
        return;
    }

    let target = resolve(root, `.${pathname}`);
    const rootRelative = relative(root, target);

    if (rootRelative === '..' || rootRelative.startsWith(`..${sep}`) || isAbsolute(rootRelative)) {
        response.writeHead(403).end('Forbidden');
        return;
    }

    if (existsSync(target) && statSync(target).isDirectory()) target = resolve(target, 'index.html');
    if (!existsSync(target) || !statSync(target).isFile()) {
        response.writeHead(404, {'content-type': 'text/plain; charset=utf-8'}).end('Not found');
        return;
    }

    response.writeHead(200, {
        'content-type': types.get(extname(target).toLowerCase()) ?? 'application/octet-stream',
        'x-content-type-options': 'nosniff'
    });
    createReadStream(target).pipe(response);
}).listen(port, '127.0.0.1', () => {
    process.stdout.write(`event-pubsub documentation: http://127.0.0.1:${port}/\n`);
});
