/**
 * Catálogo de fontes recuperado de LIVENEXUS-BACKUP01.
 * Mantém apenas a lista de famílias e categorias tipográficas; não inclui o editor antigo.
 * As famílias Google Fonts são carregadas sob demanda pelo componente que as utilizar.
 */

export const FONT_CATEGORIES = {
  "Gamer / Esports": ["Chakra Petch", "Russo One", "Rajdhani"],
  "Futurista / Sci-Fi": ["Orbitron", "Audiowide", "Michroma", "Tomorrow", "Iceland"],
  "Tech / Cyber": [
    "Share Tech Mono",
    "Major Mono Display",
    "Syncopate",
    "Wallpoet",
    "JetBrains Mono",
    "Rubik Mono One",
    "monospace",
  ],
  "Pixel / Arcade": ["Press Start 2P", "VT323", "Pixelify Sans", "Silkscreen"],
  "Retrô": ["Monoton", "Bungee", "Bungee Shade", "Bangers", "Special Elite", "Rye"],
  "Stencil / Industrial": ["Bebas Neue", "Anton", "Oswald", "Teko", "Black Ops One"],
  "Graffiti / Urbana": ["Permanent Marker"],
  "Horror / Fantasia": [
    "Creepster",
    "Nosifer",
    "MedievalSharp",
    "UnifrakturMaguntia",
    "Pirata One",
  ],
  "Esportiva / Racing": ["Faster One", "Racing Sans One"],
  "Elegante / Clássica": ["Playfair Display", "Cinzel", "Poiret One"],
  Serifada: ["Merriweather", "EB Garamond", "Cormorant"],
  "Sans Moderna": ["Inter", "Space Grotesk", "Outfit", "Bricolage Grotesque"],
  "Script / Manuscrita": [
    "Caveat",
    "Kalam",
    "Pacifico",
    "Dancing Script",
    "Sacramento",
    "Great Vibes",
    "Tangerine",
  ],
  "Display / Decorativa": ["Unbounded", "Bagel Fat One"],
} as const;

export type FontCategory = keyof typeof FONT_CATEGORIES;

export const FONT_FAMILIES: string[] = [
  ...new Set(Object.values(FONT_CATEGORIES).flat()),
];
