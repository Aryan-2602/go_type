import {
  createSignal,
  createMemo,
  onMount,
  onCleanup,
  Show,
} from "solid-js";
import { animate } from "motion";
import { ASMRManagerProvider, useAudioEngine } from "./components/ASMRManager";
import { TypingArea } from "./components/TypingArea";
import { StatsGrid, ResultsGrid } from "./components/StatsGrid";
import {
  computeWpm,
  computeRawWpm,
  computeAccuracy,
  computeSessionMetrics,
} from "./lib/MetricUtils";
import type { KeystrokeRecord } from "./lib/MetricUtils";
import type { TypingPhase } from "./components/TypingArea";
import type { KeySoundProfile } from "./lib/AudioEngine";
import type { AmbientType } from "./lib/AmbientEngine";

function AppContent() {
  const asmr = useAudioEngine();
  const engine = asmr?.engine;
  const [phase, setPhase] = createSignal<TypingPhase>("idle");
  const [liveKeystrokes, setLiveKeystrokes] = createSignal<KeystrokeRecord[]>([]);
  const [liveStartTime, setLiveStartTime] = createSignal<number | null>(null);
  const [finalMetrics, setFinalMetrics] = createSignal<ReturnType<typeof computeSessionMetrics> | null>(null);
  const [now, setNow] = createSignal(Date.now());
  const [stopOnError, setStopOnError] = createSignal(false);
  const [freedomMode, setFreedomMode] = createSignal(true);
  const [soundEnabled, setSoundEnabled] = createSignal(true);
  const [celebrate, setCelebrate] = createSignal(false);
  const [restartKey, setRestartKey] = createSignal(0);

  const durationMs = createMemo(() => {
    const start = liveStartTime();
    if (phase() !== "active" || !start) return 0;
    return now() - start;
  });

  const liveWpm = createMemo(() =>
    Math.round(computeWpm(liveKeystrokes(), durationMs() || 1))
  );
  const liveRawWpm = createMemo(() =>
    Math.round(computeRawWpm(liveKeystrokes(), durationMs() || 1))
  );
  const liveAccuracy = createMemo(() =>
    Math.round(computeAccuracy(liveKeystrokes()) * 10) / 10
  );
  const elapsedSeconds = createMemo(() =>
    durationMs() > 0 ? durationMs() / 1000 : 0
  );

  onMount(() => {
    const id = setInterval(() => {
      if (phase() === "active") setNow(Date.now());
    }, 200);
    onCleanup(() => clearInterval(id));
  });

  createMemo(() => {
    const en = soundEnabled();
    engine?.setEnabled(en);
  });

  const handleFinish = (state: import("./components/TypingArea").TypingState) => {
    const start = state.startTime ?? 0;
    const end = state.endTime ?? start;
    const metrics = computeSessionMetrics(state.keystrokes, start, end);
    setFinalMetrics(metrics);
    const isPerfect = metrics.accuracy >= 99.9 && metrics.errors === 0;
    if (isPerfect) {
      setCelebrate(true);
      const el = document.getElementById("practice-area");
      if (el) {
        animate(el, { x: [0, -4, 4, -3, 3, 0] }, { duration: 0.4 });
      }
      setTimeout(() => setCelebrate(false), 500);
    }
  };

  const handleErrorShake = () => {
    const el = document.getElementById("practice-area");
    if (el) animate(el, { x: [0, -3, 3, -2, 2, 0] }, { duration: 0.18 });
  };

  const handleRestart = () => {
    setFinalMetrics(null);
    setPhase("idle");
    setLiveKeystrokes([]);
    setLiveStartTime(null);
    setNow(Date.now());
    setRestartKey((k) => k + 1);
  };

  return (
    <div class="min-h-full bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 md:p-10">
      <div class="w-full max-w-3xl space-y-8">
        <header class="text-center">
          <h1 class="font-mono text-2xl font-medium tracking-tight text-zinc-100">
            go_type
          </h1>
          <p class="text-zinc-500 text-sm mt-1">Zero-latency typing</p>
        </header>

        <div class="flex flex-wrap gap-4 justify-center items-center">
          <label class="flex items-center gap-2 text-zinc-400 text-sm font-mono cursor-pointer">
            <input
              type="checkbox"
              checked={stopOnError()}
              onInput={(e) => setStopOnError((e.target as HTMLInputElement).checked)}
              class="rounded border-zinc-600 bg-zinc-900"
            />
            Stop on error
          </label>
          <label class="flex items-center gap-2 text-zinc-400 text-sm font-mono cursor-pointer">
            <input
              type="checkbox"
              checked={freedomMode()}
              onInput={(e) => setFreedomMode((e.target as HTMLInputElement).checked)}
              class="rounded border-zinc-600 bg-zinc-900"
            />
            Freedom mode (backspace)
          </label>
          <label class="flex items-center gap-2 text-zinc-400 text-sm font-mono cursor-pointer">
            <input
              type="checkbox"
              checked={soundEnabled()}
              onInput={(e) => setSoundEnabled((e.target as HTMLInputElement).checked)}
              class="rounded border-zinc-600 bg-zinc-900"
            />
            Sound
          </label>
          {asmr && (
            <span class="flex items-center gap-2 text-zinc-400 text-sm font-mono">
              Key sound:
              <select
                value={asmr.profile()}
                onChange={(e) => asmr.setProfile((e.target as HTMLSelectElement).value as KeySoundProfile)}
                class="rounded border border-zinc-600 bg-zinc-900 text-zinc-300 px-2 py-1 cursor-pointer"
              >
                <option value="Clicky">Clicky</option>
                <option value="Tactile">Tactile</option>
                <option value="Linear">Linear</option>
              </select>
            </span>
          )}
          {asmr && (
            <>
              <label class="flex items-center gap-2 text-zinc-400 text-sm font-mono cursor-pointer">
                <input
                  type="checkbox"
                  checked={asmr.ambientType() !== null}
                  onInput={(e) => {
                    if ((e.target as HTMLInputElement).checked) asmr.setAmbientType("White Noise");
                    else asmr.setAmbientType(null);
                  }}
                  class="rounded border-zinc-600 bg-zinc-900"
                />
                Ambient
              </label>
              {asmr.ambientType() !== null && (
                <>
                  <span class="flex items-center gap-2 text-zinc-400 text-sm font-mono">
                    <select
                      value={asmr.ambientType() ?? "White Noise"}
                      onChange={(e) => asmr.setAmbientType((e.target as HTMLSelectElement).value as NonNullable<AmbientType>)}
                      class="rounded border border-zinc-600 bg-zinc-900 text-zinc-300 px-2 py-1 cursor-pointer"
                    >
                      <option value="Rain">Rain</option>
                      <option value="Cafe">Cafe</option>
                      <option value="White Noise">White Noise</option>
                    </select>
                  </span>
                  <span class="flex items-center gap-2 text-zinc-400 text-sm font-mono">
                    Ambient vol:
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(asmr.ambientVolume() * 100)}
                      onInput={(e) => asmr.setAmbientVolume(Number((e.target as HTMLInputElement).value) / 100)}
                      class="w-20 accent-amber-500"
                    />
                  </span>
                </>
              )}
            </>
          )}
        </div>

        <Show
          when={finalMetrics() === null}
          fallback={
            <div class="rounded-2xl bg-white/5 border border-white/10 shadow-glass p-6 md:p-8">
              <ResultsGrid
                metrics={finalMetrics()!}
                onRestart={handleRestart}
              />
            </div>
          }
        >
          <div
            id="practice-area"
            class="rounded-2xl bg-white/5 border border-white/10 shadow-glass p-6 md:p-8 transition-transform"
            classList={{ "ring-2 ring-amber-400/30": celebrate() }}
          >
            <div class="flex justify-center mb-6">
              <StatsGrid
                wpm={liveWpm()}
                rawWpm={liveRawWpm()}
                accuracy={liveAccuracy()}
                elapsedSeconds={elapsedSeconds()}
              />
            </div>
            <TypingArea
              resetTrigger={restartKey()}
              stopOnError={stopOnError()}
              freedomMode={freedomMode()}
              onPhaseChange={setPhase}
              onStateChange={({ keystrokes, startTime }) => {
                setLiveKeystrokes(keystrokes);
                setLiveStartTime(startTime);
              }}
              onFinish={handleFinish}
              onError={handleErrorShake}
            />
            <p class="text-zinc-600 text-xs font-mono mt-4 text-center">
              Focus the area and start typing. No input field—direct key events.
            </p>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ASMRManagerProvider>
      <AppContent />
    </ASMRManagerProvider>
  );
}
