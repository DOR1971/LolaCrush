/* ==========================================================================
   LOLACRUSH — flujo de la aplicación
   Presentación → menú → (regalo | competitivo) → final / tienda
   ========================================================================== */

(function () {
  "use strict";

  const C = window.REGALO;
  const h = UI.h;
  const TOTAL = C.niveles.length;
  const PROFILE_KEY = "lolacrush-profile-v1";

  const LEVEL_COLORS = [
    ["#ff5d8f", "#ffb020"],
    ["#a06bff", "#ff7ac8"],
    ["#2fd3d3", "#7c5cff"]
  ];

  const SHOP = [
    {
      id: "moves",
      icon: "⚡",
      name: "+3 movimientos",
      text: "Tres movimientos extra en la partida.",
      price: 40
    },
    {
      id: "shuffle",
      icon: "🔀",
      name: "Mezclar",
      text: "Revuelve el tablero cuando se atasque.",
      price: 25
    }
  ];

  /* El modo regalo no guarda progreso; el perfil competitivo sí. */
  let state = { level: 0, attempts: 0 };
  let run = null;
  let board = null;

  /* --- Perfil competitivo ------------------------------------------------ */

  function loadProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return {
          coins: p.coins || 0,
          best: p.best || 0,
          items: {
            moves: (p.items && p.items.moves) || 0,
            shuffle: (p.items && p.items.shuffle) || 0
          }
        };
      }
    } catch (err) { /* sin almacenamiento */ }
    return { coins: 0, best: 0, items: { moves: 0, shuffle: 0 } };
  }

  function saveProfile() {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (err) { /* ignorar */ }
  }

  let profile = loadProfile();

  /* --- Parámetros del modo competitivo ---------------------------------- */

  function paramsLibre(nivel) {
    return {
      objetivo: 70 + (nivel - 1) * 35,
      movimientos: Math.min(22 + Math.floor((nivel - 1) / 2), 30)
    };
  }

  /* --- Atajos de pruebas ------------------------------------------------- */

  const params = new URLSearchParams(location.search);
  const devLevel = params.get("nivel");
  const devIndex = devLevel
    ? Math.max(0, Math.min(TOTAL - 1, (parseInt(devLevel, 10) || 1) - 1))
    : -1;
  const vista = params.get("vista");
  const vistaN = Math.max(1, Math.min(TOTAL, parseInt(params.get("n") || "1", 10) || 1));

  /* --- Sonido ------------------------------------------------------------ */

  function initAudio() {
    const unlock = () => {
      Sound.init();
      Sound.startMusic();
      window.removeEventListener("pointerdown", unlock);
    };
    window.addEventListener("pointerdown", unlock);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) Sound.pauseMusic();
      else Sound.resumeMusic();
    });
  }

  function mountMute() {
    const btn = h("button", { class: "mute-btn", "aria-label": "Sonido", title: "Sonido" }, "🔊");

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      Sound.init();
      const off = Sound.toggleMute();
      btn.textContent = off ? "🔇" : "🔊";
      btn.classList.toggle("is-muted", off);
    });

    document.getElementById("app").append(btn);
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

  /* --- Bocadillo y frases de ánimo (los usan los dos modos) --------------- */

  function crearSpeaker(bubble, textEl) {
    const queue = [];
    let speaking = false;

    function pump() {
      if (speaking || queue.length === 0) return;
      speaking = true;

      textEl.textContent = queue.shift();
      bubble.classList.remove("is-pop");
      void bubble.offsetWidth;
      bubble.classList.add("is-pop");

      setTimeout(() => {
        speaking = false;
        pump();
      }, 2300);
    }

    return function say(text) {
      if (!text) return;
      if (queue[queue.length - 1] === text) return;

      queue.push(text);
      if (queue.length > 2) queue.shift();
      pump();
    };
  }

  function crearMotivador(say, movimientos) {
    let milestone = 0;
    let lowSaid = false;
    let movesPlayed = 0;
    let lastMoves = movimientos;

    return function (snap) {
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

      if (!lowSaid && snap.movesLeft <= 5) {
        lowSaid = true;
        say(C.motivacion.poco);
      }
    };
  }

  /* --- Cartel de combo ---------------------------------------------------- */

  let comboEl = null;
  let comboTimer = null;

  function mostrarCombo(n) {
    if (!comboEl) {
      comboEl = h("div", { class: "combo-burst" },
        h("span", { class: "combo-burst__text" })
      );
      document.getElementById("app").append(comboEl);
    }

    const texto =
      n >= 6 ? "¡MEGACOMBO!" :
      n >= 4 ? "¡SUPERCOMBO!" :
      n >= 3 ? "¡COMBO x" + n + "!" :
      "¡COMBO!";

    comboEl.firstElementChild.textContent = texto;

    comboEl.classList.remove("is-on");
    void comboEl.offsetWidth;
    comboEl.classList.add("is-on");

    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => comboEl.classList.remove("is-on"), 950);

    Sound.combo(n);
    UI.vibrate([12, 30, 12]);
  }

  function menuLink() {
    const btn = h("button", { class: "btn btn--link", text: "Volver al menú" });
    btn.addEventListener("click", () => {
      Sound.tap();
      menu();
    });
    return btn;
  }

  function modeCard(icon, title, text, onClick) {
    const card = h("button", { class: "mode-card" },
      h("span", { class: "mode-card__icon", text: icon }),
      h("span", { class: "mode-card__body" },
        h("span", { class: "mode-card__title", text: title }),
        h("span", { class: "mode-card__text", text: text })
      ),
      h("span", { class: "mode-card__go", text: "›" })
    );

    card.addEventListener("click", () => {
      Sound.tap();
      onClick();
    });

    return card;
  }

  /* --- Presentación ------------------------------------------------------ */

  function splash() {
    destroyBoard();
    Sound.setMusicMode("calm");
    UI.accent("#ff5d8f", "#ffb020");
    UI.progress(0, TOTAL);

    const play = h("button", { class: "splash-play", "aria-label": "Jugar" });
    play.addEventListener("click", () => {
      Sound.init();
      Sound.startMusic();
      Sound.tap();
      menu();
    });

    const first = h("div", { class: "splash-layer splash-layer--1" },
      h("img", { class: "splash-img", src: C.arte.saludo, alt: "" })
    );

    const second = h("div", { class: "splash-layer splash-layer--2" },
      h("img", { class: "splash-img", src: C.arte.portada, alt: "" }),
      play
    );

    const node = h("div", { class: "screen screen--flush" }, first, second);

    setTimeout(() => {
      first.classList.add("is-out");
      second.classList.add("is-in");
    }, 3600);

    UI.show(node);
  }

  /* --- Menú de modos ------------------------------------------------------ */

  function menu() {
    destroyBoard();
    Sound.setMusicMode("calm");
    UI.accent("#ff5d8f", "#ffb020");
    UI.progress(state.level, TOTAL);

    const seguimos = state.level > 0 && state.level < TOTAL;
    const textoRegalo = seguimos
      ? "Continúa por el nivel " + (state.level + 1) + "."
      : "Tres niveles, tres pistas y un regalo escondido.";

    const regalo = modeCard("🎁", "El regalo de David", textoRegalo, () => nivelIntro(state.level));
    const comp = modeCard("🏆", "Competitivo", "Sube de nivel y suma puntos. Récord: " + profile.best, () => competitivo());

    UI.show(makeScreen([
      h("div", { class: "center stack-sm" },
        h("span", { class: "kicker", text: C.juego }),
        h("h2", { text: "Hola, Lola" }),
        h("p", { class: "lead", text: "¿A qué quieres jugar?" })
      ),
      regalo,
      comp,
      h("p", { class: "small tc", text: "Monedas: " + profile.coins })
    ], { center: true }));
  }

  /* --- Modo regalo -------------------------------------------------------- */

  function nivelIntro(i) {
    destroyBoard();
    Sound.setMusicMode("calm");

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
      h("img", { class: "clue-david", src: C.arte.davidPistas, alt: "" }),
      h("div", { class: "center stack-sm" },
        h("span", { class: "kicker", text: "Nivel " + (i + 1) + " de " + TOTAL }),
        h("h2", { text: nivel.titulo }),
        h("p", { class: "lead", text: "Consigue " + nivel.objetivo + " puntos." })
      ),
      h("div", { class: "hud" },
        hudItem("Movimientos", h("span", { class: "hud__value", text: String(nivel.movimientos) })),
        hudItem("Objetivo", h("span", { class: "hud__value", text: String(nivel.objetivo) }))
      ),
      play,
      h("p", { class: "small tc", text: "Toca dos piezas vecinas o deslízalas para cambiarlas." }),
      dots(i),
      menuLink()
    ], { center: true, tight: true }));
  }

  function jugar(i) {
    destroyBoard();
    Sound.setMusicMode("calm");

    const nivel = C.niveles[i];
    const palette = LEVEL_COLORS[i] || LEVEL_COLORS[0];

    UI.accent(palette[0], palette[1]);
    UI.progress(i, TOTAL);

    const movesValue = h("span", { class: "hud__value", text: String(nivel.movimientos) });
    const goalValue = h("span", { class: "hud__value", text: "0/" + nivel.objetivo });
    const goalFill = h("div", { class: "goal__fill" });
    const boardRoot = h("div", { class: "board-root" });

    const bubbleText = h("p", { class: "bubble__text", text: C.motivacion.saludo });
    const bubble = h("div", { class: "bubble" }, bubbleText);
    const say = crearSpeaker(bubble, bubbleText);

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

    const motivar = crearMotivador(say, nivel.movimientos);

    requestAnimationFrame(() => {
      board = new Match3(boardRoot, {
        rows: 8,
        cols: 8,
        types: C.tipos,
        moves: nivel.movimientos,
        goal: nivel.objetivo,
        onCombo: mostrarCombo,

        onUpdate: function (snap) {
          movesValue.textContent = String(snap.movesLeft);
          movesValue.classList.toggle("is-low", snap.movesLeft <= 5);
          goalValue.textContent = Math.min(snap.cleared, snap.goal) + "/" + snap.goal;
          goalFill.style.width = Math.min(100, (snap.cleared / snap.goal) * 100) + "%";

          motivar(snap);
        },

        onWin: function () {
          state.level = i + 1;
          state.attempts = 0;
          recompensa(i);
        },

        onLose: function () {
          state.attempts += 1;
          perdido(i);
        }
      });

      board.start();
    });
  }

  function recompensa(i) {
    destroyBoard();
    Sound.setMusicMode("calm");

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
      h("img", { class: "clue-david", src: C.arte.davidPistas, alt: "" }),
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
        recompensa(i);
      });
      children.push(h("div", { class: "tc" }, skip));
    }

    children.push(h("div", { class: "tc" }, menuLink()));

    UI.show(makeScreen(children, { center: true }));
  }

  /* --- Modo competitivo --------------------------------------------------- */

  function competitivo() {
    destroyBoard();
    Sound.setMusicMode("upbeat");
    UI.accent("#2fd3d3", "#7c5cff");
    UI.progress(0, 0);

    const jugarBtn = h("button", { class: "btn btn--wide", text: "Jugar" });
    jugarBtn.addEventListener("click", () => {
      Sound.tap();
      iniciarRun();
    });

    const tiendaBtn = h("button", { class: "btn btn--ghost btn--wide", text: "Tienda · " + profile.coins + " monedas" });
    tiendaBtn.addEventListener("click", () => {
      Sound.tap();
      tienda();
    });

    UI.show(makeScreen([
      h("div", { class: "center stack-sm" },
        h("span", { class: "kicker", text: "Modo competitivo" }),
        h("h2", { text: "A por puntos" }),
        h("p", { class: "lead", text: "Cada nivel pide más. Empieza con 70 puntos y 22 movimientos." })
      ),
      h("div", { class: "hud" },
        hudItem("Récord", h("span", { class: "hud__value", text: String(profile.best) })),
        hudItem("Monedas", h("span", { class: "hud__value", text: String(profile.coins) }))
      ),
      jugarBtn,
      tiendaBtn,
      h("div", { class: "tc" }, menuLink())
    ], { center: true, tight: true }));
  }

  function iniciarRun() {
    run = { level: 1, score: 0 };
    jugarLibre();
  }

  function powerButton(icon, label, count, onClick) {
    const countEl = h("span", { class: "power__count", text: String(count) });

    const btn = h("button", { class: "power", disabled: count <= 0 },
      h("span", { class: "power__icon", text: icon }),
      h("span", { class: "power__label", text: label }),
      countEl
    );

    btn.addEventListener("click", onClick);
    return btn;
  }

  function jugarLibre() {
    destroyBoard();
    Sound.setMusicMode("upbeat");

    const nivel = run.level;
    const p = paramsLibre(nivel);
    const palette = ["#2fd3d3", "#ffb020", "#ff5d8f", "#a06bff"][(nivel - 1) % 4];

    UI.accent(palette, "#7c5cff");
    UI.progress(0, 0);

    const movesValue = h("span", { class: "hud__value", text: String(p.movimientos) });
    const goalValue = h("span", { class: "hud__value", text: "0/" + p.objetivo });
    const goalFill = h("div", { class: "goal__fill" });
    const boardRoot = h("div", { class: "board-root" });
    const totalLabel = h("span", { class: "small", text: "Nivel " + nivel + " · Total " + run.score });

    const movesBtn = powerButton("⚡", "+3", profile.items.moves, () => {
      if (!board || board.ended || profile.items.moves <= 0) return;
      profile.items.moves -= 1;
      saveProfile();
      refreshPower();
      board.addMoves(3);
      Sound.ok();
      UI.toast("+3 movimientos");
    });

    const shuffleBtn = powerButton("🔀", "Mezclar", profile.items.shuffle, () => {
      if (!board || board.ended || profile.items.shuffle <= 0) return;
      profile.items.shuffle -= 1;
      saveProfile();
      refreshPower();
      board.powerShuffle();
      Sound.whoosh();
    });

    function refreshPower() {
      movesBtn.disabled = profile.items.moves <= 0;
      shuffleBtn.disabled = profile.items.shuffle <= 0;
      movesBtn.querySelector(".power__count").textContent = String(profile.items.moves);
      shuffleBtn.querySelector(".power__count").textContent = String(profile.items.shuffle);
    }

    const bubbleText = h("p", { class: "bubble__text", text: C.motivacion.saludo });
    const bubble = h("div", { class: "bubble" }, bubbleText);
    const say = crearSpeaker(bubble, bubbleText);
    const motivar = crearMotivador(say, p.movimientos);

    const node = makeScreen([
      h("div", { class: "stack-sm" },
        h("div", { class: "play-head" },
          h("img", { class: "play-logo", src: C.arte.logo, alt: "" }),
          h("div", { class: "play-head__text" },
            h("span", { class: "play-title", text: C.juego }),
            h("span", { class: "kicker", text: "Competitivo · Nivel " + nivel })
          )
        ),
        h("div", { class: "hud" },
          hudItem("Movimientos", movesValue),
          hudItem("Puntos", goalValue)
        ),
        h("div", { class: "goal" }, goalFill)
      ),
      boardRoot,
      h("div", { class: "coach" },
        bubble,
        h("div", { class: "coach__row" },
          h("img", { class: "coach__mascot coach__mascot--lola", src: C.arte.lola, alt: "" }),
          h("div", { class: "coach__center" },
            h("div", { class: "powerbar" }, movesBtn, shuffleBtn),
            totalLabel
          ),
          h("img", { class: "coach__mascot coach__mascot--david", src: C.arte.david, alt: "" })
        )
      )
    ], { play: true, tight: true });

    UI.show(node);

    requestAnimationFrame(() => {
      board = new Match3(boardRoot, {
        rows: 8,
        cols: 8,
        types: C.tiposLibres[(nivel - 1) % C.tiposLibres.length],
        moves: p.movimientos,
        goal: p.objetivo,
        onCombo: mostrarCombo,

        onUpdate: function (snap) {
          movesValue.textContent = String(snap.movesLeft);
          movesValue.classList.toggle("is-low", snap.movesLeft <= 5);
          goalValue.textContent = Math.min(snap.cleared, snap.goal) + "/" + snap.goal;
          goalFill.style.width = Math.min(100, (snap.cleared / snap.goal) * 100) + "%";
          totalLabel.textContent = "Nivel " + nivel + " · Total " + (run.score + snap.cleared);

          motivar(snap);
        },

        onWin: function () {
          run.score += board ? board.cleared : p.objetivo;
          run.level += 1;
          nivelSuperadoLibre(nivel);
        },

        onLose: function () {
          run.score += board ? board.cleared : 0;
          finPartida();
        }
      });

      board.start();
    });
  }

  function nivelSuperadoLibre(nivel) {
    destroyBoard();
    Sound.setMusicMode("upbeat");
    UI.accent("#2fd3d3", "#ffb020");
    UI.progress(0, 0);

    const next = paramsLibre(run.level);

    const go = h("button", { class: "btn btn--wide", text: "Siguiente nivel" });
    go.addEventListener("click", () => {
      Sound.tap();
      jugarLibre();
    });

    UI.show(makeScreen([
      h("img", { class: "clue-david", src: C.arte.davidPistas, alt: "" }),
      h("div", { class: "center stack-sm" },
        h("span", { class: "kicker", text: "Nivel " + nivel + " superado" }),
        h("h2", { text: "¡Bien!" }),
        h("p", { class: "lead", text: "Llevas " + run.score + " puntos." })
      ),
      h("div", { class: "clue" },
        h("span", { class: "clue__label", text: "Siguiente" }),
        h("p", { class: "clue__text", text: "Nivel " + run.level + " · " + next.objetivo + " puntos · " + next.movimientos + " movimientos" })
      ),
      go,
      h("div", { class: "tc" }, menuLink())
    ], { center: true }));

    UI.confetti({ count: 50 });
  }

  function finPartida() {
    destroyBoard();
    Sound.setMusicMode("upbeat");
    UI.accent("#ff5d8f", "#ffb020");
    UI.progress(0, 0);

    const ganadas = Math.floor(run.score / 25) + 5 * (run.level - 1);
    profile.coins += ganadas;

    const nuevoRecord = run.score > profile.best;
    if (nuevoRecord) profile.best = run.score;
    saveProfile();

    const again = h("button", { class: "btn btn--wide", text: "Otra vez" });
    again.addEventListener("click", () => {
      Sound.tap();
      iniciarRun();
    });

    const shop = h("button", { class: "btn btn--ghost btn--wide", text: "Tienda · " + profile.coins + " monedas" });
    shop.addEventListener("click", () => {
      Sound.tap();
      tienda();
    });

    UI.show(makeScreen([
      h("div", { class: "center stack-sm" },
        h("span", { class: "kicker", text: "Fin de la partida" }),
        h("h2", { text: run.score + " puntos" }),
        h("p", { class: "lead", text: nuevoRecord ? "¡Nuevo récord!" : "Récord: " + profile.best })
      ),
      h("div", { class: "clue" },
        h("span", { class: "clue__label", text: "Has ganado" }),
        h("p", { class: "clue__text", text: "+" + ganadas + " monedas" })
      ),
      again,
      shop,
      h("div", { class: "tc" }, menuLink())
    ], { center: true }));

    if (nuevoRecord) {
      UI.confetti({ count: 90 });
      Sound.win();
    }
  }

  /* --- Tienda -------------------------------------------------------------- */

  function tienda() {
    destroyBoard();
    Sound.setMusicMode("upbeat");
    UI.accent("#2fd3d3", "#ffb020");
    UI.progress(0, 0);

    const items = SHOP.map((item) => {
      const tengo = profile.items[item.id] || 0;
      const puede = profile.coins >= item.price;

      const buy = h("button", {
        class: "btn btn--small" + (puede ? "" : " is-disabled"),
        text: item.price + " 🪙",
        disabled: !puede
      });

      buy.addEventListener("click", () => {
        if (profile.coins < item.price) return;
        profile.coins -= item.price;
        profile.items[item.id] = (profile.items[item.id] || 0) + 1;
        saveProfile();
        Sound.ok();
        tienda();
      });

      return h("div", { class: "shop-item" },
        h("span", { class: "shop-item__icon", text: item.icon }),
        h("span", { class: "shop-item__body" },
          h("span", { class: "shop-item__name", text: item.name }),
          h("span", { class: "shop-item__text", text: item.text }),
          h("span", { class: "shop-item__own", text: "Tienes: " + tengo })
        ),
        buy
      );
    });

    const back = h("button", { class: "btn btn--ghost btn--wide", text: "Volver" });
    back.addEventListener("click", () => {
      Sound.tap();
      competitivo();
    });

    UI.show(makeScreen([
      h("div", { class: "center stack-sm" },
        h("span", { class: "kicker", text: "Tienda" }),
        h("h2", { text: profile.coins + " monedas" }),
        h("p", { class: "small", text: "Gana monedas jugando al modo competitivo." })
      ),
      ...items,
      back
    ], { center: true, tight: true }));
  }

  /* --- Final del regalo ---------------------------------------------------- */

  function final() {
    destroyBoard();
    Sound.setMusicMode("calm");
    UI.accent("#ffb020", "#ff5d8f");
    UI.progress(TOTAL, TOTAL);

    const line = h("p", { class: "final__title" });
    const place = h("p", { class: "final__place hidden", text: C.final.lugar });
    const message = h("p", { class: "hidden", text: C.final.mensaje });
    const signature = h("p", { class: "signature hidden", text: C.final.firma });

    const again = h("button", { class: "btn btn--link hidden", text: "Volver al menú" });
    again.addEventListener("click", () => {
      state = { level: 0, attempts: 0 };
      menu();
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

  initAudio();
  mountMute();

  if (vista === "menu") menu();
  else if (vista === "intro") nivelIntro(vistaN - 1);
  else if (vista === "pista") recompensa(vistaN - 1);
  else if (vista === "final") final();
  else if (vista === "tienda") tienda();
  else if (vista === "competitivo") competitivo();
  else if (vista === "libre") {
    run = { level: Math.max(1, parseInt(params.get("n") || "1", 10) || 1), score: 0 };
    jugarLibre();
  }
  else if (devIndex >= 0) jugar(devIndex);
  else splash();
})();
