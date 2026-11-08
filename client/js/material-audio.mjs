// 本地材质音效：素材仅加载/解码一次，撞击时只复用 AudioBuffer。
// 来源及 CC0 授权见 client/audio/README.md。
const FILES = ['puck-1', 'puck-2', 'puck-3', 'wood-1', 'wood-2', 'rail', 'soft', 'stretch', 'touch'];
const GROUPS = {
  puck: ['puck-1', 'puck-2', 'puck-3'], wall: ['rail', 'wood-1'],
  divider: ['wood-1', 'wood-2'], band: ['soft'],
  select: ['touch'], put: ['puck-1', 'puck-2'], stretch: ['stretch'],
};
const LEVEL = { puck: 0.42, wall: 0.32, divider: 0.34, band: 0.26,
  select: 0.8, put: 0.2, stretch: 0.14, launch: 0.28 };

export class MaterialAudio {
  constructor(ctx, output) {
    this.ctx = ctx;
    this.output = output;
    this.buffers = new Map();
    this.indices = new Map();
    this.active = new Set();
    this.buffers.set('launch', this.pluck());
    this.buffers.set('fallback', this.wood());
    // 两个加载任务足够，避免抢占物理/WASM 的启动带宽。
    let next = 0;
    const load = async () => {
      while (next < FILES.length) {
        const name = FILES[next++];
        try {
          const response = await fetch(new URL(`../audio/${name}.wav`, import.meta.url));
          if (!response.ok) continue;
          const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
          this.buffers.set(name, buffer);
        } catch { /* 离线或加载失败时使用已生成的短木音，不重放错过的声音。 */ }
      }
    };
    this.loading = Promise.all([load(), load()]);
  }

  pluck() {
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * 0.18), this.ctx.sampleRate);
    const data = buffer.getChannelData(0), period = Math.round(this.ctx.sampleRate / 190);
    const string = new Float32Array(period);
    let seed = 421;
    for (let i = 0; i < period; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      string[i] = (seed / 0xffffffff * 2 - 1) * 0.7;
    }
    for (let i = 0; i < data.length; i++) {
      const index = i % period;
      data[i] = string[index] * Math.min(1, i / (this.ctx.sampleRate * 0.002)) * (1 - i / data.length);
      string[index] = 0.94 * (string[index] + string[(index + 1) % period]) * 0.5;
    }
    return buffer;
  }

  wood() {
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * 0.085), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 714;
    for (let i = 0; i < data.length; i++) {
      const t = i / this.ctx.sampleRate;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = ((seed / 0xffffffff * 2 - 1) * Math.exp(-t * 700) * 0.35 +
        Math.sin(t * 2 * Math.PI * 780) * Math.exp(-t * 130) * 0.16 +
        Math.sin(t * 2 * Math.PI * 1870) * Math.exp(-t * 220) * 0.1) *
        Math.min(1, i / 20) * (1 - i / data.length);
    }
    return buffer;
  }

  play(kind, strength, pan = 0, duck = 1) {
    if (this.ctx.state !== 'running' || this.active.size >= 10) return;
    strength = Math.max(0, Math.min(1, strength));
    if (strength < 0.015) return;
    const names = GROUPS[kind] || [kind], index = this.indices.get(kind) || 0;
    this.indices.set(kind, index + 1);
    const buffer = this.buffers.get(names[index % names.length]) || this.buffers.get('fallback');
    const source = this.ctx.createBufferSource(), gain = this.ctx.createGain();
    source.buffer = buffer;
    source.playbackRate.value = kind === 'launch' ? 0.85 + strength * 0.2
      : kind === 'stretch' ? 0.8 + strength * 0.25 : 0.98 + (index % 3) * 0.02;
    gain.gain.value = (LEVEL[kind] ?? 0.3) * strength ** 1.3 * duck;
    source.connect(gain);
    const panner = this.ctx.createStereoPanner?.();
    if (panner) {
      panner.pan.value = Math.max(-0.75, Math.min(0.75, pan));
      gain.connect(panner).connect(this.output);
    } else gain.connect(this.output);
    this.active.add(source);
    source.onended = () => {
      source.disconnect(); gain.disconnect(); panner?.disconnect();
      this.active.delete(source);
    };
    source.start();
  }
}
