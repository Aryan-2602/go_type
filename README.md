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

- **Pitch variance:** Each key plays with a random pitch offset of ±10% to mimic mechanical keyboard variance.
- **Key sound profiles:** Choose **Clicky**, **Tactile**, or **Linear**. Place WAVs in `public/audio/`:
  - `keydown_clicky.wav`, `keydown_tactile.wav`, `keydown_linear.wav` (short one-shots, e.g. 40–80 ms).
  - Legacy: `keydown.wav` is used as the Clicky fallback if `keydown_clicky.wav` is missing.
- **Fallback:** If a profile’s file is missing, a short synthetic click is used for that profile.
- **Ambient layer:** Toggle **Ambient** and pick **Rain**, **Cafe**, or **White Noise**. White noise is generated in-app; for Rain and Cafe, add looping WAVs:
  - `public/audio/rain.wav`, `public/audio/cafe.wav`
  - If missing, the app logs a console warning and that option won’t play. Use the separate **Ambient vol** slider to mix level.

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
- **Key sound profiles** — Clicky, Tactile, Linear (with ±10% pitch variance per key)
- **Visual haptics** — subtle screen shake on error; soft caret glow every 10th correct character
- **Ambient backgrounds** — optional looping Rain, Cafe, or White Noise with separate volume
- **Post-test bento** — WPM over time, key error heatmap, try again
