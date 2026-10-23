/**
 * Catálogo de fontes recuperado de LIVENEXUS-BACKUP01.
 * Mantém apenas a lista de famílias e categorias tipográficas; não inclui o editor antigo.
 * As famílias Google Fonts são carregadas sob demanda pelo componente que as utilizar.
 */

const BACKUP01_FONT_CATEGORIES = {
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
  Retrô: ["Monoton", "Bungee", "Bungee Shade", "Bangers", "Special Elite", "Rye"],
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

const DISTINCT_ADDITIONAL_FONT_CATEGORIES = {
  "Gamer / Esports": ["Oxanium", "Quantico", "Sarpanch", "Turret Road", "Days One"],
  "Futurista / Sci-Fi": ["Aldrich", "Exo 2", "Electrolize", "Geostar"],
  "Tech / Cyber": [
    "IBM Plex Mono",
    "Fira Code",
    "Inconsolata",
    "Space Mono",
    "Red Hat Mono",
    "Anonymous Pro",
  ],
  "Pixel / Arcade": ["DotGothic16", "Tiny5", "Micro 5"],
  Retrô: ["Limelight", "Righteous", "Titan One"],
  "Stencil / Industrial": ["Saira Stencil One", "Graduate", "Staatliches"],
  "Graffiti / Urbana": ["Rubik Spray Paint", "Modak", "Akronim", "Plaster"],
  "Horror / Fantasia": ["Butcherman", "Eater", "Fruktur", "UnifrakturCook", "Metal Mania"],
  "Esportiva / Racing": [],
  "Elegante / Clássica": ["Bodoni Moda", "DM Serif Display", "Instrument Serif", "Fraunces"],
  Serifada: [
    "Lora",
    "Bitter",
    "Literata",
    "Crimson Pro",
    "Spectral",
    "Source Serif 4",
    "Alegreya",
    "Arvo",
    "Cardo",
    "Vollkorn",
  ],
  "Sans Moderna": [
    "Manrope",
    "DM Sans",
    "Plus Jakarta Sans",
    "Urbanist",
    "Onest",
    "Figtree",
    "Rubik",
    "Work Sans",
    "IBM Plex Sans",
    "Source Sans 3",
    "Public Sans",
    "Nunito Sans",
    "Be Vietnam Pro",
    "Assistant",
    "Atkinson Hyperlegible",
  ],
  "Script / Manuscrita": [
    "Allura",
    "Alex Brush",
    "Cookie",
    "Lobster",
    "Yellowtail",
    "Satisfy",
    "Oleo Script",
    "Yesteryear",
    "Merienda",
    "Kaushan Script",
  ],
  "Display / Decorativa": ["Lilita One", "Sigmar", "Chonburi", "Gasoek One"],
} as const;

export const FONT_CATEGORIES = Object.fromEntries(
  Object.entries(BACKUP01_FONT_CATEGORIES).map(([category, families]) => [
    category,
    [
      ...families,
      ...(DISTINCT_ADDITIONAL_FONT_CATEGORIES[
        category as keyof typeof DISTINCT_ADDITIONAL_FONT_CATEGORIES
      ] ?? []),
    ],
  ]),
) as {
  [K in keyof typeof BACKUP01_FONT_CATEGORIES]: readonly string[];
};

export type FontCategory = keyof typeof FONT_CATEGORIES;

export const FONT_FAMILIES: string[] = [...new Set(Object.values(FONT_CATEGORIES).flat())];

export const FONT_FAMILY_COUNT = FONT_FAMILIES.length;
export const FONT_SOURCE = "https://github.com/google/fonts";
