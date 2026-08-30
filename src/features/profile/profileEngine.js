export function createProfileEngine({ appAuthController, mainTabsEngine } = {}) {
  let render = () => {};

  function getState() {
    return {
      user: appAuthController.getState().currentUser,
      tabSettings: mainTabsEngine.getState()
    };
  }

  function requestTabVisibility(tabId, visible) {
    mainTabsEngine.setTabVisible(tabId, visible);
    render(getState());
  }

  function setRenderer(nextRender) {
    render = typeof nextRender === 'function' ? nextRender : () => {};
    render(getState());
  }

  function refresh() {
    render(getState());
  }

  return { getState, refresh, requestTabVisibility, setRenderer };
}
