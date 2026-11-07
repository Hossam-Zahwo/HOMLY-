import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

test('public storefront and admin routes respond without SSR server errors', { timeout: 90_000 }, async () => {
  const port = 4189;
  const root = 'http://127.0.0.1:' + port;
  const pages = [
    '/', '/products', '/categories', '/offers', '/favorites',
    '/cart', '/orders', '/admin/login',
    '/category/kitchen', '/product/non-existent-smoke-slug',
    '/page/about-us',
  ];
  const child = spawn(process.execPath, [
    'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'
  ], { env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
       stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', chunk => { log = (log + String(chunk)).slice(-12_000); });
  child.stderr.on('data', chunk => { log = (log + String(chunk)).slice(-12_000); });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (child.exitCode !== null) break;
      try {
        const response = await fetch(root + '/', { signal: AbortSignal.timeout(2500) });
        if (response.status < 500) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.ok(ready, 'Vite did not start or home route returned HTTP 5xx: ' + log.slice(-3000));
    for (const route of pages) {
      const response = await fetch(root + route, { signal: AbortSignal.timeout(12_000), redirect: 'manual' });
      assert.ok(response.status < 500,
        route + ' returned HTTP ' + response.status + '\n' + log.slice(-1500));
      if (response.status === 200) {
        const html = await response.text();
        assert.match(html, /<html|<!doctype/i, route + ' should return a document');
        assert.doesNotMatch(html, /Minified React error #310/, route + ' hit React hook error');
      }
    }
  } finally {
    child.kill('SIGTERM');
  }
});
