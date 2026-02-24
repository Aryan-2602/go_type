const GAIN_VARIANCE = 0.05; // ±5% volume per key

export type AudioEngineConfig = {
  volume: number;
  pitchVariance: [number, number];
  enabled: boolean;
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private masterGain: GainNode | null = null;
  private config: AudioEngineConfig = {
    volume: 0.35,
    pitchVariance: [0.92, 1.08],
    enabled: true,
  };

  async init(): Promise<void> {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.config.volume;
    this.masterGain.connect(this.ctx.destination);

    // Pre-load WAV samples; fallback to silent buffer if missing
    await this.loadSample("keydown", "/audio/keydown.wav").catch(() => {
      this.createFallbackBuffer();
    });
  }

  private createFallbackBuffer(): void {
    if (!this.ctx) return;
    const duration = 0.04;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 30) * 0.15;
    }
    this.buffers.set("keydown", buffer);
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

  playKey(sampleId: string = "keydown"): void {
    if (!this.config.enabled || !this.ctx || !this.masterGain) return;
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
}
