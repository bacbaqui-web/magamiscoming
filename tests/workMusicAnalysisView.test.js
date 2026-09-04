import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkMusicAnalysisView } from '../src/features/workmusic/workMusicAnalysisView.js';

test('view shows server queue counts and only disables the current active song', () => {
  const elements = {
    workMusicAnalysisPanel: { dataset: {} },
    workMusicAnalysisQueue: {},
    workMusicAnalyzeBtn: { addEventListener() {} }
  };
  const view = createWorkMusicAnalysisView({
    root: { getElementById: (id) => elements[id] },
    controller: {}
  });
  const state = {
    enabled: true,
    videoId: 'dQw4w9WgXcQ',
    phase: 'queued',
    queue: { runningCount: 1, queuedCount: 3 }
  };
  view.render(state);
  assert.equal(elements.workMusicAnalysisQueue.textContent, '서버 전체: 분석 중 1곡 · 대기 3곡');
  assert.equal(elements.workMusicAnalyzeBtn.disabled, true);
  view.render({ ...state, phase: 'idle' });
  assert.equal(elements.workMusicAnalyzeBtn.disabled, false);
  view.render({ ...state, queueUnavailable: true });
  assert.match(elements.workMusicAnalysisQueue.textContent, /확인할 수 없습니다/);
  view.render({ ...state, queue: { runningCount: 0, queuedCount: 0 } });
  assert.match(elements.workMusicAnalysisQueue.textContent, /분석 중 0곡 · 대기 0곡/);
});
