export function normalizeAnalysisRange(value, durationSeconds = 0) {
  const start = Number(value?.drumStart);
  const end = Number(value?.drumEnd);
  const duration = Number(durationSeconds || 0);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) return null;
  if (duration > 0 && end > duration + 0.01) return null;
  const range = { drumStart: start, drumEnd: end };
  const verseEnd = Number(value?.verseEnd);
  if (value?.verseEnd != null && Number.isFinite(verseEnd))
    range.verseEnd = Math.max(start, Math.min(end, verseEnd));
  return range;
}

export function isCurrentAnalysis(result) {
  const version = String(result?.analyzerVersion || '')
    .split('.')
    .map(Number);
  return (
    (version[0] > 0 || (version[0] === 0 && version[1] >= 3)) &&
    result?.structureVersion === '1.0' &&
    Number(result.durationSeconds) > 0 &&
    Array.isArray(result.waveform) &&
    result.waveform.length > 0 &&
    result.waveform.length <= 1000 &&
    result.waveform.every((value) => Number.isFinite(value) && value >= 0 && value <= 1) &&
    Array.isArray(result.sections) &&
    result.sections.every(
      (section) =>
        Number.isFinite(section.start) &&
        Number.isFinite(section.end) &&
        section.start >= 0 &&
        section.end > section.start &&
        section.end <= result.durationSeconds + 0.01
    )
  );
}

export function suggestVerseEnd(result, range) {
  if (!range) return null;
  const { drumStart: start, drumEnd: end } = range;
  const sections = (result?.sections || []).filter(
    (s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start
  );
  const choruses = [];
  for (const section of sections
    .filter((s) => s.label === 'chorus_candidate')
    .sort((a, b) => a.start - b.start)) {
    const previous = choruses.at(-1);
    if (previous && section.start <= previous.end + 2)
      previous.end = Math.max(previous.end, section.end);
    else choruses.push({ start: section.start, end: section.end });
  }
  const introEnd = Math.max(0, ...sections.filter((s) => s.label === 'intro').map((s) => s.end));
  const opening = Math.max(start, introEnd);
  const first = choruses[0];
  const chorusOpening = first && first.start <= opening + 8;
  const selected = chorusOpening ? choruses[1] : first;
  const value = selected?.end ?? (start + end) / 2;
  return {
    value: Math.max(start, Math.min(end, value)),
    reason: selected
      ? chorusOpening
        ? '두 번째 후렴 끝 추정'
        : '첫 번째 후렴 끝 추정'
      : '후렴 불확실 · 임시 중앙 위치'
  };
}

// Only the unselected tail/head may overlap. Unknown boundaries never authorize a fade.
export function calculateDjTransitionPlan({
  currentSong,
  nextSong,
  duration,
  detectedByVideoId,
  maximumFadeSeconds = 10,
  currentTime = 0
} = {}) {
  const seconds = Number(duration);
  const rangeFor = (song, songDuration) =>
    normalizeAnalysisRange(song?.mediaAnalysisManual, songDuration) ||
    normalizeAnalysisRange(detectedByVideoId?.get?.(song?.videoId), songDuration);
  const current = rangeFor(currentSong, seconds);
  const next = rangeFor(nextSong, nextSong?.durationSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0 || !current || !next)
    return {
      mode: 'sequential',
      triggerAtSeconds: seconds || 0,
      nextStartSeconds: 0,
      crossfadeSeconds: 0
    };
  const remaining = Math.max(0, seconds - Math.max(current.drumEnd, Number(currentTime) || 0));
  const fade = Math.max(0, Math.min(remaining, next.drumStart, Number(maximumFadeSeconds) || 0));
  return {
    mode: 'dj',
    triggerAtSeconds: current.drumEnd,
    nextStartSeconds: next.drumStart - fade,
    nextGreenStart: next.drumStart,
    crossfadeSeconds: fade
  };
}

export function calculateSmartTransitionPlan({
  currentSong,
  nextSong,
  detectedByVideoId,
  fixedOverlapSeconds = 0,
  minimumConfidence = 0.5
} = {}) {
  const fixed = {
    mode: 'fixed',
    overlapSeconds: Math.max(0, Number(fixedOverlapSeconds || 0))
  };
  const currentManual = normalizeAnalysisRange(
    currentSong?.mediaAnalysisManual,
    currentSong?.durationSeconds
  );
  const nextManual = normalizeAnalysisRange(
    nextSong?.mediaAnalysisManual,
    nextSong?.durationSeconds
  );
  if (currentManual && nextManual) {
    return {
      mode: 'smart',
      source: 'manual',
      startNextAtSeconds: Math.max(0, currentManual.drumEnd - nextManual.drumStart)
    };
  }

  const currentDetected = detectedByVideoId?.get?.(currentSong?.videoId);
  const nextDetected = detectedByVideoId?.get?.(nextSong?.videoId);
  const currentAutomatic = normalizeAnalysisRange(
    currentDetected,
    currentDetected?.durationSeconds
  );
  const nextAutomatic = normalizeAnalysisRange(nextDetected, nextDetected?.durationSeconds);
  if (
    currentAutomatic &&
    nextAutomatic &&
    Number(currentDetected?.confidence || 0) >= minimumConfidence &&
    Number(nextDetected?.confidence || 0) >= minimumConfidence
  ) {
    return {
      mode: 'smart',
      source: 'detected',
      startNextAtSeconds: Math.max(0, currentAutomatic.drumEnd - nextAutomatic.drumStart)
    };
  }
  return fixed;
}
