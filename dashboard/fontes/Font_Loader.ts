import { FONT_FAMILIES } from "./Font_Catalog";

const GOOGLE_FONTS_STYLESHEET_ID = "livenexus-google-fonts";

/**
 * Carrega as famílias tipográficas do catálogo a partir do Google Fonts.
 * O repositório de origem utilizava fontes remotas; não havia arquivos
 * .woff/.woff2 locais para copiar.
 */
export function loadGoogleFont(fontFamily: string): void {
  if (typeof document === "undefined" || !fontFamily || isSystemFont(fontFamily)) return;

  const linkId = getFontLinkId(fontFamily);
  if (document.getElementById(linkId)) return;

  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = buildGoogleFontsUrl([fontFamily]);
  document.head.appendChild(link);
}

/** Carrega todas as fontes do catálogo em uma única folha de estilos. */
export function loadAllGoogleFonts(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(GOOGLE_FONTS_STYLESHEET_ID)) return;

  const families = FONT_FAMILIES.filter((font) => !isSystemFont(font));
  const link = document.createElement("link");
  link.id = GOOGLE_FONTS_STYLESHEET_ID;
  link.rel = "stylesheet";
  link.href = buildGoogleFontsUrl(families);
  document.head.appendChild(link);
}

function isSystemFont(fontFamily: string): boolean {
  return fontFamily === "monospace" || fontFamily === "sans-serif";
}

function getFontLinkId(fontFamily: string): string {
  return `livenexus-font-${fontFamily.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function buildGoogleFontsUrl(families: string[]): string {
  const params = families
    .map((family) => `family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
