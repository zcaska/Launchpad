import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function createServiceWorker(files, revision) {
  return `// Generated app-shell cache. API responses and user data are never cached here.
const scope = self.registration.scope;
const prefix = 'launchpad-shell:' + scope + ':';
const cacheName = prefix + ${JSON.stringify(revision)};
const files = ${JSON.stringify(files)}.map(path => new URL(path, scope).href);
const allowed = new Set(files);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(
    files.map(url => new Request(url, { cache: 'reload' }))
  )));
  // Wait for existing windows to close: never replace an app with unsaved work.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(prefix) && key !== cacheName).map(key => caches.delete(key))
  )));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const entry = new URL('index.html', scope).href;
  const isEntry = url.pathname === new URL(scope).pathname || url.pathname === new URL(entry).pathname;
  if (url.origin !== new URL(scope).origin) return;
  const key = request.mode === 'navigate' && isEntry ? entry : url.origin + url.pathname;
  if (!allowed.has(key)) return;
  event.respondWith(caches.open(cacheName).then(async cache => {
    const cached = await cache.match(key);
    return cached || fetch(request);
  }));
});
`;
}

export function pwaPlugin() {
  let outputDirectory;
  return {
    name: 'launchpad-offline-shell',
    apply: 'build',
    configResolved(config) { outputDirectory = join(config.root, config.build.outDir); },
    async closeBundle() {
      async function list(directory, prefix = '') {
        const entries = await readdir(directory, { withFileTypes: true });
        const groups = await Promise.all(entries.map(entry => entry.isDirectory()
          ? list(join(directory, entry.name), prefix + entry.name + '/')
          : [prefix + entry.name]));
        return groups.flat();
      }
      const files = (await list(outputDirectory)).filter(file => file !== 'sw.js' && !file.endsWith('.map')).sort();
      const hash = createHash('sha256');
      for (const file of files) {
        hash.update(file);
        hash.update(await readFile(join(outputDirectory, file)));
      }
      await writeFile(join(outputDirectory, 'sw.js'), createServiceWorker(files, hash.digest('hex').slice(0, 16)));
    },
  };
}
