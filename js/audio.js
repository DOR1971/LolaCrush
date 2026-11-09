/* ==========================================================================
   Sonido — sintetizado con Web Audio. Sin archivos, sin descargas.
   Los navegadores móviles exigen un gesto del usuario para arrancar el audio,
   así que Sound.init() se llama en el primer toque.
   ========================================================================== */

const Sound = (() => {
  let ctx = null;
  let master = null;
  let muted = false;

  /* --- Música de fondo ------------------------------------------------- */
  let musicBus = null;
  let musicTimer = null;
  let musicOn = false;
  let musicWanted = false;
  let nextStep = 0;
  let stepIndex = 0;

  const MODES = {
    calm: { tempo: 92, cutoff: 1800, lead: 0.25 },
    upbeat: { tempo: 118, cutoff: 2600, lead: 0.28 }
  };

  let mode = "calm";
  let EIGHTH = 60 / MODES[mode].tempo / 2;
  const LOOP = 32;

  let musicFilter = null;

  /* Progresión I - V - vi - IV en Do mayor. Cada acorde dura un compás. */
  const CHORDS = [
    { bass: 48, arp: [60, 64, 67, 72, 67, 64, 60, 64] }, // Do
    { bass: 43, arp: [55, 59, 62, 67, 62, 59, 55, 59] }, // Sol
    { bass: 45, arp: [57, 60, 64, 69, 64, 60, 57, 60] }, // La menor
    { bass: 41, arp: [53, 57, 60, 65, 60, 57, 53, 57] }  // Fa
  ];

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

  function midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  function scheduleStep(step, when) {
    const bar = Math.floor(step / 8) % 4;
    const pos = step % 8;
    const chord = CHORDS[bar];

    const lead = ctx.createOscillator();
    const lg = ctx.createGain();
    lead.type = "triangle";
    lead.frequency.value = midiToFreq(chord.arp[pos]);
    lg.gain.setValueAtTime(0.0001, when);
    lg.gain.exponentialRampToValueAtTime(MODES[mode].lead, when + 0.02);
    lg.gain.exponentialRampToValueAtTime(0.0001, when + EIGHTH * 1.7);
    lead.connect(lg);
    lg.connect(musicBus);
    lead.start(when);
    lead.stop(when + EIGHTH * 1.8);

    if (pos === 0 || pos === 4) {
      const bass = ctx.createOscillator();
      const bg = ctx.createGain();
      bass.type = "sine";
      bass.frequency.value = midiToFreq(chord.bass);
      bg.gain.setValueAtTime(0.0001, when);
      bg.gain.exponentialRampToValueAtTime(0.30, when + 0.03);
      bg.gain.exponentialRampToValueAtTime(0.0001, when + EIGHTH * 3.2);
      bass.connect(bg);
      bg.connect(musicBus);
      bass.start(when);
      bass.stop(when + EIGHTH * 3.3);
    }
  }

  function tick() {
    if (!ctx || !musicOn) return;
    while (nextStep < ctx.currentTime + 0.25) {
      scheduleStep(stepIndex, nextStep);
      nextStep += EIGHTH;
      stepIndex = (stepIndex + 1) % LOOP;
    }
  }

  function ensureBus() {
    if (musicBus) return;
    musicBus = ctx.createGain();
    musicBus.gain.value = 0;

    musicFilter = ctx.createBiquadFilter();
    musicFilter.type = "lowpass";
    musicFilter.frequency.value = MODES[mode].cutoff;

    musicBus.connect(musicFilter);
    musicFilter.connect(master);
  }

  function haltMusic() {
    if (!musicOn) return;
    musicOn = false;
    clearInterval(musicTimer);
    musicTimer = null;

    if (musicBus && ctx) {
      musicBus.gain.cancelScheduledValues(ctx.currentTime);
      musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), ctx.currentTime);
      musicBus.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    }
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

    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.20;
      return muted;
    },

    /* --- Música ------------------------------------------------------- */

    startMusic() {
      const c = ensure();
      if (!c) return;

      musicWanted = true;
      if (musicOn) return;

      ensureBus();
      musicOn = true;

      musicBus.gain.cancelScheduledValues(c.currentTime);
      musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), c.currentTime);
      musicBus.gain.exponentialRampToValueAtTime(0.8, c.currentTime + 1.6);

      nextStep = c.currentTime + 0.15;
      stepIndex = 0;
      musicTimer = setInterval(tick, 60);
      tick();
    },

    stopMusic() {
      musicWanted = false;
      haltMusic();
    },

    pauseMusic() {
      haltMusic();
    },

    resumeMusic() {
      if (musicWanted) this.startMusic();
    },

    setMusicMode(next) {
      if (!MODES[next] || next === mode) return;
      mode = next;
      EIGHTH = 60 / MODES[mode].tempo / 2;
      if (musicFilter) musicFilter.frequency.value = MODES[mode].cutoff;

      if (musicOn) {
        haltMusic();
        this.startMusic();
      }
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

    /* Fanfarria corta y ascendente; sube de tono con el combo. */
    combo(n) {
      const step = Math.min(n || 2, 7);
      const base = 392 * Math.pow(2, (step - 2) / 12);

      [0, 4, 7, 12].forEach((semi, i) => {
        note(base * Math.pow(2, semi / 12), {
          dur: 0.11,
          type: "triangle",
          gain: 0.7,
          delay: i * 0.055
        });
      });
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
