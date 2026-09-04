import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkMusicAnalysisView } from '../src/features/workmusic/workMusicAnalysisView.js';

test('playhead follows playback and seeking without rebuilding markers, hides on song change', () => {
  const properties = {};
  let rebuilds = 0;
  const lane = {
    dataset: {},
    style: {
      setProperty: (key, value) => {
        properties[key] = value;
      }
    },
    replaceChildren: () => {
      rebuilds += 1;
    }
  };
  const label = {};
  const elements = {
    workMusicAnalysisPanel: { dataset: {} },
    workMusicAnalysisMarkers: lane,
    workMusicAnalysisPlayback: label
  };
  const view = createWorkMusicAnalysisView({
    root: { getElementById: (id) => elements[id] },
    controller: {}
  });
  view.render({ videoId: 'a', detected: { durationSeconds: 200 }, phase: 'succeeded' });
  view.renderPlayback({ videoId: 'a', currentTime: 100, duration: 201 });
  assert.equal(properties['--playback-position'], '50%');
  assert.equal(label.textContent, '재생 위치 1:40 / 3:20');
  view.renderPlayback({ videoId: 'a', currentTime: 20, duration: 201 });
  assert.equal(properties['--playback-position'], '10%');
  assert.equal(rebuilds, 1);
  view.renderPlayback({ videoId: 'a', currentTime: 999, duration: 201 });
  assert.equal(properties['--playback-position'], '100%');
  view.render({ videoId: 'b', phase: 'idle' });
  assert.equal(lane.dataset.playback, 'false');
  assert.equal(label.textContent, '재생 위치 —');
  view.renderPlayback({ videoId: 'b', currentTime: 10, duration: 100 });
  assert.equal(lane.dataset.playback, 'true');
  view.renderPlayback({ videoId: 'b', currentTime: NaN, duration: 100 });
  assert.equal(lane.dataset.playback, 'false');
});

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
