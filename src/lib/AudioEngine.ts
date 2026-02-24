const GAIN_VARIANCE = 0.05; // ±5% volume per key

export type KeySoundProfile = "Clicky" | "Tactile" | "Linear";

export type AudioEngineConfig = {
  volume: number;
  pitchVariance: [number, number];
  enabled: boolean;
};

function profileToBufferId(profile: KeySoundProfile): string {
  return `keydown_${profile.toLowerCase()}`;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private masterGain: GainNode | null = null;
  private currentProfile: KeySoundProfile = "Clicky";
  private config: AudioEngineConfig = {
    volume: 0.35,
    pitchVariance: [0.90, 1.10], // ±10% per key (mechanical variance)
    enabled: true,
  };

  async init(sharedContext?: AudioContext): Promise<void> {
    this.ctx = sharedContext ?? new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.config.volume;
    this.masterGain.connect(this.ctx.destination);

    // Load one sample per profile; fallback to sine if missing. Also support legacy keydown.wav for Clicky.
    await this.loadSample("keydown_clicky", "/audio/keydown_clicky.wav").catch(() =>
      this.loadSample("keydown_clicky", "/audio/keydown.wav").catch(() => {
        this.createFallbackBuffer("keydown_clicky");
      })
    );
    await this.loadSample("keydown_tactile", "/audio/keydown_tactile.wav").catch(() => {
      this.createFallbackBuffer("keydown_tactile");
    });
    await this.loadSample("keydown_linear", "/audio/keydown_linear.wav").catch(() => {
      this.createFallbackBuffer("keydown_linear");
    });
  }

  private createFallbackBuffer(id: string): void {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    // Distinct character per profile when no WAV is present
    const presets: Record<string, { freq: number; decay: number; duration: number; gain: number }> = {
      keydown_clicky: { freq: 1100, decay: 45, duration: 0.032, gain: 0.16 },
      keydown_tactile: { freq: 800, decay: 30, duration: 0.04, gain: 0.15 },
      keydown_linear: { freq: 550, decay: 18, duration: 0.055, gain: 0.14 },
    };
    const p = presets[id] ?? presets.keydown_tactile;
    const length = Math.floor(sampleRate * p.duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * p.freq * t) * Math.exp(-t * p.decay) * p.gain;
    }
    this.buffers.set(id, buffer);
  }

  private async loadSample(id: string, url: string): Promise<void> {
    if (!this.ctx) return;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.buffers.set(id, buffer);
  }

  async resume(): Promise<void> {
    if (this.ctx?.state === "suspended") await this.ctx.resume();
  }

  playKey(): void {
    if (!this.config.enabled || !this.ctx || !this.masterGain) return;
    const sampleId = profileToBufferId(this.currentProfile);
    const buffer = this.buffers.get(sampleId);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const [minPitch, maxPitch] = this.config.pitchVariance;
    const pitch = minPitch + Math.random() * (maxPitch - minPitch);
    source.playbackRate.value = pitch;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 1 + (Math.random() * 2 - 1) * GAIN_VARIANCE;
    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.ctx.currentTime;
    source.start(now);
    source.stop(now + buffer.duration);
  }

  setVolume(v: number): void {
    this.config.volume = v;
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  setProfile(profile: KeySoundProfile): void {
    this.currentProfile = profile;
  }

  getProfile(): KeySoundProfile {
    return this.currentProfile;
  }
}
