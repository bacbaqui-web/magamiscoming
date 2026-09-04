import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkMusicPrecisionEditor } from '../src/features/workmusic/workMusicPrecisionEditor.js';

const flush = () => new Promise((r) => setImmediate(r));
function setup(getWaveform) {
  const el = () => ({
    hidden: true,
    dataset: {},
    children: [],
    listeners: {},
    style: {
      setProperty(k, v) {
        this[k] = v;
      }
    },
    addEventListener(k, f) {
      this.listeners[k] = f;
    },
    fire(k, e = {}) {
      this.listeners[k]?.(e);
    },
    appendChild(n) {
      this.children.push(n);
    },
    replaceChildren() {
      this.children = [];
    },
    setAttribute(k, v) {
      this[k] = v;
    },
    getBoundingClientRect: () => ({ left: 0, width: 800, top: 0, bottom: 200 })
  });
  const ids = [
    'DrumLane',
    'PrecisionPanel',
    'PrecisionWaveform',
    'PrecisionLabel',
    'ZoomLabel',
    'ZoomIn',
    'ZoomOut',
    'ZoomReset',
    'ZoomLeft',
    'ZoomRight',
    'SeekRange',
    'PlaybackLine',
    'DrumStartTime',
    'DrumEndTime',
    'VerseEndTime'
  ];
  const elements = Object.fromEntries(ids.map((id) => [`workMusic${id}`, el()]));
  const root = { getElementById: (id) => elements[id], createElement: el };
  const inputs = { drumStart: el(), drumEnd: el(), verseEnd: el() };
  const timers = new Map();
  let timerId = 0;
  const calls = [];
  const seeks = [];
  const editor = createWorkMusicPrecisionEditor({
    root,
    inputs,
    onSeek: (seconds) => seeks.push(seconds),
    timers: {
      setTimeout(f) {
        timers.set(++timerId, f);
        return timerId;
      },
      clearTimeout(id) {
        timers.delete(id);
      }
    },
    controller: {
      getWaveform: async (id, options) => {
        calls.push({ id, ...options });
        if (getWaveform) return getWaveform(id, options);
        return {
          videoId: id,
          startSeconds: options.start,
          endSeconds: options.end,
          resolutionSeconds: (options.end - options.start) / options.pixels,
          min: Array(options.pixels).fill(-0.5),
          max: Array(options.pixels).fill(0.75)
        };
      }
    }
  });
  const state = {
    videoId: 'a',
    detected: { durationSeconds: 100, waveformDetailVersion: '1.0' },
    draft: { drumStart: 10, drumEnd: 90, verseEnd: 50 }
  };
  editor.render(state);
  return {
    inputs,
    elements,
    seeks,
    editor,
    state,
    calls,
    click: (key) => elements[`workMusicZoom${key}`].fire('click'),
    async request() {
      for (const [id, fn] of timers) {
        timers.delete(id);
        void fn();
      }
      await flush();
    }
  };
}

test('buttons change viewport; clicking and releasing handles never changes zoom', async () => {
  const f = setup();
  await f.request();
  f.inputs.verseEnd.fire('pointerdown');
  f.inputs.verseEnd.fire('pointerup');
  assert.match(f.elements.workMusicZoomLabel.textContent, /^1×/);
  f.click('In');
  await f.request();
  assert.equal(f.inputs.verseEnd.min, '25');
  assert.equal(f.inputs.verseEnd.max, '75');
  assert.equal(f.inputs.drumStart.style.visibility, 'hidden');
  f.inputs.verseEnd.fire('pointerup');
  assert.match(f.elements.workMusicZoomLabel.textContent, /^2×/);
  assert.equal(f.calls.at(-1).start, 25);
  assert.equal(f.calls.at(-1).pixels, 800);
  assert.equal(f.elements.workMusicPrecisionWaveform.children[0].children[0].d.includes('L'), true);
  f.click('Reset');
  await f.request();
  assert.equal(f.inputs.drumStart.style.visibility, '');
  assert.equal(f.inputs.verseEnd.min, '0');
  assert.equal(f.inputs.verseEnd.max, '100');
});

test('waveform click and slider seek use viewport seconds; middle drag pans without seeking', async () => {
  const f = setup();
  await f.request();
  const lane = f.elements.workMusicDrumLane,
    seek = f.elements.workMusicSeekRange;
  lane.fire('click', { button: 0, clientX: 200, clientY: 100 });
  assert.equal(f.seeks.at(-1), 25);
  assert.equal(seek.value, '25');
  f.click('In');
  lane.fire('click', { button: 0, clientX: 200, clientY: 100 });
  assert.equal(f.seeks.at(-1), 37.5);
  seek.value = '42';
  seek.fire('input');
  assert.equal(f.seeks.at(-1), 42);
  assert.equal(f.elements.workMusicPlaybackLine.style.left, '34%');
  lane.fire('pointerdown', { button: 1, pointerId: 1, clientX: 400, preventDefault() {} });
  lane.fire('pointermove', { pointerId: 1, clientX: 560 });
  lane.fire('pointerup');
  assert.equal(seek.min, '15');
  assert.equal(f.seeks.length, 3);
  lane.fire('keydown', { key: 'Escape' });
  assert.equal(seek.min, '0');
  assert.equal(seek.max, '100');
});

test('time captions follow edits, avoid overlap and hide outside zoom', async () => {
  const f = setup();
  await f.request();
  const start = f.elements.workMusicDrumStartTime;
  const verse = f.elements.workMusicVerseEndTime;
  assert.equal(start.textContent, '인트로 끝 0:10.00');
  const previous = start.style.left;
  f.editor.render({ ...f.state, draft: { drumStart: 49, verseEnd: 50, drumEnd: 51 } });
  assert.notEqual(start.style.left, previous);
  assert.notEqual(start.style.top, verse.style.top);
  f.editor.render(f.state);
  f.click('In');
  assert.equal(start.hidden, true);
  assert.equal(verse.hidden, false);
  assert.equal(f.elements.workMusicPrecisionLabel.hidden, true);
});

test('wheel preserves mouse anchor, debounces requests and pan is bounded', async () => {
  const f = setup();
  await f.request();
  let prevented = false;
  f.elements.workMusicDrumLane.fire('wheel', {
    clientX: 200,
    deltaY: -1,
    preventDefault() {
      prevented = true;
    }
  });
  assert.equal(prevented, true);
  assert.equal(Number(f.inputs.verseEnd.min), 12.5);
  f.elements.workMusicDrumLane.fire('wheel', { clientX: 200, deltaY: -1, preventDefault() {} });
  await f.request();
  assert.equal(f.calls.length, 2);
  assert.ok(Math.abs(f.calls[1].start + (f.calls[1].end - f.calls[1].start) / 4 - 25) < 1e-6);
  for (let i = 0; i < 10; i++) f.click('Right');
  await f.request();
  assert.equal(Number(f.inputs.verseEnd.max), 100);
});

test('stale waveform responses cannot replace a new song', async () => {
  let resolve;
  const f = setup(
    (id, o) =>
      new Promise((r) => {
        resolve = () =>
          r({
            videoId: id,
            startSeconds: o.start,
            endSeconds: o.end,
            resolutionSeconds: 100,
            min: [-1],
            max: [1]
          });
      })
  );
  await f.request();
  const old = resolve;
  f.editor.render({ ...f.state, videoId: 'b' });
  old();
  await flush();
  assert.equal(f.elements.workMusicPrecisionWaveform.children.length, 0);
  await f.request();
  resolve();
  await flush();
  assert.equal(f.elements.workMusicPrecisionWaveform.children.length, 1);
});

test('missing detail shows reanalysis message and never stretches summary into detail', async () => {
  const f = setup(async () => {
    throw Object.assign(new Error('missing'), { status: 404 });
  });
  f.click('In');
  await f.request();
  assert.match(f.elements.workMusicPrecisionLabel.textContent, /고해상도 파형 없음/);
  assert.equal(f.elements.workMusicPrecisionWaveform.children.length, 0);
  f.editor.render({ ...f.state, videoId: 'b', detected: null, draft: null });
  assert.equal(f.elements.workMusicPrecisionPanel.hidden, true);
});
