export function createMetadataPort({ adapter, authController }) {
  function hasAuthenticatedUser() {
    return Boolean(authController.getState().currentUser);
  }

  function isActive() {
    return hasAuthenticatedUser() && adapter.isActive();
  }

  function assertReady() {
    adapter.assertReady();
  }

  async function loadAppParts(options) {
    if (!isActive()) return null;
    return adapter.loadAppParts(options);
  }

  async function saveAppParts(parts, options) {
    if (!isActive()) return false;
    return adapter.saveAppParts(parts, options);
  }

  return {
    assertReady,
    isActive,
    loadAppParts,
    saveAppParts
  };
}
