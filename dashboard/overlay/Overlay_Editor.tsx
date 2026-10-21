import { useState, type CSSProperties, type ComponentType } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import HorizontalMenu from "../components/HorizontalMenu";
import { FONT_CATEGORIES } from "../fontes/Font_Catalog";
import { loadGoogleFont } from "../fontes/Font_Loader";
import { getWidgetInternalElements, isWidgetFragmentable } from "./Overlay_widgetElements";

type WidgetDefinition = {
  id: string;
  name: string;
  component: ComponentType<{ config?: Record<string, unknown> }>;
  implemented?: boolean;
};

type OverlayEditorProps = {
  className?: string;
  height?: number;
  catalog: WidgetDefinition[];
  onAddFragment: (definition: WidgetDefinition, elementKey: string, label: string) => void;
  onAddText: (text: string, fontSize: number, color: string, fontFamily: string) => void;
};

const MENUS = ["INICIO", "TEXTO", "ANIMACAO", "IMAGEMS", "ALINHAMENTO", "FORMAS", "EMOJES", "CAMADAS"] as const;
type MenuName = (typeof MENUS)[number];

const buttonClass = "shrink-0 rounded-md border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 transition hover:border-violet-400/60 hover:bg-violet-500/20 hover:text-white";
const activeButtonClass = "shrink-0 rounded-md border border-violet-400 bg-violet-500/20 px-3 py-1.5 text-xs text-white";

export default function Overlay_Editor({
  className = "",
  height = 220,
  catalog,
  onAddFragment,
  onAddText,
}: OverlayEditorProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuName>("INICIO");
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [selectedFontCategory, setSelectedFontCategory] = useState<keyof typeof FONT_CATEGORIES | null>(null);
  const [selectedFont, setSelectedFont] = useState("Inter");
  const [textValue, setTextValue] = useState("Novo texto");
  const [fontSize, setFontSize] = useState(32);
  const [textColor, setTextColor] = useState("#ffffff");
  const panelHeight = `min(${Math.max(190, height)}px, 34vh)`;
  const style: CSSProperties = {
    height: isCollapsed ? "0px" : panelHeight,
    transition: "height 220ms ease",
  };

  const fragmentableWidgets = catalog.filter((widget) => widget.implemented !== false && isWidgetFragmentable(widget.id));
  const selectedWidget = fragmentableWidgets.find((widget) => widget.id === selectedWidgetId);
  const fragments = selectedWidget ? getWidgetInternalElements(selectedWidget.id) : [];

  function chooseFont(font: string) {
    setSelectedFont(font);
    loadGoogleFont(font);
  }

  return (
    <section
      role="region"
      aria-label="Editor de overlay"
      data-overlay-editor
      className={`fixed inset-x-0 bottom-0 z-[80] w-full overflow-visible border-t border-white/15 bg-slate-950 text-slate-100 shadow-2xl ${className}`}
      style={style}
    >
      <button
        type="button"
        onClick={() => setIsCollapsed((collapsed) => !collapsed)}
        aria-label={isCollapsed ? "Mostrar editor de overlay" : "Recolher editor de overlay"}
        aria-expanded={!isCollapsed}
        title={isCollapsed ? "Mostrar editor" : "Recolher editor"}
        className="absolute -top-9 right-4 inline-flex h-8 w-10 items-center justify-center rounded-t-md border border-b-0 border-white/15 bg-slate-950 text-slate-200 transition hover:bg-slate-800 hover:text-white"
      >
        {isCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {!isCollapsed && (
        <div className="flex h-full min-h-0 flex-col gap-1 px-3 pb-2 pt-1.5">
          <HorizontalMenu ariaLabel="Seções do editor de overlay" trackClassName="overflow-x-auto overflow-y-hidden">
            {MENUS.map((menu) => (
              <button
                key={menu}
                type="button"
                onClick={() => setActiveMenu(menu)}
                aria-pressed={activeMenu === menu}
                className={activeMenu === menu ? activeButtonClass : buttonClass}
              >
                {menu}
              </button>
            ))}
          </HorizontalMenu>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            {activeMenu === "INICIO" && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-slate-400">Fragmentos das widgets</p>
                <HorizontalMenu ariaLabel="Widgets fragmentáveis">
                  {fragmentableWidgets.map((widget) => (
                    <button
                      key={widget.id}
                      type="button"
                      onClick={() => setSelectedWidgetId(widget.id)}
                      aria-pressed={selectedWidgetId === widget.id}
                      className={selectedWidgetId === widget.id ? activeButtonClass : buttonClass}
                    >
                      {widget.name}
                    </button>
                  ))}
                </HorizontalMenu>
                {selectedWidget && (
                  <div className="flex flex-wrap gap-2">
                    {fragments.map((fragment) => (
                      <button
                        key={fragment.key}
                        type="button"
                        onClick={() => onAddFragment(selectedWidget, fragment.key, fragment.label)}
                        title={`Adicionar ${fragment.label} ao canvas`}
                        className={buttonClass}
                      >
                        {fragment.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeMenu === "TEXTO" && (
              <div className="grid h-full min-h-0 min-w-0 grid-cols-[minmax(180px,0.38fr)_minmax(0,0.62fr)] gap-3">
                <div className="flex min-w-0 flex-col justify-start gap-1.5 border-r border-white/10 pr-3">
                  <button
                    type="button"
                    onClick={() => onAddText("Novo texto", fontSize, textColor, selectedFont)}
                    className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-md bg-violet-600 px-2 text-xs font-medium text-white transition hover:bg-violet-500"
                  >
                    <Plus size={14} /> Adicionar caixa de texto
                  </button>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300">
                    <span className="w-[66px] shrink-0">Tamanho</span>
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={fontSize}
                      onChange={(event) => setFontSize(Math.max(1, Math.min(300, Number(event.target.value) || 1)))}
                      className="h-7 w-20 rounded-md border border-white/10 bg-slate-900 px-2 text-sm text-white outline-none focus:border-violet-400"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300">
                    <span className="w-[66px] shrink-0">Coloração</span>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(event) => setTextColor(event.target.value)}
                      aria-label="Cor do texto"
                      className="h-7 w-20 cursor-pointer rounded-md border border-white/10 bg-slate-900 p-1"
                    />
                  </label>
                </div>

                <div className="flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden">
                  <p className="text-[10px] leading-3 text-slate-400">Categorias de fontes</p>
                  <HorizontalMenu ariaLabel="Categorias de fontes" trackClassName="overflow-hidden">
                    {(Object.keys(FONT_CATEGORIES) as Array<keyof typeof FONT_CATEGORIES>).map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedFontCategory(category)}
                        aria-pressed={selectedFontCategory === category}
                        className={selectedFontCategory === category ? activeButtonClass : buttonClass}
                      >
                        {category}
                      </button>
                    ))}
                  </HorizontalMenu>
                  {selectedFontCategory && (
                    <div className="min-h-0 min-w-0 border-t border-white/10 pt-1">
                      <p className="mb-0.5 text-[10px] leading-3 text-slate-400">Famílias de fontes</p>
                      <div className="grid min-w-0 grid-cols-2 gap-1">
                        {FONT_CATEGORIES[selectedFontCategory].map((font) => (
                          <button
                            key={font}
                            type="button"
                            onClick={() => chooseFont(font)}
                            aria-pressed={selectedFont === font}
                            title={font}
                            style={{ fontFamily: `"${font}", sans-serif` }}
                            className={`flex h-7 min-w-0 items-center justify-start overflow-hidden text-ellipsis whitespace-nowrap rounded-md border px-2 py-1 text-[11px] transition ${selectedFont === font ? "border-violet-400 bg-violet-500/20 text-white" : "border-white/10 bg-slate-800/80 text-slate-200 hover:border-violet-400/60 hover:bg-violet-500/20 hover:text-white"}`}
                          >
                            <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{font}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {!["INICIO", "TEXTO"].includes(activeMenu) && (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                Este menu ficará vazio nesta etapa.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
