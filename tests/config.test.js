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

test('all app origins use local analysis by default without a special URL', () => {
  for (const hostname of [
    '127.0.0.1',
    'localhost',
    'magamiscom.ing',
    'www.magamiscom.ing',
    'bacbaqui-web.github.io'
  ]) {
    const config = loadConfig({ hostname }).mediaAnalysis;
    assert.equal(config.apiBaseUrl, 'http://127.0.0.1:8000');
    assert.equal(config.requireAuth, false);
  }
});

test('Oracle analysis requires an explicit query option and Firebase token', () => {
  const remote = loadConfig({
    hostname: 'magamiscom.ing',
    search: '?mediaAnalysis=oracle'
  }).mediaAnalysis;
  assert.equal(remote.apiBaseUrl, 'https://insight.magamiscom.ing/media-analysis');
  assert.equal(remote.requireAuth, true);
});

test('production can explicitly opt into the local media analysis server', () => {
  assert.equal(
    loadConfig({ hostname: 'bacbaqui-web.github.io', search: '?mediaAnalysis=local' }).mediaAnalysis
      .apiBaseUrl,
    'http://127.0.0.1:8000'
  );
});
