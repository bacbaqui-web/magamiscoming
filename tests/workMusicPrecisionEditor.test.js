import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkMusicPrecisionEditor } from '../src/features/workmusic/workMusicPrecisionEditor.js';

function setup() {
  const element = () => ({
    listeners: {},
    children: [],
    dataset: {},
    hidden: true,
    style: {
      setProperty(key, value) {
        this[key] = value;
      }
    },
    addEventListener(name, fn) {
      (this.listeners[name] ||= new Set()).add(fn);
    },
    removeEventListener(name, fn) {
      this.listeners[name]?.delete(fn);
    },
    fire(name, event = {}) {
      for (const fn of this.listeners[name] || []) fn(event);
    },
    appendChild(child) {
      this.children.push(child);
    },
    replaceChildren() {
      this.children = [];
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    focus() {
      this.focused = true;
    }
  });
  const elements = Object.fromEntries(
    ['Panel', 'Waveform', 'Range', 'Label', 'Close'].map((name) => [
      `workMusicPrecision${name}`,
      element()
    ])
  );
  elements.workMusicDrumLane = element();
  const root = {
    ...element(),
    getElementById: (id) => elements[id],
    createElement: element,
    createDocumentFragment: element,
    defaultView: element()
  };
  const inputs = { drumStart: element(), drumEnd: element(), verseEnd: element() };
  const pending = new Map();
  let now = 0;
  let id = 0;
  let commits = 0;
  let state = {
    videoId: 'a',
    detected: { durationSeconds: 100, waveform: Array(100).fill(0.5) },
    draft: { drumStart: 10, drumEnd: 90, verseEnd: 50 }
  };
  const editor = createWorkMusicPrecisionEditor({
    root,
    inputs,
    timers: {
      setTimeout(fn, delay) {
        pending.set(++id, { fn, at: now + delay });
        return id;
      },
      clearTimeout(key) {
        pending.delete(key);
      }
    },
    controller: {
      updateDraft(key, value) {
        state = { ...state, draft: { ...state.draft, [key]: Number(value) } };
        editor.render(state);
      },
      commitDraft() {
        commits++;
      }
    }
  });
  editor.render(state);
  return {
    root,
    inputs,
    elements,
    pending,
    editor,
    state: () => state,
    commits: () => commits,
    advance(ms) {
      now += ms;
      for (const [key, item] of pending)
        if (item.at <= now) {
          pending.delete(key);
          item.fn();
        }
    }
  };
}

test('pointerdown opens immediately without a position jump; detailed range saves precisely', () => {
  const f = setup();
  f.inputs.verseEnd.fire('pointerdown', { button: 0, clientX: 100, clientY: 20 });
  const range = f.elements.workMusicPrecisionRange;
  assert.equal(f.elements.workMusicPrecisionPanel.hidden, false);
  assert.ok(f.elements.workMusicDrumLane.children.includes(f.elements.workMusicPrecisionPanel));
  assert.equal(range.min, '40');
  assert.equal(range.max, '60');
  assert.equal(range.value, '50');
  assert.equal(f.state().draft.verseEnd, 50);
  f.root.fire('pointerup');
  assert.equal(f.pending.size, 0);
  assert.equal(f.elements.workMusicPrecisionPanel.hidden, true);
  f.inputs.verseEnd.fire('keydown', { key: 'Enter' });
  assert.equal(f.elements.workMusicPrecisionPanel.hidden, false);
  range.value = '50.01';
  range.fire('input');
  assert.equal(f.state().draft.verseEnd, 50.01);
  assert.equal(f.commits(), 0);
  range.fire('change');
  assert.equal(f.commits(), 1);
  f.root.fire('keydown', { key: 'Escape' });
  assert.equal(f.elements.workMusicPrecisionPanel.hidden, true);
  assert.equal(f.inputs.verseEnd.focused, true);
});

test('release/cancel/blur and song change restore the full waveform', () => {
  for (const stop of ['pointerup', 'pointercancel', 'blur', 'song']) {
    const f = setup();
    f.inputs.drumStart.fire('pointerdown', { button: 0, clientX: 0, clientY: 0 });
    f.advance(2900);
    if (stop === 'blur') f.root.defaultView.fire('blur');
    else if (stop === 'song') f.editor.render({ ...f.state(), videoId: 'b' });
    else f.root.fire(stop);
    f.advance(100);
    assert.equal(f.pending.size, 0);
    assert.equal(f.elements.workMusicPrecisionPanel.hidden, true, stop);
    const original = f.state().draft.drumStart;
    f.root.fire('pointermove', { clientX: 300 });
    assert.equal(f.state().draft.drumStart, original);
  }
});

test('original handle drag uses the zoomed scale and commits once on release', () => {
  const f = setup();
  f.inputs.verseEnd.fire('pointerdown', { button: 0, clientX: 100 });
  f.root.fire('pointermove', { clientX: 140 });
  assert.equal(f.state().draft.verseEnd, 51);
  assert.equal(f.state().draft.drumStart, 10);
  f.root.fire('pointerup');
  assert.equal(f.commits(), 1);
  assert.equal(f.elements.workMusicPrecisionPanel.hidden, true);
  assert.equal(f.elements.workMusicPrecisionWaveform.children.length, 1);
  assert.equal(f.elements.workMusicPrecisionWaveform.children[0].children.length, 2);
});

test('zoom window clamps to song ends and closes on song switch', () => {
  const f = setup();
  f.editor.render({ ...f.state(), draft: { drumStart: 1, drumEnd: 99, verseEnd: 50 } });
  f.inputs.drumStart.fire('pointerdown', { button: 0, clientX: 0, clientY: 0 });
  f.advance(3000);
  assert.equal(f.elements.workMusicPrecisionRange.min, '0');
  assert.equal(f.elements.workMusicPrecisionRange.max, '20');
  assert.equal(f.elements.workMusicPrecisionRange.value, '1');
  f.editor.render({ ...f.state(), videoId: 'b' });
  assert.equal(f.elements.workMusicPrecisionPanel.hidden, true);
  assert.equal(f.pending.size, 0);
});
