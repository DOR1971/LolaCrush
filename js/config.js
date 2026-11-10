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
    introVideo: "./assets/intro.mp4",
    introPoster: "./assets/intro-poster.jpg",
    presentacionVideo: "./assets/presentacion.mp4",
    presentacionPoster: "./assets/presentacion-poster.jpg",
    regaloVideo: "./assets/regalo.mp4",
    regaloPoster: "./assets/regalo-poster.jpg",
    nivelSuperado: "./assets/nivel-superado.jpg",
    logo: "./assets/icon-512.png",
    lola: "./assets/lola-anim.webp",
    david: "./assets/david.png",
    davidPistas: "./assets/david-anim.webp"
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
    poco: "Te quedan pocos movimientos. ¡No aflojes!"
  },

  /* --- Frases del modo competitivo (aquí no hay pistas) ------------------- */
  motivacionLibre: {
    saludo: "Vamos, Lola. A por puntos.",
    umbrales: [
      { pct: 0.20, texto: "¡Vas bien, Lola!" },
      { pct: 0.40, texto: "Sigue así, que subes de nivel." },
      { pct: 0.60, texto: "Casi lo tienes." },
      { pct: 0.80, texto: "Ya queda poco para el siguiente nivel." },
      { pct: 0.95, texto: "¡Un último empujón!" }
    ],
    animar: [
      "¡Muy bien, Lola!",
      "¡Qué buena!",
      "Así me gusta.",
      "¡Sigue, sigue!",
      "Eso es, Lola."
    ],
    poco: "Te quedan pocos movimientos. ¡No aflojes!"
  },

  /* --- Piezas del tablero ------------------------------------------------
     Tacón, corazones, anillo, labios y regalo.
     ---------------------------------------------------------------------- */
  tipos: [
    { emoji: "👠", color: "#ff5d8f" },   // tacón
    { emoji: "💕", color: "#b388ff" },   // corazones
    { emoji: "💍", color: "#7cc7ff" },   // anillo solitario
    { emoji: "👄", color: "#ff8a5c" },   // labios
    { emoji: "🎁", color: "#5fd18a" }    // regalo
  ],

  /* --- Piezas del modo competitivo ---------------------------------------
     Cada nivel usa un juego distinto de cinco piezas, cada una con su color.
     ---------------------------------------------------------------------- */
  tiposLibres: [
    [
      { emoji: "🍓", color: "#5fd18a" },
      { emoji: "🍋", color: "#b388ff" },
      { emoji: "🍇", color: "#ffc93c" },
      { emoji: "🍊", color: "#7cc7ff" },
      { emoji: "🥝", color: "#ff5d8f" }
    ],
    [
      { emoji: "🍩", color: "#b388ff" },
      { emoji: "🍪", color: "#5fd18a" },
      { emoji: "🧁", color: "#7cc7ff" },
      { emoji: "🍬", color: "#ffc93c" },
      { emoji: "🍭", color: "#ff5d8f" }
    ],
    [
      { emoji: "🐠", color: "#7cc7ff" },
      { emoji: "🐙", color: "#ffc93c" },
      { emoji: "🐚", color: "#b388ff" },
      { emoji: "🦀", color: "#5fd18a" },
      { emoji: "🐬", color: "#ff5d8f" }
    ],
    [
      { emoji: "🎈", color: "#5fd18a" },
      { emoji: "🎉", color: "#b388ff" },
      { emoji: "🍾", color: "#7cc7ff" },
      { emoji: "🎁", color: "#ffc93c" },
      { emoji: "🥳", color: "#ff5d8f" }
    ],
    [
      { emoji: "🐶", color: "#7cc7ff" },
      { emoji: "🐱", color: "#b388ff" },
      { emoji: "🐰", color: "#ff5d8f" },
      { emoji: "🦊", color: "#5fd18a" },
      { emoji: "🐼", color: "#ffc93c" }
    ]
  ],

  /* --- Niveles ------------------------------------------------------------
     objetivo: puntos (cada icono vale 1)
     movimientos: intercambios disponibles
     Los valores salen de simular miles de partidas con el motor real.
     ---------------------------------------------------------------------- */
  niveles: [
    {
      titulo: "Calentando",
      objetivo: 135,
      movimientos: 22,
      pista: "Tienes un regalo escondido.",
      lola: "Bien hecho. El armario te lo agradece."
    },
    {
      titulo: "De compras",
      objetivo: 150,
      movimientos: 24,
      pista: "Cuando vas al supermercado, ¿qué necesitas para guardar la compra?",
      lola: "Piensa, Lola. Tú eso lo sabes perfectamente."
    },
    {
      titulo: "En marcha",
      objetivo: 165,
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
