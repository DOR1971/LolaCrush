/* ==========================================================================
   LOLACRUSH — configuración
   --------------------------------------------------------------------------
   Todo lo personal está aquí. El resto de archivos no hace falta tocarlos.
   ========================================================================== */

window.REGALO = {

  /* --- Persona ----------------------------------------------------------- */
  nombre: "Lola",
  titulo: "Señora de Otero",
  juego: "LolaCrush",
  remitente: "David",

  /* --- Arte -------------------------------------------------------------- */
  arte: {
    portada: "./assets/portada.jpg",
    nivelSuperado: "./assets/nivel-superado.jpg",
    logo: "./assets/icon-512.png",
    lola: "./assets/lola.png",
    david: "./assets/david.png"
  },

  /* --- Portada ----------------------------------------------------------- */
  inicio: {
    lema: "Tres niveles. Tres pistas. Un regalo escondido.",
    boton: "Jugar",
    nota: "Para la señora de Otero"
  },

  /* --- Frases mientras juega ---------------------------------------------
     Los umbrales son porcentajes del objetivo: al llegar, Lola dice la frase.
     ---------------------------------------------------------------------- */
  motivacion: {
    saludo: "Vamos, Lola. Tú puedes.",
    umbrales: [
      { pct: 0.20, texto: "¡Vas bien, Lola!" },
      { pct: 0.40, texto: "Sigue así, que ya te falta menos." },
      { pct: 0.60, texto: "Casi lo tienes, Lola." },
      { pct: 0.80, texto: "Ya te falta muy poco para tu pista." },
      { pct: 0.95, texto: "¡Un último empujón!" }
    ],
    animar: [
      "¡Muy bien, Lola!",
      "¡Qué buena!",
      "Así me gusta.",
      "¡Sigue, sigue!",
      "Eso es, Lola."
    ],
    combo: "¡Combo!",
    poco: "Te quedan pocos movimientos. ¡No aflojes!"
  },

  /* --- Piezas del tablero ------------------------------------------------
     Tema de boda: tacón, ramo, anillo, pintalabios y novia.
     ---------------------------------------------------------------------- */
  tipos: [
    { emoji: "👠", color: "#ff5d8f" },   // tacón
    { emoji: "💐", color: "#5fd18a" },   // ramo de novia
    { emoji: "💍", color: "#7cc7ff" },   // anillo solitario
    { emoji: "💄", color: "#ff8a5c" },   // pintalabios
    { emoji: "👰", color: "#d8c4ff" }    // vestido de novia
  ],

  /* --- Niveles ------------------------------------------------------------
     objetivo: puntos (cada icono vale 1)
     movimientos: intercambios disponibles
     Los valores salen de simular miles de partidas con el motor real.
     ---------------------------------------------------------------------- */
  niveles: [
    {
      titulo: "Calentando",
      objetivo: 125,
      movimientos: 22,
      pista: "Tienes un regalo escondido.",
      lola: "Bien hecho. El armario te lo agradece."
    },
    {
      titulo: "De compras",
      objetivo: 140,
      movimientos: 24,
      pista: "Cuando vas al supermercado, ¿qué necesitas para guardar la compra?",
      lola: "Piensa, Lola. Tú eso lo sabes perfectamente."
    },
    {
      titulo: "En marcha",
      objetivo: 155,
      movimientos: 26,
      pista: "Si no puedes ir en el Tesla, ¿en qué coche vas?",
      lola: "Casi lo tienes. Y no, el Tesla no cuenta."
    }
  ],

  /* --- Final ------------------------------------------------------------- */
  final: {
    kicker: "Última pista",
    titulo: "El regalo está en un coche donde guardas las",
    palabra: "bolsas",
    lugar: "El coche que no es el Tesla.",
    mensaje: "Ve a por él. Y luego me lo cuentas.",
    firma: "Felicidades, señora de Otero."
  }
};
