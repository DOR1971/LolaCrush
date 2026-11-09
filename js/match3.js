/* ==========================================================================
   FASHION MATCH — motor de tablero
   --------------------------------------------------------------------------
   Tablero 8x8 con piezas intercambiables. Detecta líneas de 3 o más, las
   elimina, deja caer las piezas y rellena por arriba. Sin dependencias.
   ========================================================================== */

class Match3 {
  constructor(root, opts) {
    this.root = root;
    this.rows = opts.rows || 8;
    this.cols = opts.cols || 8;
    this.types = opts.types;
    this.moves = opts.moves;
    this.goal = opts.goal;

    this.onUpdate = opts.onUpdate || function () {};
    this.onWin = opts.onWin || function () {};
    this.onLose = opts.onLose || function () {};
    this.onCombo = opts.onCombo || null;

    this.el = document.createElement("div");
    this.el.className = "board";
    root.append(this.el);

    this.grid = [];
    this.size = 40;
    this.movesLeft = this.moves;
    this.cleared = 0;
    this.combo = 0;
    this.selected = null;
    this.down = null;
    this.busy = false;
    this.ended = false;
    this.ro = null;

    this.onResize = this.relayout.bind(this);
    this.onPointerUp = this.handleUp.bind(this);
    this.onPointerCancel = this.handleCancel.bind(this);
    this.onPointerDown = this.handleDown.bind(this);
  }

  /* --- Arranque --------------------------------------------------------- */

  start() {
    this.measure();
    this.build();
    this.bind();
    this.emit();

    if (window.ResizeObserver) {
      this.ro = new ResizeObserver(() => this.relayout());
      this.ro.observe(this.root);
    } else {
      window.addEventListener("resize", this.onResize);
    }
  }

  destroy() {
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerCancel);
    if (this.ro) this.ro.disconnect();
    else window.removeEventListener("resize", this.onResize);
    this.el.remove();
  }

  /* --- Medidas ---------------------------------------------------------- */

  measure() {
    const width = this.root.clientWidth || 320;
    const raw = Math.min(width, 460) / this.cols;
    this.size = Math.max(28, Math.floor(raw));
    this.el.style.setProperty("--tile", this.size + "px");
    this.el.style.width = this.size * this.cols + "px";
    this.el.style.height = this.size * this.rows + "px";
  }

  relayout() {
    if (this.ended) return;
    const prev = this.size;
    this.measure();
    if (prev === this.size) return;
    for (const tile of this.allTiles()) this.place(tile, false);
  }

  /* --- Construcción del tablero ----------------------------------------- */

  build() {
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    this.el.replaceChildren();

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        let type = this.randType();
        let guard = 0;
        while (this.createsRun(r, c, type) && guard++ < 40) {
          type = this.randType();
        }
        this.makeTile(r, c, type);
      }
    }

    if (!this.hasMove()) this.reshuffle();
  }

  randType() {
    return Math.floor(Math.random() * this.types.length);
  }

  createsRun(r, c, type) {
    const g = this.grid;
    if (c >= 2 && g[r][c - 1] && g[r][c - 2] &&
        g[r][c - 1].type === type && g[r][c - 2].type === type) return true;
    if (r >= 2 && g[r - 1][c] && g[r - 2][c] &&
        g[r - 1][c].type === type && g[r - 2][c].type === type) return true;
    return false;
  }

  makeTile(r, c, type) {
    const conf = this.types[type];

    const el = document.createElement("div");
    el.className = "tile";

    const face = document.createElement("div");
    face.className = "tile__face";
    face.textContent = conf.emoji;
    face.style.setProperty("--tc", conf.color);

    el.append(face);

    const tile = { el, face, type, r, c };
    this.el.append(el);
    this.grid[r][c] = tile;
    this.place(tile, false);

    return tile;
  }

  setType(tile, type) {
    const conf = this.types[type];
    tile.type = type;
    tile.face.textContent = conf.emoji;
    tile.face.style.setProperty("--tc", conf.color);
  }

  place(tile, animate, yOverride) {
    const x = tile.c * this.size;
    const y = (yOverride === undefined ? tile.r : yOverride) * this.size;

    if (animate) {
      tile.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    } else {
      tile.el.style.transition = "none";
      tile.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      void tile.el.offsetWidth;
      tile.el.style.transition = "";
    }
  }

  allTiles() {
    const out = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c]) out.push(this.grid[r][c]);
      }
    }
    return out;
  }

  /* --- Detección de líneas ---------------------------------------------- */

  findRuns() {
    const g = this.grid;
    const matched = new Set();

    for (let r = 0; r < this.rows; r++) {
      let run = 1;
      for (let c = 1; c <= this.cols; c++) {
        const same =
          c < this.cols &&
          g[r][c] && g[r][c - 1] &&
          g[r][c].type === g[r][c - 1].type;

        if (same) {
          run++;
        } else {
          if (run >= 3) {
            for (let k = c - run; k < c; k++) matched.add(g[r][k]);
          }
          run = 1;
        }
      }
    }

    for (let c = 0; c < this.cols; c++) {
      let run = 1;
      for (let r = 1; r <= this.rows; r++) {
        const same =
          r < this.rows &&
          g[r][c] && g[r - 1][c] &&
          g[r][c].type === g[r - 1][c].type;

        if (same) {
          run++;
        } else {
          if (run >= 3) {
            for (let k = r - run; k < r; k++) matched.add(g[k][c]);
          }
          run = 1;
        }
      }
    }

    return matched;
  }

  /* --- Resolución de cascadas ------------------------------------------- */

  async resolve() {
    let combo = 0;

    while (true) {
      const runs = this.findRuns();
      if (runs.size === 0) break;

      combo++;
      this.cleared += runs.size;
      Sound.match(combo);

      if (this.onCombo && combo >= 2) this.onCombo(combo);

      runs.forEach((t) => t.face.classList.add("is-clearing"));
      await wait(190);

      runs.forEach((t) => {
        if (this.grid[t.r][t.c] === t) this.grid[t.r][t.c] = null;
        t.el.remove();
      });

      await this.collapse();
      this.emit();
    }

    return combo;
  }

  async collapse() {
    let moved = false;

    for (let c = 0; c < this.cols; c++) {
      let write = this.rows - 1;

      for (let r = this.rows - 1; r >= 0; r--) {
        const tile = this.grid[r][c];
        if (!tile) continue;

        if (r !== write) {
          this.grid[write][c] = tile;
          this.grid[r][c] = null;
          tile.r = write;
          this.place(tile, true);
          moved = true;
        }
        write--;
      }

      const missing = write + 1;
      for (let i = 0; i < missing; i++) {
        const r = write - i;
        const tile = this.makeTile(r, c, this.randType());
        this.place(tile, false, -1 - i);
        requestAnimationFrame(() => this.place(tile, true));
      }
      if (missing > 0) moved = true;
    }

    if (moved) await wait(270);
  }

  /* --- Intercambios ------------------------------------------------------ */

  async attemptSwap(a, b) {
    if (this.busy || this.ended) return;

    const t1 = this.grid[a.r][a.c];
    const t2 = this.grid[b.r][b.c];
    if (!t1 || !t2) return;

    this.busy = true;
    this.clearSelection();
    this.combo = 0;
    Sound.swap();

    this.swapCells(a, b);
    await wait(240);

    if (this.findRuns().size === 0) {
      this.swapCells(a, b);
      Sound.error();
      UI.vibrate(18);
      await wait(240);
      this.busy = false;
      return;
    }

    this.movesLeft--;
    this.emit();

    const combo = await this.resolve();
    this.combo = combo;
    this.emit();

    if (!this.hasMove()) {
      UI.toast("No quedan jugadas. Mezclando el armario…", 1300);
      await this.reshuffle();
    }

    this.busy = false;

    if (this.cleared >= this.goal) {
      this.ended = true;
      Sound.win();
      UI.vibrate([15, 50, 15, 50, 35]);
      await wait(340);
      this.onWin();
    } else if (this.movesLeft <= 0) {
      this.ended = true;
      await wait(280);
      this.onLose();
    }
  }

  swapCells(a, b) {
    const t1 = this.grid[a.r][a.c];
    const t2 = this.grid[b.r][b.c];

    this.grid[a.r][a.c] = t2;
    this.grid[b.r][b.c] = t1;

    t2.r = a.r;
    t2.c = a.c;
    t1.r = b.r;
    t1.c = b.c;

    this.place(t2, true);
    this.place(t1, true);
  }

  hasMove() {
    const g = this.grid;
    const check = () => this.findRuns().size > 0;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (c + 1 < this.cols) {
          [g[r][c], g[r][c + 1]] = [g[r][c + 1], g[r][c]];
          const ok = check();
          [g[r][c], g[r][c + 1]] = [g[r][c + 1], g[r][c]];
          if (ok) return true;
        }
        if (r + 1 < this.rows) {
          [g[r][c], g[r + 1][c]] = [g[r + 1][c], g[r][c]];
          const ok = check();
          [g[r][c], g[r + 1][c]] = [g[r + 1][c], g[r][c]];
          if (ok) return true;
        }
      }
    }
    return false;
  }

  async reshuffle() {
    const tiles = this.allTiles();
    let guard = 0;

    do {
      const types = UI.shuffle(tiles.map((t) => t.type));
      tiles.forEach((t, i) => this.setType(t, types[i]));
      guard++;
    } while ((this.findRuns().size > 0 || !this.hasMove()) && guard < 80);

    this.emit();
    await wait(140);
  }

  /* --- Entrada táctil ---------------------------------------------------- */

  bind() {
    this.el.addEventListener("pointerdown", this.onPointerDown);
    this.el.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerCancel);
  }

  handleDown(e) {
    if (this.busy || this.ended) return;
    const cell = this.cellAt(e.clientX, e.clientY);
    if (!cell) return;
    e.preventDefault();
    this.down = { cell, x: e.clientX, y: e.clientY };
  }

  handleCancel() {
    this.down = null;
  }

  handleUp(e) {
    const down = this.down;
    this.down = null;

    if (!down || this.busy || this.ended) return;

    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.size * 0.42) {
      let dr = 0;
      let dc = 0;
      if (Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
      else dr = dy > 0 ? 1 : -1;

      const target = { r: down.cell.r + dr, c: down.cell.c + dc };
      if (this.inside(target)) this.attemptSwap(down.cell, target);
      return;
    }

    this.handleTap(down.cell);
  }

  handleTap(cell) {
    const tile = this.grid[cell.r][cell.c];
    if (!tile) return;

    if (this.selected && this.selected.r === cell.r && this.selected.c === cell.c) {
      this.clearSelection();
      return;
    }

    if (this.selected && this.adjacent(this.selected, cell)) {
      const from = this.selected;
      this.clearSelection();
      this.attemptSwap(from, cell);
      return;
    }

    this.clearSelection();
    this.selected = { r: cell.r, c: cell.c };
    tile.el.classList.add("is-selected");
    Sound.select();
    UI.vibrate(8);
  }

  clearSelection() {
    if (this.selected) {
      const row = this.grid[this.selected.r];
      const tile = row && row[this.selected.c];
      if (tile) tile.el.classList.remove("is-selected");
    }
    this.selected = null;
  }

  cellAt(x, y) {
    const rect = this.el.getBoundingClientRect();
    const c = Math.floor((x - rect.left) / this.size);
    const r = Math.floor((y - rect.top) / this.size);

    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return null;
    return { r, c };
  }

  inside(cell) {
    return cell.r >= 0 && cell.r < this.rows && cell.c >= 0 && cell.c < this.cols;
  }

  adjacent(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  }

  /* --- Ayudas externas (tienda) ----------------------------------------- */

  addMoves(n) {
    if (this.ended) return;
    this.movesLeft += n;
    this.emit();
  }

  async powerShuffle() {
    if (this.busy || this.ended) return false;
    this.busy = true;
    await this.reshuffle();
    this.busy = false;
    return true;
  }

  /* --- Estado ------------------------------------------------------------ */

  emit() {
    this.onUpdate({
      movesLeft: this.movesLeft,
      cleared: this.cleared,
      goal: this.goal,
      combo: this.combo
    });
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
