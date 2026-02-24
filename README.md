# go_type

Your typing partner for the future — a premium, minimalist typing practice platform with **zero-latency input** and optional mechanical ASMR sound.

## Stack

- **SolidJS** — fine-grained reactivity for minimal re-renders
- **Tailwind CSS** — dimensional minimalism / hyper-minimal UI
- **Web Audio API** — low-latency key sounds (pre-loaded WAV or built-in fallback)
- **Motion** — micro-interactions
- **JetBrains Mono** — monospace typeface for the practice area

## Setup

```bash
npm install
npm run dev
```

Open the URL shown (e.g. `http://localhost:5173`). Focus the practice area and start typing.

## Audio (ASMR)

- **Optional WAV:** Place a keydown sample at `public/audio/keydown.wav` (short one-shot, e.g. 40–80 ms, Cherry MX–style). The app will use it for key sounds.
- **Fallback:** If the file is missing, a short synthetic click is used so sound works out of the box.

## Build

```bash
npm run build
npm run preview
```

## Features

- **Word list** — 30 random words per test
- **Live metrics** — WPM, raw WPM, accuracy, elapsed time
- **Smooth caret** — hardware-accelerated, no jarring jumps
- **Direct key events** — no `<input>`, minimal DOM overhead
- **Stop on error** and **Freedom mode** (backspace) toggles
- **Post-test bento** — WPM over time, key error heatmap, try again
