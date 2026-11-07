import { soundTokens } from "./soundTokens";
import { loadSnapRecording, scheduleRecordedSnap } from "./recordedSnap";
// Snapp approval sound. playSnap uses the recorded CC0 snap and falls back to this Web Audio synthesis.
// Sequence: an air-suction swell while the owner holds, then a crisp snap with a short reverb tail.
// The product default is sound OFF (see SNAPP_BRAND.md, section 8); callers decide when to play.
//
// The schedule* functions work on any BaseAudioContext, so the same sound can be rendered
// offline (for example to a WAV file) as well as played live.

const SILENT = 0.0001; // exponential ramps can't reach 0

let live: AudioContext | null = null;
const rooms = new WeakMap<AudioNode, ConvolverNode>();

function audio(): AudioContext {
  if (!live) live = new AudioContext();
  if (live.state === "suspended") void live.resume();
  return live;
}

function noise(c: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(c.sampleRate * seconds));
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** A small, soft room: dark (low-passed), decaying stereo noise used as the impulse response. */
function room(c: BaseAudioContext, destination: AudioNode): ConvolverNode {
  const cached = rooms.get(destination);
  if (cached) return cached;
  const seconds = soundTokens.tailMs / 1000;
  const length = Math.floor(c.sampleRate * seconds);
  const smoothing = 1 - Math.exp((-2 * Math.PI * 2200) / c.sampleRate); // one-pole low-pass ~2.2 kHz
  const ir = c.createBuffer(2, length, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    let y = 0;
    for (let i = 0; i < length; i++) {
      y += smoothing * (Math.random() * 2 - 1 - y);
      data[i] = y * Math.pow(1 - i / length, 4);
    }
  }
  const node = c.createConvolver();
  node.buffer = ir;
  node.connect(destination);
  rooms.set(destination, node);
  return node;
}

export type Suction = { stop: () => void };

/** Air being drawn in: band-passed noise that rises in pitch and level over the hold. */
export function scheduleSuction(
  c: BaseAudioContext,
  at: number,
  holdMs: number,
  volume = 1,
  destination: AudioNode = c.destination,
): Suction {
  const dur = holdMs / 1000;
  const peak = Math.max(SILENT, 0.3 * volume);

  const src = c.createBufferSource();
  src.buffer = noise(c, dur + 0.1);

  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.2;
  band.frequency.setValueAtTime(350, at);
  band.frequency.exponentialRampToValueAtTime(2800, at + dur);

  const gain = c.createGain();
  gain.gain.setValueAtTime(SILENT, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + dur);
  gain.gain.linearRampToValueAtTime(SILENT, at + dur + 0.015); // cut off right as the snap lands

  src.connect(band).connect(gain).connect(destination);
  src.start(at);
  src.stop(at + dur + 0.05);

  return {
    // Early release: drain quickly instead of cutting with a click.
    stop() {
      const t = c.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(
        SILENT,
        t + soundTokens.cancelMs / 1000,
      );
      try {
        src.stop(t + 0.07);
      } catch {
        /* already stopped */
      }
    },
  };
}

/**
 * The snap, modeled on a real finger snap rather than a gunshot:
 * - skin click: a very short (~20 ms) noise burst focused around 1.2 kHz, with the hiss rolled off;
 * - palm pop: the middle finger hitting the palm, a damped tone that drops from ~520 to ~360 Hz;
 * - a small, dark room at a low level.
 * `pitch` scales every frequency: below 1 is lower and rounder, above 1 brighter.
 */
export function scheduleSnap(
  c: BaseAudioContext,
  at: number,
  volume = 1,
  pitch = 1,
  destination: AudioNode = c.destination,
): void {
  const bus = c.createGain();
  bus.gain.value = volume * 0.8; // headroom: keeps the peak well under clipping at full volume

  // Skin click.
  const click = c.createBufferSource();
  click.buffer = noise(c, 0.04);
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = soundTokens.clickHz * pitch;
  band.Q.value = 1.6;
  const soften = c.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = soundTokens.lowpassHz * pitch;
  const clickEnv = c.createGain();
  clickEnv.gain.setValueAtTime(SILENT, at);
  clickEnv.gain.exponentialRampToValueAtTime(1.1, at + 0.001);
  clickEnv.gain.exponentialRampToValueAtTime(
    SILENT,
    at + soundTokens.clickMs / 1000,
  );
  click.connect(band).connect(soften).connect(clickEnv).connect(bus);
  click.start(at);
  click.stop(at + 0.04);

  // Palm pop.
  const pop = c.createOscillator();
  pop.type = "sine";
  pop.frequency.setValueAtTime(soundTokens.popStartHz * pitch, at);
  pop.frequency.exponentialRampToValueAtTime(
    soundTokens.popEndHz * pitch,
    at + 0.025,
  );
  const popEnv = c.createGain();
  popEnv.gain.setValueAtTime(SILENT, at);
  popEnv.gain.exponentialRampToValueAtTime(0.3, at + 0.0015);
  popEnv.gain.exponentialRampToValueAtTime(SILENT, at + 0.045);
  pop.connect(popEnv).connect(bus);
  pop.start(at);
  pop.stop(at + 0.05);

  // Palm thud: the low body of the snap. A soft (not instant) attack keeps it from sounding like a kick drum.
  const thud = c.createOscillator();
  thud.type = "sine";
  thud.frequency.setValueAtTime(150 * pitch, at);
  thud.frequency.exponentialRampToValueAtTime(
    85 * pitch,
    at + soundTokens.cancelMs / 1000,
  );
  const thudEnv = c.createGain();
  thudEnv.gain.setValueAtTime(SILENT, at);
  thudEnv.gain.exponentialRampToValueAtTime(soundTokens.thudGain, at + 0.004);
  thudEnv.gain.exponentialRampToValueAtTime(
    SILENT,
    at + soundTokens.bodyMs / 1000,
  );
  thud.connect(thudEnv).connect(bus);
  thud.start(at);
  thud.stop(at + soundTokens.bodyMs / 1000 + 0.01);

  // Warmth: lift everything under ~250 Hz.
  const warmth = c.createBiquadFilter();
  warmth.type = "lowshelf";
  warmth.frequency.value = 250 * pitch;
  warmth.gain.value = soundTokens.warmthDb;
  bus.connect(warmth);

  // Dry signal, plus a quiet, pre-delayed send into the small room for the tail.
  warmth.connect(destination);
  const preDelay = c.createDelay(0.1);
  preDelay.delayTime.value = 0.015;
  const wet = c.createGain();
  wet.gain.value = soundTokens.wetGain;
  warmth.connect(preDelay).connect(wet).connect(room(c, destination));
}

/** Live playback: start the suction now. */
export function startSuction(holdMs: number, volume = 1): Suction {
  const c = audio();
  return scheduleSuction(c, c.currentTime, holdMs, volume);
}

// The recorded CC0 snap (public/audio/LICENSE.md) is the default; synthesis is the fallback.
let recording: AudioBuffer | null = null;
let loading: Promise<void> | null = null;

/** Fetch and decode the recorded snap once. Safe to call repeatedly; failures leave the synth fallback. */
export function preloadSnap(): Promise<void> {
  if (recording || loading) return loading ?? Promise.resolve();
  const c = audio();
  loading = loadSnapRecording(c, new AbortController().signal)
    .then((buffer) => {
      recording = buffer;
    })
    .catch(() => {
      loading = null; // allow a later retry; the synth covers this play
    });
  return loading;
}

/** Live playback: play the snap now (recorded when available, synthesized otherwise). */
export function playSnap(volume = 1): void {
  const c = audio();
  if (recording) {
    const gain = c.createGain();
    gain.gain.value = volume;
    gain.connect(c.destination);
    scheduleRecordedSnap(c, recording, c.currentTime + 0.005, gain);
    return;
  }
  void preloadSnap();
  scheduleSnap(c, c.currentTime + 0.005, volume);
}
