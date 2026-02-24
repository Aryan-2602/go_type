import {
  createSignal,
  createMemo,
  onMount,
  onCleanup,
  createEffect,
  on,
  Index,
} from "solid-js";
import { animate } from "motion";
import { useAudioEngine } from "./ASMRManager";
import type { KeystrokeRecord } from "../lib/MetricUtils";
import { getRandomWords } from "../data/words";

export type TypingPhase = "idle" | "active" | "finished";

export type TypingState = {
  words: string[];
  typedChars: string[];
  errors: Set<number>;
  startTime: number | null;
  endTime: number | null;
  keystrokes: KeystrokeRecord[];
  phase: TypingPhase;
};

type Props = {
  stopOnError: boolean;
  freedomMode: boolean;
  resetTrigger?: number;
  onPhaseChange?: (phase: TypingPhase) => void;
  onStateChange?: (state: { keystrokes: KeystrokeRecord[]; startTime: number | null }) => void;
  onFinish?: (state: TypingState) => void;
  onError?: () => void;
};

const WORD_COUNT = 30;

type CharSpanProps = {
  idx: number;
  typedChars: () => string[];
  chars: () => string[];
  refCallback: (el: HTMLElement) => void;
};

function CharSpan(props: CharSpanProps) {
  const typedLen = () => props.typedChars().length;
  const typed = () => props.idx < typedLen();
  const expectedChar = () => props.chars()[props.idx] ?? "";
  const typedChar = () => (typed() ? props.typedChars()[props.idx] : undefined);
  const isWrong = () => {
    if (!typed()) return false;
    return typedChar() !== expectedChar();
  };
  const displayChar = () => (typed() ? (typedChar() ?? expectedChar()) : expectedChar());
  const className = () =>
    isWrong()
      ? "text-red-400/80 bg-red-500/10"
      : typed()
        ? "text-zinc-100"
        : "text-zinc-500";
  return (
    <span
      ref={props.refCallback}
      data-char-index={props.idx}
      class={className()}
    >
      {displayChar()}
    </span>
  );
}

export function TypingArea(props: Props) {
  const asmr = useAudioEngine();
  const engine = () => asmr?.engine ?? null;
  const [words, setWords] = createSignal<string[]>(getRandomWords(WORD_COUNT));
  const [typedChars, setTypedChars] = createSignal<string[]>([]);
  const [startTime, setStartTime] = createSignal<number | null>(null);
  const [endTime, setEndTime] = createSignal<number | null>(null);
  const [keystrokes, setKeystrokes] = createSignal<KeystrokeRecord[]>([]);
  const [phase, setPhase] = createSignal<TypingPhase>("idle");
  const [caretIndex, setCaretIndex] = createSignal(0);
  const [caretX, setCaretX] = createSignal(0);
  const [caretY, setCaretY] = createSignal(0);
  const [caretHeight, setCaretHeight] = createSignal(0);

  const containerRef = { el: null as HTMLDivElement | null };
  const caretRef = { el: null as HTMLDivElement | null };
  const charRefs: (HTMLElement | null)[] = [];

  const fullText = createMemo(() => words().join(" "));
  const chars = createMemo(() => fullText().split(""));

  createEffect(on(() => props.resetTrigger, () => {
    setWords(getRandomWords(WORD_COUNT));
    setTypedChars([]);
    setStartTime(null);
    setEndTime(null);
    setKeystrokes([]);
    setPhase("idle");
  }, { defer: true }));

  createEffect(() => {
    props.onStateChange?.({ keystrokes: keystrokes(), startTime: startTime() });
  });

  createEffect(() => {
    // Keep caret index in sync with typed character count
    setCaretIndex(typedChars().length);
  });

  createEffect(() => {
    const container = containerRef.el;
    const allChars = chars();
    const idx = caretIndex();
    if (!container || allChars.length === 0) return;

    const lastIndex = allChars.length - 1;
    const clampedIndex = Math.min(Math.max(idx, 0), lastIndex);
    while (charRefs.length > allChars.length) charRefs.pop();

    const updatePosition = () => {
      const target = charRefs[clampedIndex];
      if (!target) return;
      const containerRect = container.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const x =
        idx > lastIndex
          ? rect.right - containerRect.left
          : rect.left - containerRect.left;
      const y = rect.top - containerRect.top;
      setCaretX(x);
      setCaretY(y);
      setCaretHeight(rect.height);
    };

    requestAnimationFrame(() => requestAnimationFrame(updatePosition));
  });

  const snapshot = (): TypingState => {
    const full = fullText();
    const typed = typedChars();
    const errSet = new Set<number>();
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] !== full[i]) errSet.add(i);
    }
    return {
      words: words(),
      typedChars: typedChars(),
      errors: errSet,
      startTime: startTime(),
      endTime: endTime(),
      keystrokes: keystrokes(),
      phase: phase(),
    };
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (phase() === "finished") return;

    const typedLen = typedChars().length;
    const expected = chars()[typedLen];

    if (e.key === "Backspace") {
      if (!props.freedomMode) return;
      e.preventDefault();
      if (typedChars().length === 0) return;
      setTypedChars(typedChars().slice(0, -1));
      setKeystrokes([...keystrokes(), { key: "Backspace", timestamp: Date.now(), correct: true }]);
      return;
    }

    if (e.key.length !== 1) return;
    e.preventDefault();

    const key = e.key;
    if (expected === undefined) return;

    if (phase() === "idle") {
      setPhase("active");
      setStartTime(Date.now());
      props.onPhaseChange?.("active");
      engine()?.resume();
    }

    const correct = key === expected;
    if (!correct) props.onError?.();
    if (!correct && props.stopOnError) return;

    engine()?.playKey();

    const ts = Date.now();
    const newKeystrokes = [...keystrokes(), { key, timestamp: ts, correct }];
    setKeystrokes(newKeystrokes);

    const newTypedLen = typedLen + 1;
    setTypedChars((prev) => [...prev, key]);

    if (correct && newTypedLen % 10 === 0 && caretRef.el) {
      animate(
        caretRef.el,
        { boxShadow: ["0 0 0 transparent", "0 0 12px 4px rgba(251, 191, 36, 0.4)", "0 0 0 transparent"] },
        { duration: 0.35, ease: "easeOut" }
      );
    }

    if (newTypedLen >= chars().length) {
      setEndTime(ts);
      setPhase("finished");
      props.onPhaseChange?.("finished");
      props.onFinish?.(snapshot());
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown, true);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown, true));
  });

  return (
    <div
      ref={(el) => (containerRef.el = el)}
      class="relative font-mono text-xl leading-relaxed text-zinc-300 select-none min-h-[120px] px-1"
      tabIndex={0}
      style={{ "caret-color": "transparent" }}
    >
      <div class="whitespace-pre-wrap break-words">
        <Index each={chars()}>
          {(_charAt, idx) => (
            <CharSpan
              idx={idx}
              typedChars={typedChars}
              chars={chars}
              refCallback={(el) => {
                if (el) charRefs[idx] = el;
              }}
            />
          )}
        </Index>
      </div>
      <div
        ref={(el) => (caretRef.el = el)}
        class="pointer-events-none absolute left-0 top-0 w-[2px] bg-amber-400/90 rounded-sm animate-caret-blink transition-transform duration-100 ease-out"
        style={{
          transform: `translate3d(${caretX()}px, ${caretY()}px, 0)`,
          height: `${caretHeight()}px`,
        }}
        aria-hidden
      />
    </div>
  );
}
