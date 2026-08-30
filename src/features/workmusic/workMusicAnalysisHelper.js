export function normalizeAnalysisRange(value, durationSeconds = 0) {
  const start = Number(value?.drumStart);
  const end = Number(value?.drumEnd);
  const duration = Number(durationSeconds || 0);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) return null;
  if (duration > 0 && end > duration + 0.01) return null;
  return { drumStart: start, drumEnd: end };
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
