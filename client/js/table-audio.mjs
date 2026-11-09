// Dry, close-up tabletop sounds. Buffers are synthesized once, then reused;
// contact brightness and volume follow impact speed, not an artificial pitch drop.
const MATERIALS = {
  puck: {
    duration: 0.105, contact: 0.0014, brightness: 7200,
    modes: [[610, .014, .42], [1373, .010, .32], [2549, .007, .22], [4193, .004, .12]],
  },
  wall: {
    duration: 0.17, contact: 0.003, brightness: 3900,
    modes: [[183, .028, .48], [427, .021, .32], [967, .013, .23], [2137, .007, .13]],
  },
  divider: {
    duration: 0.13, contact: 0.002, brightness: 5700,
    modes: [[337, .022, .40], [823, .015, .32], [1747, .010, .24], [3191, .005, .14]],
  },
};

function randomFor(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function finish(buffer) {
  const data = buffer.getChannelData(0), rate = buffer.sampleRate;
  let previous = 0, highpass = 0, peak = 0;
  const pole = Math.exp(-2 * Math.PI * 35 / rate);
  for (let i = 0; i < data.length; i++) {
    // Remove DC and fade both edges so even a quiet touch has no digital click.
    highpass = data[i] - previous + pole * highpass;
    previous = data[i];
    data[i] = highpass * Math.min(1, i / (rate * .0003), (data.length - 1 - i) / (rate * .008));
    peak = Math.max(peak, Math.abs(data[i]));
  }
  if (peak) for (let i = 0; i < data.length; i++) data[i] *= .85 / peak;
  return buffer;
}

function impactBuffer(context, material, random) {
  const rate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.ceil(rate * material.duration), rate);
  const data = buffer.getChannelData(0);
  const variation = .97 + random() * .06;
  const modes = material.modes.map(([frequency, decay, level]) => {
    const angle = 2 * Math.PI * frequency * variation / rate;
    const damping = Math.exp(-1 / (rate * decay * (.9 + random() * .2)));
    return { a: 2 * damping * Math.cos(angle), b: damping * damping,
      y1: 0, y2: -Math.sin(angle) * level * (.85 + random() * .3) };
  });
  const smoothing = 1 - Math.exp(-2 * Math.PI * material.brightness / rate);
  let grain = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / rate;
    grain += smoothing * (random() * 2 - 1 - grain);
    let sample = .7 * grain * Math.exp(-t / material.contact);
    for (const mode of modes) {
      const next = mode.a * mode.y1 - mode.b * mode.y2;
      mode.y2 = mode.y1;
      mode.y1 = next;
      sample += next;
    }
    data[i] = sample;
  }
  return finish(buffer);
}

function rubberBuffer(context, random, launch) {
  const rate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.ceil(rate * (launch ? .23 : .18)), rate);
  const data = buffer.getChannelData(0);
  // A damped plucked delay line gives rubber an irregular snap and a short twang.
  const line = new Float32Array(Math.round(rate / (launch ? 158 : 112)));
  for (let i = 0; i < line.length; i++) line[i] = random() * 2 - 1;
  let previous = 0;
  for (let i = 0; i < data.length; i++) {
    const index = i % line.length, value = line[index], t = i / rate;
    line[index] = (value + previous) * (launch ? .487 : .48);
    previous = value;
    const snap = (random() * 2 - 1) * Math.exp(-t / (launch ? .0018 : .0035));
    data[i] = value * Math.exp(-t / .065) + snap * .35;
  }
  return finish(buffer);
}

function frictionBuffer(context, random) {
  const rate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.ceil(rate * .055), rate);
  const data = buffer.getChannelData(0);
  let low = 0, slow = 0;
  for (let i = 0; i < data.length; i++) {
    low += .26 * (random() * 2 - 1 - low);
    slow += .04 * (low - slow);
    const t = i / rate;
    data[i] = (low - slow) * Math.sin(Math.PI * i / data.length) ** 2 *
      (.65 + .35 * Math.sin(t * 2 * Math.PI * 79));
  }
  return finish(buffer);
}

export function contactSoundKey(event) {
  if (event.k === 'puck' && event.a != null && event.b != null)
    return `puck:${Math.min(event.a, event.b)}:${Math.max(event.a, event.b)}`;
  if (event.a != null)
    return `${event.k}:${event.a}:${event.edge ?? event.s ?? ''}`;
  // Legacy server feedback has no puck IDs; nearby contacts still share a key.
  return `${event.k}:${Math.round(event.x / 2)}:${Math.round(event.y / 2)}`;
}

export class TableAudio {
  constructor(context, destination) {
    this.context = context;
    this.destination = destination;
    this.buffers = new Map();
    this.previous = new Map();
    this.active = new Set();
    for (const kind of ['puck', 'wall', 'divider', 'band', 'launch', 'stretch']) {
      const variants = Array.from({ length: 4 }, (_, index) => {
        const random = randomFor(731 + index * 1777 + kind.charCodeAt(0) * 137);
        return MATERIALS[kind] ? impactBuffer(context, MATERIALS[kind], random)
          : kind === 'stretch' ? frictionBuffer(context, random)
          : rubberBuffer(context, random, kind === 'launch');
      });
      this.buffers.set(kind, variants);
    }
  }

  play(kind, strength, pan = 0, duck = 1) {
    const variants = this.buffers.get(kind);
    if (!variants || duck <= 0 || this.active.size >= 24) return;
    const context = this.context, power = Math.min(1, Math.max(0, strength));
    // Never repeat the same take back to back, including a rapid wall rebound.
    const index = ((this.previous.get(kind) ?? -1) + 1 + Math.floor(Math.random() * 3)) % 4;
    this.previous.set(kind, index);
    const source = context.createBufferSource();
    source.buffer = variants[index];
    source.playbackRate.value = (.985 + Math.random() * .03) *
      (kind === 'launch' || kind === 'band' ? .85 + power * .3 : 1);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = .55;
    filter.frequency.value = Math.min(context.sampleRate * .45,
      1100 + power ** .65 * (MATERIALS[kind]?.brightness ?? 4600));
    const gain = context.createGain();
    // Leave mixing headroom; the output limiter handles dense simultaneous hits.
    gain.gain.value = (.02 + .48 * power ** .85) * duck * (kind === 'stretch' ? .18 : 1);
    source.connect(filter).connect(gain);
    const panner = context.createStereoPanner?.();
    if (panner) {
      panner.pan.value = Math.max(-.8, Math.min(.8, pan));
      gain.connect(panner).connect(this.destination);
    } else gain.connect(this.destination);
    this.active.add(source);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      panner?.disconnect();
      this.active.delete(source);
    };
    source.start(context.currentTime + .003);
    return source;
  }
}
