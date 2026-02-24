export type AmbientType = "Rain" | "Cafe" | "White Noise" | null;

export class AmbientEngine {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentType: AmbientType = null;
  private volume = 0.2;
  private buffers: Map<string, AudioBuffer> = new Map();

  async init(ctx: AudioContext): Promise<void> {
    this.ctx = ctx;
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(ctx.destination);

    this.createWhiteNoiseBuffer();
    this.createRainBuffer();
    this.createCafeBuffer();

    await this.loadAmbient("Rain", "/audio/rain.wav").catch(() => {
      // Procedural rain already set in createRainBuffer
    });
    await this.loadAmbient("Cafe", "/audio/cafe.wav").catch(() => {
      // Procedural cafe already set in createCafeBuffer
    });
  }

  private createWhiteNoiseBuffer(): void {
    if (!this.ctx) return;
    const duration = 2;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    this.buffers.set("White Noise", buffer);
  }

  /** Droplet-style rain: random short bursts (drops) with decay, no continuous noise wash */
  private createRainBuffer(): void {
    if (!this.ctx) return;
    const duration = 4;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    data.fill(0);

    const numDrops = 120 + Math.floor(Math.random() * 40);
    for (let d = 0; d < numDrops; d++) {
      const startSample = Math.floor(Math.random() * (length - 0.002 * sampleRate));
      const dropDurationSec = 0.012 + Math.random() * 0.028;
      const dropSamples = Math.min(Math.floor(dropDurationSec * sampleRate), length - startSample);
      const gain = 0.15 + Math.random() * 0.2;

      for (let i = 0; i < dropSamples; i++) {
        const t = i / sampleRate;
        const decay = Math.exp(-t * 80);
        const noise = (Math.random() * 2 - 1) * decay * gain;
        data[startSample + i] += noise;
      }
    }
    // Soft clip to avoid harsh peaks when drops overlap
    for (let i = 0; i < length; i++) {
      const x = data[i];
      data[i] = x > 0 ? Math.min(x, 0.35) : Math.max(x, -0.35);
    }
    this.buffers.set("Rain", buffer);
  }

  /** Cafe: low-frequency room rumble (beating sines) + amplitude-modulated murmur, not flat noise */
  private createCafeBuffer(): void {
    if (!this.ctx) return;
    const duration = 3;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const rumble =
        Math.sin(2 * Math.PI * 44 * t) * 0.06 +
        Math.sin(2 * Math.PI * 51 * t) * 0.045;
      const murmurMod = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.12 * t);
      const murmur = (Math.random() * 2 - 1) * murmurMod * 0.18;
      data[i] = rumble + murmur;
    }
    this.buffers.set("Cafe", buffer);
  }

  private async loadAmbient(id: string, url: string): Promise<void> {
    if (!this.ctx) return;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.buffers.set(id, buffer);
  }

  setAmbient(type: AmbientType): void {
    if (!this.ctx || !this.gainNode) return;

    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // already stopped
      }
      this.currentSource.disconnect();
      this.currentSource = null;
    }

    this.currentType = type;

    if (type === null) {
      this.gainNode.gain.value = 0;
      return;
    }

    const buffer = this.buffers.get(type);
    if (!buffer) {
      this.gainNode.gain.value = 0;
      return;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.gainNode);
    source.start(0);
    this.currentSource = source;
    this.gainNode.gain.value = this.volume;
  }

  setAmbientVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gainNode && this.currentType !== null) {
      this.gainNode.gain.value = this.volume;
    }
  }

  getAmbientType(): AmbientType {
    return this.currentType;
  }

  getAmbientVolume(): number {
    return this.volume;
  }
}
