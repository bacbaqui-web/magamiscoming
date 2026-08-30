export function createAppAuthController({ host = window } = {}) {
  let currentUser = null;
  let ready = false;
  let postLoginDataLoad = null;

  function setReady(nextReady) {
    ready = Boolean(nextReady);
    host.isAuthReady = ready;
  }

  function setCurrentUser(user) {
    currentUser = user || null;
  }

  function startPostLoginDataLoad(loadData) {
    postLoginDataLoad = Promise.resolve().then(loadData);
    return postLoginDataLoad;
  }

  function getState() {
    return {
      currentUser,
      postLoginDataLoad,
      ready
    };
  }

  return {
    getState,
    setCurrentUser,
    setReady,
    startPostLoginDataLoad
  };
}
