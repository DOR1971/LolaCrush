/* ==========================================================================
   Sonido — sintetizado con Web Audio. Sin archivos, sin descargas.
   Los navegadores móviles exigen un gesto del usuario para arrancar el audio,
   así que Sound.init() se llama en el primer toque.
   ========================================================================== */

const Sound = (() => {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.20;
    master.connect(ctx.destination);
    return ctx;
  }

  function note(freq, opts = {}) {
    if (muted) return;
    const c = ensure();
    if (!c) return;

    const {
      dur = 0.13,
      type = "sine",
      gain = 1,
      delay = 0,
      slideTo = null
    } = opts;

    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function noise(opts = {}) {
    if (muted) return;
    const c = ensure();
    if (!c) return;

    const { dur = 0.18, gain = 0.35, filter = 1400 } = opts;
    const frames = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, frames, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;

    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = filter;

    const g = c.createGain();
    g.gain.value = gain;

    src.connect(lp);
    lp.connect(g);
    g.connect(master);
    src.start();
  }

  return {
    init() {
      ensure();
    },

    setMuted(v) {
      muted = !!v;
      if (master) master.gain.value = muted ? 0 : 0.20;
    },

    isMuted() {
      return muted;
    },

    tap() {
      note(520, { dur: 0.05, type: "triangle", gain: 0.5 });
    },

    flip() {
      note(360, { dur: 0.06, type: "triangle", gain: 0.4, slideTo: 620 });
    },

    select() {
      note(760, { dur: 0.045, type: "sine", gain: 0.35 });
    },

    swap() {
      note(300, { dur: 0.07, type: "triangle", gain: 0.45, slideTo: 520 });
    },

    match(combo) {
      const base = 420 + Math.min(combo || 1, 6) * 55;
      note(base, { dur: 0.09, type: "triangle", gain: 0.75 });
      note(base * 1.5, { dur: 0.11, type: "sine", gain: 0.45, delay: 0.045 });
    },

    ok() {
      note(660, { dur: 0.10, type: "sine", gain: 0.9 });
      note(990, { dur: 0.14, type: "sine", gain: 0.7, delay: 0.08 });
    },

    error() {
      note(180, { dur: 0.16, type: "sawtooth", gain: 0.5, slideTo: 120 });
    },

    unlock() {
      [523, 659, 784, 1047].forEach((f, i) => {
        note(f, { dur: 0.16, type: "sine", gain: 0.8, delay: i * 0.075 });
      });
    },

    win() {
      const seq = [523, 659, 784, 1047, 1319];
      seq.forEach((f, i) => {
        note(f, { dur: 0.20, type: "sine", gain: 0.85, delay: i * 0.10 });
        note(f / 2, { dur: 0.24, type: "triangle", gain: 0.35, delay: i * 0.10 });
      });
      noise({ dur: 0.5, gain: 0.12, filter: 3200 });
    },

    pad(index) {
      const freqs = [392, 523, 659, 784];
      note(freqs[index % 4], { dur: 0.20, type: "sine", gain: 0.8 });
    },

    tick() {
      note(1200, { dur: 0.03, type: "square", gain: 0.18 });
    },

    whoosh() {
      noise({ dur: 0.26, gain: 0.18, filter: 2200 });
    }
  };
})();
