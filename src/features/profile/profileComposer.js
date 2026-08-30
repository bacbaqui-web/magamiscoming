export function createProfileComposer({ engine, root = document } = {}) {
  const userInfo = root.getElementById('userInfo');
  const userAvatar = root.getElementById('userAvatar');
  const userAvatarFallback = root.getElementById('userAvatarFallback');
  const signInButton = root.getElementById('signInBtn');
  const signOutButton = root.getElementById('signOutBtn');

  function render({ user }) {
    if (userInfo) {
      userInfo.textContent = user
        ? `${user.name || '로그인됨'} (${user.email || ''})`
        : 'Google 로그인 후 Drive 데이터를 동기화할 수 있습니다.';
    }
    if (userAvatar && userAvatarFallback) {
      if (user?.picture) {
        userAvatar.src = user.picture;
        userAvatar.classList.remove('hidden');
        userAvatarFallback.classList.add('hidden');
      } else {
        userAvatar.removeAttribute('src');
        userAvatar.classList.add('hidden');
        userAvatarFallback.textContent = user?.name?.trim()?.[0] || '?';
        userAvatarFallback.classList.remove('hidden');
      }
    }
    signInButton?.classList.toggle('hidden', Boolean(user));
    signOutButton?.classList.toggle('hidden', !user);
  }

  engine.setRenderer(render);
  return { render };
}
