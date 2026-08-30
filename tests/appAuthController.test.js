import test from 'node:test';
import assert from 'node:assert/strict';

import { createAppAuthController } from '../src/app/appAuthController.js';

test('AppAuthController owns auth readiness and keeps the window compatibility value', () => {
  const host = { isAuthReady: false };
  const controller = createAppAuthController({ host });
  const user = { email: 'artist@example.com' };

  controller.setReady(true);
  controller.setCurrentUser(user);

  assert.equal(host.isAuthReady, true);
  assert.equal(controller.getState().ready, true);
  assert.equal(controller.getState().currentUser, user);
});

test('AppAuthController starts post-login data loading through one entry point', async () => {
  const controller = createAppAuthController({ host: {} });
  const order = [];

  const loading = controller.startPostLoginDataLoad(async () => {
    order.push('calendar');
    await Promise.resolve();
    order.push('deferred-start');
  });

  assert.equal(controller.getState().postLoginDataLoad, loading);
  await loading;
  assert.deepEqual(order, ['calendar', 'deferred-start']);
});
