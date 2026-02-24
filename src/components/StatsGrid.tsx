import { createMemo, For } from "solid-js";
import type { SessionMetrics } from "../lib/MetricUtils";

type Props = {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  elapsedSeconds: number;
};

export function StatsGrid(props: Props) {
  return (
    <div class="flex gap-6 text-zinc-400 font-mono text-sm">
      <div class="flex items-baseline gap-2">
        <span class="text-zinc-500 uppercase tracking-wider">WPM</span>
        <span class="text-xl text-zinc-200 tabular-nums">{props.wpm}</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-zinc-500 uppercase tracking-wider">Raw</span>
        <span class="text-lg text-zinc-300 tabular-nums">{props.rawWpm}</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-zinc-500 uppercase tracking-wider">Acc</span>
        <span class="text-lg text-zinc-300 tabular-nums">{props.accuracy}%</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-zinc-500 uppercase tracking-wider">Time</span>
        <span class="text-lg text-zinc-300 tabular-nums">
          {Math.floor(props.elapsedSeconds)}s
        </span>
      </div>
    </div>
  );
}

type ResultsProps = {
  metrics: SessionMetrics;
  onRestart: () => void;
};

const HEATMAP_KEYS = [
  "a","b","c","d","e","f","g","h","i","j","k","l","m",
  "n","o","p","q","r","s","t","u","v","w","x","y","z",
  "Space", ".", ",", "'", "-", ";",
];

export function ResultsGrid(props: ResultsProps) {
  const maxErrors = createMemo(() => {
    let m = 0;
    props.metrics.keyErrors.forEach((v) => { if (v > m) m = v; });
    return m || 1;
  });

  return (
    <div class="space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="rounded-xl bg-white/5 border border-white/10 p-4 shadow-glass-sm">
          <div class="text-zinc-500 text-xs uppercase tracking-wider mb-1">WPM</div>
          <div class="text-3xl font-mono text-zinc-100 tabular-nums">{props.metrics.wpm}</div>
        </div>
        <div class="rounded-xl bg-white/5 border border-white/10 p-4 shadow-glass-sm">
          <div class="text-zinc-500 text-xs uppercase tracking-wider mb-1">Accuracy</div>
          <div class="text-3xl font-mono text-zinc-100 tabular-nums">{props.metrics.accuracy}%</div>
        </div>
        <div class="rounded-xl bg-white/5 border border-white/10 p-4 shadow-glass-sm">
          <div class="text-zinc-500 text-xs uppercase tracking-wider mb-1">Consistency</div>
          <div class="text-3xl font-mono text-zinc-100 tabular-nums">{props.metrics.consistency}%</div>
        </div>
        <div class="rounded-xl bg-white/5 border border-white/10 p-4 shadow-glass-sm">
          <div class="text-zinc-500 text-xs uppercase tracking-wider mb-1">Time</div>
          <div class="text-3xl font-mono text-zinc-100 tabular-nums">
            {Math.floor(props.metrics.durationSeconds)}s
          </div>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <div class="rounded-xl bg-white/5 border border-white/10 p-4 shadow-glass-sm">
          <div class="text-zinc-500 text-xs uppercase tracking-wider mb-3">WPM over time</div>
          <div class="h-24 flex items-end gap-0.5">
            <For each={props.metrics.wpmOverTime}>
              {(w) => {
                const maxWpm = Math.max(1, ...props.metrics.wpmOverTime);
                const pct = (w / maxWpm) * 100;
                return (
                  <div
                    class="flex-1 min-w-[4px] rounded-t bg-amber-500/60 transition-all"
                    style={{ height: `${pct}%` }}
                  />
                );
              }}
            </For>
          </div>
          <div class="flex justify-between mt-1 text-xs text-zinc-500 font-mono">
            <span>0s</span>
            <span>{Math.floor(props.metrics.durationSeconds)}s</span>
          </div>
        </div>

        <div class="rounded-xl bg-white/5 border border-white/10 p-4 shadow-glass-sm">
          <div class="text-zinc-500 text-xs uppercase tracking-wider mb-3">Key errors (heatmap)</div>
          <div class="flex flex-wrap gap-1.5">
            <For each={HEATMAP_KEYS}>
              {(key) => {
                const count = props.metrics.keyErrors.get(key) ?? 0;
                const intensity = maxErrors() > 0 ? count / maxErrors() : 0;
                return (
                  <div
                    class="px-2 py-1 rounded font-mono text-xs tabular-nums transition-colors"
                    classList={{
                      "bg-red-500/20 text-red-300": intensity > 0.5,
                      "bg-red-500/10 text-red-400/80": intensity > 0 && intensity <= 0.5,
                      "bg-white/5 text-zinc-500": intensity === 0,
                    }}
                    title={`${key}: ${count} errors`}
                  >
                    {key === " " ? "␣" : key} {count > 0 ? count : ""}
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </div>

      <div class="flex justify-center pt-2">
        <button
          type="button"
          onclick={props.onRestart}
          class="px-6 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 font-mono text-sm text-zinc-200 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
