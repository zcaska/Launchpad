import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createServiceWorker } from './pwa.mjs';

// A scoped worker must never intercept account/API traffic or evict another app's caches.
const handlers = {};
const stores = new Map();
const deleted = [];
const scope = 'https://example.com/LaunchPAD/';
const caches = {
  open: async name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      addAll: async requests => requests.forEach(request => {
        assert.equal(request.cache, 'reload');
        entries.set(request.url, new Response(request.url));
      }),
      match: async key => entries.get(typeof key === 'string' ? key : key.url)?.clone(),
    };
  },
  keys: async () => [...stores.keys()],
  delete: async name => { deleted.push(name); return stores.delete(name); },
};
const source = createServiceWorker(['index.html', 'assets/app.js'], 'abc');
vm.runInNewContext(source, {
  self: { registration: { scope }, addEventListener: (name, fn) => { handlers[name] = fn; } },
  caches, URL, Request, Response, fetch: async () => { throw new Error('offline'); },
});
await new Promise((resolve, reject) => handlers.install({ waitUntil: p => p.then(resolve, reject) }));
let result;
const dispatch = (path, options = {}) => {
  result = undefined;
  handlers.fetch({ request: { url: new URL(path, scope).href, method: 'GET', mode: 'cors', ...options }, respondWith: p => { result = p; } });
  return result;
};
assert.equal(await (await dispatch('./', { mode: 'navigate' })).text(), `${scope}index.html`);
assert.equal(await (await dispatch('./?view=tasks', { mode: 'navigate' })).text(), `${scope}index.html`);
assert.equal(await (await dispatch('assets/app.js')).text(), `${scope}assets/app.js`);
assert.equal(dispatch('https://account.supabase.co/rest/v1/tasks'), undefined);
assert.equal(dispatch('api/tasks'), undefined);
assert.equal(dispatch('assets/app.js', { method: 'POST' }), undefined);
assert.equal(dispatch('../other/', { mode: 'navigate' }), undefined);
await caches.open('another-app-cache');
await caches.open('launchpad-shell:https://example.com/LaunchPAD/:old');
await new Promise((resolve, reject) => handlers.activate({ waitUntil: p => p.then(resolve, reject) }));
assert.deepEqual(deleted, ['launchpad-shell:https://example.com/LaunchPAD/:old']);
assert.ok(stores.has('another-app-cache'));
console.log('PWA offline shell, API isolation, scope, and cache cleanup tests passed.');
