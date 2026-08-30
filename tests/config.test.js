import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const configSource = await readFile(new URL('../src/config.js', import.meta.url), 'utf8');

function loadConfig({ hostname, search = '' }) {
  const window = { location: { hostname, search } };
  vm.runInNewContext(configSource, { URLSearchParams, window });
  return window.APP_CONFIG;
}

test('media analysis uses localhost by default only on local origins', () => {
  assert.equal(
    loadConfig({ hostname: '127.0.0.1' }).mediaAnalysis.apiBaseUrl,
    'http://127.0.0.1:8000'
  );
  assert.equal(loadConfig({ hostname: 'bacbaqui-web.github.io' }).mediaAnalysis.apiBaseUrl, '');
});

test('production can explicitly opt into the local media analysis server', () => {
  assert.equal(
    loadConfig({ hostname: 'bacbaqui-web.github.io', search: '?mediaAnalysis=local' }).mediaAnalysis
      .apiBaseUrl,
    'http://127.0.0.1:8000'
  );
});
