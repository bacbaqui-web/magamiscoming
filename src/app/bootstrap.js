import { createAppComposer } from './appComposer.js';
import { initializeAppState } from './appState.js';

async function bootstrap() {
  initializeAppState(window);
  await createAppComposer().start();
}

bootstrap().catch((error) => {
  console.error('app bootstrap failed', error);
  window.showAlert?.('앱을 시작하는 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.');
});
