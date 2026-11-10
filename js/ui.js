/* ==========================================================================
   Interfaz — utilidades compartidas: creación de DOM, pantallas, confeti,
   barra de progreso, vibración y efecto de máquina de escribir.
   ========================================================================== */

const UI = (() => {
  const stage = document.getElementById("stage");
  const bar = document.getElementById("progressBar");
  const progressWrap = document.getElementById("progress");
  const fx = document.getElementById("fx");
  const ctx = fx.getContext("2d");

  let current = null;
  let dpr = 1;

  /* --- DOM ------------------------------------------------------------- */

  function h(tag, props, ...children) {
    const el = document.createElement(tag);

    if (props) {
      for (const key in props) {
        const val = props[key];
        if (val === null || val === undefined || val === false) continue;

        if (key === "class") el.className = val;
        else if (key === "text") el.textContent = val;
        else if (key === "html") el.innerHTML = val;
        else if (key === "dataset") Object.assign(el.dataset, val);
        else if (key === "style" && typeof val === "object") Object.assign(el.style, val);
        else if (key.startsWith("on") && typeof val === "function") {
          el.addEventListener(key.slice(2).toLowerCase(), val);
        } else if (key === "disabled") el.disabled = !!val;
        else el.setAttribute(key, val);
      }
    }

    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      el.append(child.nodeType ? child : document.createTextNode(String(child)));
    }

    return el;
  }

  /* --- Pantallas ------------------------------------------------------- */

  function show(node) {
    const old = current;

    node.classList.add("screen");
    stage.append(node);
    void node.offsetWidth;

    requestAnimationFrame(() => node.classList.add("is-active"));
    node.scrollTop = 0;
    current = node;

    if (old) {
      old.classList.remove("is-active");
      old.classList.add("is-leaving");
      setTimeout(() => old.remove(), 500);
    }
  }

  function screen(...children) {
    return h("div", { class: "screen" }, h("div", { class: "wrap" }, ...children));
  }

  /* --- Progreso -------------------------------------------------------- */

  function progress(done, total) {
    if (!progressWrap) return;
    progressWrap.hidden = total <= 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    bar.style.width = pct + "%";
  }

  /* --- Color del capítulo ---------------------------------------------- */

  function accent(color, secondary) {
    const root = document.documentElement;
    if (color) root.style.setProperty("--accent", color);
    if (secondary) root.style.setProperty("--accent-2", secondary);
  }

  /* --- Vibración -------------------------------------------------------- */

  function vibrate(pattern) {
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (_) { /* ignorar */ }
    }
  }

  /* --- Aviso flotante --------------------------------------------------- */

  let toastEl = null;
  let toastTimer = null;

  function toast(message, ms = 2200) {
    if (!toastEl) {
      toastEl = h("div", { class: "toast", role: "status" });
      document.body.append(toastEl);
    }
    toastEl.textContent = message;
    requestAnimationFrame(() => toastEl.classList.add("is-on"));

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), ms);
  }

  /* --- Confeti ---------------------------------------------------------- */

  let particles = [];
  let running = false;
  let dprReady = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    fx.width = Math.floor(window.innerWidth * dpr);
    fx.height = Math.floor(window.innerHeight * dpr);
    fx.style.width = window.innerWidth + "px";
    fx.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dprReady = true;
  }

  window.addEventListener("resize", resize);
  resize();

  function confetti(options = {}) {
    if (!dprReady) resize();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const {
      count = 110,
      colors = ["#ff5d8f", "#ffb020", "#7c5cff", "#22c1c3", "#ffffff"],
      spread = 1
    } = options;

    const w = window.innerWidth;
    const hgt = window.innerHeight;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: -20 - Math.random() * hgt * 0.35,
        vx: (Math.random() - 0.5) * 3.4 * spread,
        vy: 1.6 + Math.random() * 3.6,
        size: 4 + Math.random() * 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.28,
        color: colors[(Math.random() * colors.length) | 0],
        life: 1,
        shape: Math.random() > 0.35 ? "rect" : "circle"
      });
    }

    if (!running) {
      running = true;
      requestAnimationFrame(loop);
    }
  }

  function loop() {
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    ctx.clearRect(0, 0, w, hgt);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += 0.055;
      p.vx *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;

      if (p.y > hgt + 30) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.color;

      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (particles.length > 0) {
      requestAnimationFrame(loop);
    } else {
      running = false;
      ctx.clearRect(0, 0, w, hgt);
    }
  }

  /* --- Efectos de tablero ------------------------------------------------ */

  function floatScore(x, y, text) {
    const el = h("span", { class: "float-score", text });
    el.style.left = x + "px";
    el.style.top = y + "px";
    document.body.append(el);
    requestAnimationFrame(() => el.classList.add("is-up"));
    setTimeout(() => el.remove(), 900);
  }

  function shake() {
    const app = document.getElementById("app");
    app.classList.remove("is-shake");
    void app.offsetWidth;
    app.classList.add("is-shake");
  }

  let flashEl = null;

  function flash() {
    if (!flashEl) {
      flashEl = h("div", { class: "flash" });
      document.getElementById("app").append(flashEl);
    }
    flashEl.classList.remove("is-on");
    void flashEl.offsetWidth;
    flashEl.classList.add("is-on");
    setTimeout(() => flashEl.classList.remove("is-on"), 360);
  }

  function burst(x, y, colors) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const palette = colors || ["#ffffff", "#ffd166", "#ff8ab0"];
    for (let i = 0; i < 12; i++) {
      particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 5.5,
        vy: (Math.random() - 0.8) * 5.5,
        size: 2.5 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: palette[(Math.random() * palette.length) | 0],
        life: 1,
        shape: Math.random() > 0.5 ? "rect" : "circle"
      });
    }

    if (!running) {
      running = true;
      requestAnimationFrame(loop);
    }
  }

  /* --- Máquina de escribir ---------------------------------------------- */

  function typewriter(el, text, speed = 30) {
    return new Promise((resolve) => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        el.textContent = text;
        resolve();
        return;
      }

      el.textContent = "";
      el.classList.add("typewriter");
      let i = 0;

      const timer = setInterval(() => {
        el.textContent = text.slice(0, ++i);
        if (i % 3 === 0) Sound.tick();

        if (i >= text.length) {
          clearInterval(timer);
          el.classList.remove("typewriter");
          el.classList.add("is-done");
          resolve();
        }
      }, speed);
    });
  }

  /* --- Espera ----------------------------------------------------------- */

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  return {
    h, show, screen, progress, accent, vibrate, toast, confetti,
    floatScore, shake, flash, burst,
    typewriter, wait, shuffle, stage
  };
})();
