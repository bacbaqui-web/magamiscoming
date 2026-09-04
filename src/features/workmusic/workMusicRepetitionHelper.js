// Envelope recurrence is a fallback candidate, not a semantic chorus classification.
const cache = new WeakMap();

export function findWaveformRepetitions(result) {
  if (!result || typeof result !== 'object') return [];
  if (cache.has(result)) return cache.get(result);
  const samples = result.waveform || [];
  const duration = Number(result.durationSeconds);
  if (samples.length < 24 || !(duration > 24)) return [];
  const count = Math.min(600, Math.floor(duration), samples.length);
  const values = Array.from({ length: count }, (_, i) => {
    const slice = samples.slice(
      Math.floor((i * samples.length) / count),
      Math.floor(((i + 1) * samples.length) / count)
    );
    return slice.reduce((sum, n) => sum + Number(n || 0), 0) / slice.length;
  });
  const step = duration / count;
  const width = Math.max(6, Math.round(12 / step));
  const separation = Math.max(width * 2, Math.round(24 / step));
  const median = [...values].sort((a, b) => a - b)[Math.floor(count / 2)];
  const windows = [];
  for (let i = 0; i <= count - width; i++) {
    const part = values.slice(i, i + width);
    const mean = part.reduce((a, b) => a + b, 0) / width;
    const centered = part.map((n) => n - mean);
    const norm = Math.hypot(...centered);
    windows.push({ mean, norm, centered });
  }
  const repeated = Array(count).fill(false);
  for (let i = 0; i < windows.length; i++) {
    const a = windows[i];
    if (a.norm / Math.sqrt(width) < 0.025 || a.mean < median * 0.95) continue;
    for (let j = i + separation; j < windows.length; j++) {
      const b = windows[j];
      if (b.norm / Math.sqrt(width) < 0.025 || b.mean < median * 0.95) continue;
      const similarity =
        a.centered.reduce((sum, n, k) => sum + n * b.centered[k], 0) / (a.norm * b.norm);
      if (similarity < 0.87 || Math.min(a.mean, b.mean) / Math.max(a.mean, b.mean) < 0.65) continue;
      for (let k = 0; k < width; k++) repeated[i + k] = repeated[j + k] = true;
    }
  }
  const sections = [];
  if (repeated.filter(Boolean).length / count < 0.7) {
    for (let i = 0; i < count; i++) {
      if (!repeated[i]) continue;
      let start = i;
      while (i + 1 < count && repeated[i + 1]) i++;
      let end = i + 1;
      const peak = Math.max(...values.slice(start, end));
      const edgeGate = median + Math.max(0, peak - median) * 0.25;
      while (start < end && values[start] < edgeGate) start++;
      while (end > start && values[end - 1] < edgeGate) end--;
      if ((end - start) * step >= 8)
        sections.push({
          start: start * step,
          end: Math.min(duration, end * step),
          label: 'chorus_candidate',
          confidence: 0.4
        });
    }
  }
  cache.set(result, sections);
  return sections;
}
