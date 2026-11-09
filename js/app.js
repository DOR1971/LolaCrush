/* ==========================================================================
   LOLACRUSH — flujo de la aplicación
   Portada → niveles → pistas → final
   ========================================================================== */

(function () {
  "use strict";

  const C = window.REGALO;
  const h = UI.h;
  const KEY = "lolacrush-v1";
  const TOTAL = C.niveles.length;

  const LEVEL_COLORS = [
    ["#ff5d8f", "#ffb020"],
    ["#a06bff", "#ff7ac8"],
    ["#2fd3d3", "#7c5cff"]
  ];

  let state = loadState();
  let board = null;

  /* --- Estado ------------------------------------------------------------ */

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.level === "number") {
          return { level: parsed.level, attempts: parsed.attempts || 0 };
        }
      }
    } catch (err) { /* sin almacenamiento: se juega igual */ }
    return { level: 0, attempts: 0 };
  }

  function saveState() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) { /* ignorar */ }
  }

  if (/[?&]reset\b/.test(location.search)) {
    state = { level: 0, attempts: 0 };
    saveState();
  }

  /* Atajo de pruebas: index.html?nivel=2 abre ese nivel directamente,
     y ?vista=intro|pista|final abre una pantalla concreta. */
  const params = new URLSearchParams(location.search);
  const devLevel = params.get("nivel");
  const devIndex = devLevel
    ? Math.max(0, Math.min(TOTAL - 1, (parseInt(devLevel, 10) || 1) - 1))
    : -1;
  const vista = params.get("vista");
  const vistaN = Math.max(1, Math.min(TOTAL, parseInt(params.get("n") || "1", 10) || 1));

  /* --- Arranque ---------------------------------------------------------- */

  const unlock = () => {
    Sound.init();
    window.removeEventListener("pointerdown", unlock);
  };
  window.addEventListener("pointerdown", unlock);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  /* --- Utilidades -------------------------------------------------------- */

  function destroyBoard() {
    if (board) {
      board.destroy();
      board = null;
    }
  }

  function makeScreen(children, opts) {
    opts = opts || {};
    const node = UI.screen(...children);
    const wrap = node.firstElementChild;

    if (opts.center) wrap.classList.add("center");
    if (opts.tight) wrap.classList.add("wrap--tight");
    if (opts.play) node.classList.add("screen--play");
    if (opts.bottom) node.classList.add("screen--bottom");

    return node;
  }

  function paint(node, layers) {
    node.style.backgroundImage = layers;
    node.style.backgroundSize = "cover";
    node.style.backgroundPosition = "center top";
    node.style.backgroundRepeat = "no-repeat";
  }

  function artBackdrop(node, src) {
    node.prepend(h("div", { class: "screen-bg" }, h("img", { src: src, alt: "" })));
    node.classList.add("screen--veil");
  }

  function dots(index) {
    return h("div", { class: "dots" },
      C.niveles.map((_, k) => h("span", {
        class: "dot" + (k < index ? " is-done" : k === index ? " is-now" : "")
      }))
    );
  }

  function hudItem(label, valueEl) {
    return h("div", { class: "hud__item" },
      h("span", { class: "hud__label", text: label }),
      valueEl
    );
  }

  function randomPhrase(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  /* --- Portada ----------------------------------------------------------- */

  function splash() {
    destroyBoard();
    UI.accent("#ff5d8f", "#ffb020");
    UI.progress(state.level, TOTAL);

    const done = state.level >= TOTAL;
    const resume = state.level > 0 && !done;

    const primary = h("button", {
      class: "btn btn--wide",
      text: done ? "Ver el final" : resume ? "Continuar" : C.inicio.boton
    });

    primary.addEventListener("click", () => {
      Sound.tap();
      if (done) final();
      else nivelIntro(state.level);
    });

    const children = [
      h("div", { class: "splash__content" },
        h("p", { class: "splash__lema", text: C.inicio.lema }),
        primary,
        h("p", { class: "small", text: C.inicio.nota })
      )
    ];

    if (resume) {
      const restart = h("button", { class: "btn btn--link", text: "Empezar de nuevo" });
      restart.addEventListener("click", () => {
        state = { level: 0, attempts: 0 };
        saveState();
        splash();
      });
      children.push(h("div", { class: "tc" }, restart));
    }

    const node = makeScreen(children, { bottom: true });

    paint(node,
      "linear-gradient(180deg," +
      " rgba(18,10,24,0) 0%," +
      " rgba(18,10,24,0) 42%," +
      " rgba(18,10,24,0.45) 58%," +
      " rgba(18,10,24,0.88) 72%," +
      " #120a18 80%," +
      " #120a18 100%)," +
      ' url("' + C.arte.portada + '")'
    );

    UI.show(node);
  }

  /* --- Introducción de nivel --------------------------------------------- */

  function nivelIntro(i) {
    destroyBoard();
    const nivel = C.niveles[i];
    const palette = LEVEL_COLORS[i] || LEVEL_COLORS[0];

    UI.accent(palette[0], palette[1]);
    UI.progress(i, TOTAL);

    const play = h("button", { class: "btn btn--wide", text: "Jugar" });
    play.addEventListener("click", () => {
      Sound.tap();
      jugar(i);
    });

    UI.show(makeScreen([
      h("div", { class: "center stack-sm" },
        h("span", { class: "kicker", text: "Nivel " + (i + 1) + " de " + TOTAL }),
        h("h2", { text: nivel.titulo }),
        h("p", { class: "lead", text: "Consigue " + nivel.objetivo + " puntos de moda." })
      ),
      h("div", { class: "hud" },
        hudItem("Movimientos", h("span", { class: "hud__value", text: String(nivel.movimientos) })),
        hudItem("Objetivo", h("span", { class: "hud__value", text: String(nivel.objetivo) }))
      ),
      play,
      h("p", { class: "small tc", text: "Toca dos piezas vecinas o deslízalas para cambiarlas de sitio." }),
      dots(i)
    ], { center: true, tight: true }));
  }

  /* --- Juego -------------------------------------------------------------- */

  function jugar(i) {
    destroyBoard();
    const nivel = C.niveles[i];
    const palette = LEVEL_COLORS[i] || LEVEL_COLORS[0];

    UI.accent(palette[0], palette[1]);
    UI.progress(i, TOTAL);

    const movesValue = h("span", { class: "hud__value", text: String(nivel.movimientos) });
    const goalValue = h("span", { class: "hud__value", text: "0/" + nivel.objetivo });
    const goalFill = h("div", { class: "goal__fill" });
    const boardRoot = h("div", { class: "board-root" });

    /* --- Bocadillo de Lola --- */
    const bubbleText = h("p", { class: "bubble__text", text: C.motivacion.saludo });
    const bubble = h("div", { class: "bubble" }, bubbleText);

    const queue = [];
    let speaking = false;

    function pump() {
      if (speaking || queue.length === 0) return;
      speaking = true;

      bubbleText.textContent = queue.shift();
      bubble.classList.remove("is-pop");
      void bubble.offsetWidth;
      bubble.classList.add("is-pop");

      setTimeout(() => {
        speaking = false;
        pump();
      }, 2300);
    }

    function say(text) {
      if (!text) return;
      if (queue[queue.length - 1] === text) return;

      queue.push(text);
      if (queue.length > 2) queue.shift();
      pump();
    }

    const coach = h("div", { class: "coach" },
      bubble,
      h("div", { class: "coach__row" },
        h("img", { class: "coach__mascot coach__mascot--lola", src: C.arte.lola, alt: "" }),
        h("div", { class: "coach__center" },
          h("span", { class: "small", text: "Nivel " + (i + 1) + " de " + TOTAL }),
          dots(i)
        ),
        h("img", { class: "coach__mascot coach__mascot--david", src: C.arte.david, alt: "" })
      )
    );

    const node = makeScreen([
      h("div", { class: "stack-sm" },
        h("div", { class: "play-head" },
          h("img", { class: "play-logo", src: C.arte.logo, alt: "" }),
          h("div", { class: "play-head__text" },
            h("span", { class: "play-title", text: C.juego }),
            h("span", { class: "kicker", text: "Nivel " + (i + 1) + " · " + nivel.titulo })
          )
        ),
        h("div", { class: "hud" },
          hudItem("Movimientos", movesValue),
          hudItem("Puntos", goalValue)
        ),
        h("div", { class: "goal" }, goalFill)
      ),
      boardRoot,
      coach
    ], { play: true, tight: true });

    UI.show(node);

    /* --- Frases de ánimo --- */
    let milestone = 0;
    let lowSaid = false;
    let movesPlayed = 0;
    let lastMoves = nivel.movimientos;
    let lastCombo = 0;

    requestAnimationFrame(() => {
      board = new Match3(boardRoot, {
        rows: 8,
        cols: 8,
        types: C.tipos,
        moves: nivel.movimientos,
        goal: nivel.objetivo,

        onUpdate: function (snap) {
          movesValue.textContent = String(snap.movesLeft);
          movesValue.classList.toggle("is-low", snap.movesLeft <= 5);
          goalValue.textContent = Math.min(snap.cleared, snap.goal) + "/" + snap.goal;
          goalFill.style.width = Math.min(100, (snap.cleared / snap.goal) * 100) + "%";

          const pct = snap.cleared / snap.goal;

          while (milestone < C.motivacion.umbrales.length &&
                 pct >= C.motivacion.umbrales[milestone].pct) {
            say(C.motivacion.umbrales[milestone].texto);
            milestone++;
          }

          if (snap.movesLeft !== lastMoves) {
            lastMoves = snap.movesLeft;
            movesPlayed++;

            if (movesPlayed % 5 === 0) say(randomPhrase(C.motivacion.animar));
          }

          if (snap.combo >= 3 && snap.combo > lastCombo) {
            lastCombo = snap.combo;
            say(C.motivacion.combo);
          }

          if (!lowSaid && snap.movesLeft <= 5) {
            lowSaid = true;
            say(C.motivacion.poco);
          }
        },

        onWin: function () {
          state.level = i + 1;
          state.attempts = 0;
          saveState();
          recompensa(i);
        },

        onLose: function () {
          state.attempts += 1;
          saveState();
          perdido(i);
        }
      });

      board.start();
    });
  }

  /* --- Nivel superado ------------------------------------------------------ */

  function recompensa(i) {
    destroyBoard();
    const nivel = C.niveles[i];
    const palette = LEVEL_COLORS[i] || LEVEL_COLORS[0];

    UI.accent(palette[0], palette[1]);
    UI.progress(i + 1, TOTAL);

    const clueText = h("p", { class: "clue__text" });
    const note = h("p", { class: "clue__note" });

    const next = h("button", {
      class: "btn btn--wide",
      text: i < TOTAL - 1 ? "Siguiente nivel" : "Última pista"
    });
    next.addEventListener("click", () => {
      Sound.tap();
      if (i < TOTAL - 1) nivelIntro(i + 1);
      else final();
    });

    const node = makeScreen([
      h("img", { class: "clue-david", src: C.arte.david, alt: "" }),
      h("div", { class: "center stack-sm" },
        h("span", { class: "kicker", text: "Nivel superado" }),
        h("h2", { text: "Una pista más" })
      ),
      h("div", { class: "clue" },
        h("span", { class: "clue__label", text: "Pista " + (i + 1) + " de " + TOTAL }),
        clueText,
        note
      ),
      next
    ], { center: true });

    artBackdrop(node, C.arte.nivelSuperado);

    UI.show(node);
    UI.confetti({ count: 70 });

    setTimeout(async () => {
      await UI.typewriter(clueText, nivel.pista, 28);
      note.textContent = "“" + nivel.lola + "”";
      note.style.opacity = "0";
      note.style.transition = "opacity 500ms ease";
      requestAnimationFrame(() => { note.style.opacity = "1"; });
      Sound.ok();
    }, 420);
  }

  /* --- Sin movimientos ------------------------------------------------------ */

  function perdido(i) {
    destroyBoard();
    const nivel = C.niveles[i];
    const palette = LEVEL_COLORS[i] || LEVEL_COLORS[0];

    UI.accent(palette[0], palette[1]);

    const retry = h("button", { class: "btn btn--wide", text: "Reintentar" });
    retry.addEventListener("click", () => {
      Sound.tap();
      jugar(i);
    });

    const children = [
      h("div", { class: "center stack-sm" },
        h("span", { class: "kicker", text: "Sin movimientos" }),
        h("h2", { text: "Casi lo tienes" }),
        h("p", { text: "Te has quedado sin movimientos en el nivel " + (i + 1) + ". Otra vez, sin prisa." })
      ),
      retry
    ];

    if (state.attempts >= 2) {
      const skip = h("button", { class: "btn btn--link", text: "Ver la pista de todos modos" });
      skip.addEventListener("click", () => {
        Sound.tap();
        state.level = i + 1;
        state.attempts = 0;
        saveState();
        recompensa(i);
      });
      children.push(h("div", { class: "tc" }, skip));
    }

    UI.show(makeScreen(children, { center: true }));
  }

  /* --- Final ---------------------------------------------------------------- */

  function final() {
    destroyBoard();
    UI.accent("#ffb020", "#ff5d8f");
    UI.progress(TOTAL, TOTAL);

    const line = h("p", { class: "final__title" });
    const place = h("p", { class: "final__place hidden", text: C.final.lugar });
    const message = h("p", { class: "hidden", text: C.final.mensaje });
    const signature = h("p", { class: "signature hidden", text: C.final.firma });

    const again = h("button", { class: "btn btn--link hidden", text: "Volver a jugar" });
    again.addEventListener("click", () => {
      state = { level: 0, attempts: 0 };
      saveState();
      splash();
    });

    UI.show(makeScreen([
      h("div", { class: "center stack-sm" },
        h("span", { class: "kicker", text: C.final.kicker }),
        h("h2", { text: "Ya solo queda una cosa" })
      ),
      h("div", { class: "clue" }, line),
      place,
      h("div", { class: "center stack-sm" }, message, signature, again)
    ], { center: true }));

    setTimeout(async () => {
      await UI.typewriter(line, C.final.titulo + " ", 30);
      await UI.wait(260);

      const word = h("span", { class: "final__word", text: C.final.palabra + "." });
      line.append(word);

      Sound.win();
      UI.vibrate([20, 60, 20, 60, 60]);
      UI.confetti({ count: 150 });

      await UI.wait(750);
      place.classList.remove("hidden");
      message.classList.remove("hidden");
      signature.classList.remove("hidden");
      again.classList.remove("hidden");

      await UI.wait(420);
      UI.confetti({ count: 90 });
    }, 450);
  }

  /* --- Inicio ---------------------------------------------------------------- */

  if (vista === "intro") nivelIntro(vistaN - 1);
  else if (vista === "pista") recompensa(vistaN - 1);
  else if (vista === "final") final();
  else if (devIndex >= 0) jugar(devIndex);
  else splash();
})();
