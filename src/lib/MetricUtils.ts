export type KeystrokeRecord = {
  key: string;
  timestamp: number;
  correct: boolean;
};

export type SessionMetrics = {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  totalKeys: number;
  correctKeys: number;
  errors: number;
  durationSeconds: number;
  wpmOverTime: number[];
  keyErrors: Map<string, number>;
};

export function computeWpm(keystrokes: KeystrokeRecord[], durationMs: number): number {
  if (durationMs <= 0) return 0;
  const correctChars = keystrokes.filter((k) => k.correct).length;
  const words = correctChars / 5;
  return (words / durationMs) * 60000;
}

export function computeRawWpm(keystrokes: KeystrokeRecord[], durationMs: number): number {
  if (durationMs <= 0) return 0;
  const totalChars = keystrokes.length;
  const words = totalChars / 5;
  return (words / durationMs) * 60000;
}

export function computeAccuracy(keystrokes: KeystrokeRecord[]): number {
  if (keystrokes.length === 0) return 100;
  const correct = keystrokes.filter((k) => k.correct).length;
  return (correct / keystrokes.length) * 100;
}

export function computeConsistency(
  keystrokes: KeystrokeRecord[],
  windowSeconds: number = 10
): number {
  if (keystrokes.length < 2) return 100;
  const sorted = [...keystrokes].sort((a, b) => a.timestamp - b.timestamp);
  const start = sorted[0].timestamp;
  const windowMs = windowSeconds * 1000;
  const samples: number[] = [];
  let windowStart = start;
  while (windowStart < sorted[sorted.length - 1].timestamp) {
    const windowEnd = windowStart + windowMs;
    const inWindow = sorted.filter(
      (k) => k.timestamp >= windowStart && k.timestamp < windowEnd && k.correct
    );
    const wpm = computeWpm(inWindow, windowMs);
    if (inWindow.length > 0) samples.push(wpm);
    windowStart = windowEnd;
  }
  if (samples.length < 2) return 100;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance =
    samples.reduce((acc, s) => acc + (s - mean) ** 2, 0) / (samples.length - 1);
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
  return Math.max(0, 100 - cv);
}

export function computeSessionMetrics(
  keystrokes: KeystrokeRecord[],
  startTime: number,
  endTime: number
): SessionMetrics {
  const durationMs = Math.max(1, endTime - startTime);
  const durationSeconds = durationMs / 1000;
  const correctKeys = keystrokes.filter((k) => k.correct).length;
  const errors = keystrokes.filter((k) => !k.correct).length;

  const wpmOverTime: number[] = [];
  const bucketSeconds = 5;
  for (let t = 0; t < durationSeconds; t += bucketSeconds) {
    const bucketStart = startTime + t * 1000;
    const bucketEnd = startTime + (t + bucketSeconds) * 1000;
    const inBucket = keystrokes.filter(
      (k) => k.timestamp >= bucketStart && k.timestamp < bucketEnd
    );
    wpmOverTime.push(computeWpm(inBucket, bucketSeconds * 1000));
  }
  if (wpmOverTime.length === 0) wpmOverTime.push(0);

  const keyErrors = new Map<string, number>();
  keystrokes.forEach((k) => {
    if (!k.correct) {
      const key = k.key === " " ? "Space" : k.key;
      keyErrors.set(key, (keyErrors.get(key) ?? 0) + 1);
    }
  });

  return {
    wpm: Math.round(computeWpm(keystrokes, durationMs)),
    rawWpm: Math.round(computeRawWpm(keystrokes, durationMs)),
    accuracy: Math.round(computeAccuracy(keystrokes) * 10) / 10,
    consistency: Math.round(computeConsistency(keystrokes) * 10) / 10,
    totalKeys: keystrokes.length,
    correctKeys,
    errors,
    durationSeconds,
    wpmOverTime,
    keyErrors,
  };
}
