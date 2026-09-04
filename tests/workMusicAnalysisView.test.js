import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkMusicAnalysisView } from '../src/features/workmusic/workMusicAnalysisView.js';

test('integrated waveform range follows input before commit and clears on song change', () => {
  const element = () => ({
    dataset: {},
    style: {
      setProperty(key, value) {
        this[key] = value;
      }
    },
    children: [],
    listeners: {},
    appendChild(child) {
      this.children.push(child);
    },
    replaceChildren() {
      this.children = [];
    },
    addEventListener(name, fn) {
      this.listeners[name] = fn;
    },
    setAttribute(name, value) {
      this[name] = value;
    }
  });
  const elements = Object.fromEntries(
    [
      'workMusicAnalysisPanel',
      'workMusicAnalysisMarkers',
      'workMusicDrumLane',
      'workMusicDrumStart',
      'workMusicDrumEnd',
      'workMusicDrumLabel'
    ].map((id) => [id, element()])
  );
  let commits = 0;
  let state = {
    videoId: 'a',
    detected: { durationSeconds: 100, waveform: [0.5] },
    draft: { drumStart: 10, drumEnd: 90 }
  };
  const view = createWorkMusicAnalysisView({
    root: {
      getElementById: (id) => elements[id],
      createElement: element,
      createDocumentFragment: element
    },
    controller: {
      updateDraft(key, value) {
        state = {
          ...state,
          detected: { ...state.detected },
          draft: { ...state.draft, [key]: Number(value) }
        };
        view.render(state);
      },
      commitDraft() {
        commits += 1;
      }
    }
  });
  view.render(state);
  const originalWaveform = elements.workMusicAnalysisMarkers.children[0];
  const start = elements.workMusicDrumStart;
  start.listeners.input({ target: { value: '25' } });
  assert.equal(elements.workMusicDrumLane.style['--drum-start'], '25%');
  assert.equal(elements.workMusicDrumLane.style['--drum-end'], '90%');
  assert.equal(start['aria-valuetext'], '0:25');
  assert.equal(elements.workMusicAnalysisMarkers.children[0], originalWaveform);
  assert.equal(commits, 0);
  elements.workMusicDrumEnd.listeners.input({ target: { value: '80' } });
  assert.equal(elements.workMusicDrumLane.style['--drum-end'], '80%');
  start.listeners.change();
  assert.equal(commits, 1);
  view.render({ ...state, draft: { drumStart: 10, drumEnd: 90 } });
  assert.equal(elements.workMusicDrumLane.style['--drum-start'], '10%');
  view.render({ videoId: 'b' });
  assert.equal(elements.workMusicDrumLane.dataset.editable, 'false');
  assert.equal(start.disabled, true);
});

test('timeline renders actual waveform and tentative sections, not beat markers; legacy results request reanalysis', () => {
  const element = () => ({
    style: {},
    children: [],
    appendChild(child) {
      this.children.push(child);
    }
  });
  const lane = {
    ...element(),
    dataset: {},
    replaceChildren() {
      this.children = [];
    }
  };
  lane.style.setProperty = () => {};
  const elements = {
    workMusicAnalysisPanel: { dataset: {} },
    workMusicAnalysisMarkers: lane,
    workMusicAnalysisStructure: {}
  };
  const view = createWorkMusicAnalysisView({
    root: {
      getElementById: (id) => elements[id],
      createElement: element,
      createDocumentFragment: element
    },
    controller: {}
  });
  const detected = {
    durationSeconds: 100,
    waveform: [0, 0.5, 1],
    beats: [1, 2],
    bars: [1],
    sections: [
      { start: 0, end: 10, label: 'intro', confidence: 0.7 },
      { start: 30, end: 50, label: 'chorus_candidate', confidence: 0.6 }
    ]
  };
  view.render({ videoId: 'a', detected, phase: 'succeeded' });
  const children = lane.children[0].children;
  assert.equal(
    children.filter((child) => child.className === 'workmusic-waveform-sample').length,
    3
  );
  assert.equal(children.filter((child) => child.className?.includes('marker')).length, 0);
  assert.equal(children[1].textContent, '후렴 후보');
  assert.equal(children[1].style.left, '30%');
  assert.equal(children[1].style.width, '20%');
  const head = children.at(-1);
  assert.equal(head.hidden, true);
  view.renderPlayback({ videoId: 'a', currentTime: 20, duration: 100 });
  assert.equal(head.hidden, false);
  view.render({ videoId: 'a', detected, phase: 'succeeded' });
  assert.equal(lane.children[0].children.at(-1), head);
  view.render({ videoId: 'b', detected: { durationSeconds: 100 }, phase: 'succeeded' });
  assert.match(lane.children[0].children[0].textContent, /다시 분석/);
  assert.equal(lane.children[0].children.at(-1).hidden, true);
});

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
