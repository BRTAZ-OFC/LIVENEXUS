/* BLOCO 1 — Imports de roteamento e ícones usados na página pública. */
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  AudioLines,
  Check,
  ChevronRight,
  Headphones,
  MessageCircle,
  Mic2,
  Radio,
  ShieldCheck,
  Sparkles,
  Twitch,
  Youtube,
  Zap,
} from "lucide-react";

/* BLOCO 2 — Associa a URL inicial ao componente HomePage. */
export const Route = createFileRoute("/")({
  component: HomePage,
});

/* BLOCO 3 — Dados dos cards de recursos exibidos na página inicial. */
const features = [
  {
    icon: Mic2,
    title: "Leitura de voz",
    description:
      "Transforme mensagens do chat em voz usando a síntese de fala do navegador, sem custos adicionais de TTS.",
    color: "violet",
  },
  {
    icon: Radio,
    title: "Multi-plataforma",
    description:
      "Tenha Twitch, Kick e YouTube em um só lugar e acompanhe a conversa sem ficar alternando entre abas.",
    color: "cyan",
  },
  {
    icon: AudioLines,
    title: "Tempo real",
    description:
      "Uma experiência fluida para acompanhar mensagens e manter a interação acontecendo durante a live.",
    color: "fuchsia",
  },
  {
    icon: ShieldCheck,
    title: "Filtros inteligentes",
    description:
      "Organize a leitura com controles para flood, palavras bloqueadas, cooldown e mensagens repetidas.",
    color: "emerald",
  },
];

/* BLOCO 4 — Monta navegação, apresentação da plataforma, recursos e rodapé. */
function HomePage() {
  return (
    <div className="home-relative-min-h-screen-1rsop7t">
      <div aria-hidden="true" className="home-pointer-events-none-abso-1gul6oz">
        <div className="home-absolute-top-64-donjhn" />
        <div className="home-absolute-right-12rem-wo0q8j" />
        <div className="home-absolute-bottom-8rem-1vjn2vz" />
      </div>

      {/* BLOCO 5 — Navegação superior, marca e links de acesso. */}
      <header className="home-sticky-top-0-hehs4o">
        <nav className="home-mx-auto-flex-1i0mnsl">
          <a
            href="#inicio"
            className="home-flex-shrink-0-1mc3xk4"
            aria-label="LiveNexus início"
          >
            <span className="home-flex-h-10-1qydtod">
              <AudioLines className="home-h-5-w-5-8794lx" />
            </span>
            <span className="home-text-lg-font-extrabold-18415w6">
              LIVE<span className="home-text-cyan-300-bbfjjq">NEXUS</span>
              <span className="home-ml-2-hidden-u7wz9r">
                for streamers
              </span>
            </span>
          </a>

          <div className="home-hidden-items-center-vc0i0m">
            <a href="#plataforma" className="home-text-sm-text-slate-300-q5welq">
              Plataforma
            </a>
            <a href="#recursos" className="home-text-sm-text-slate-300-q5welq">
              Recursos
            </a>
            <a href="#comunidade" className="home-text-sm-text-slate-300-q5welq">
              Comunidade
            </a>
          </div>

          <div className="home-flex-shrink-0-1mm3j93">
            <a
              href="/login"
              className="home-rounded-xl-border-bnh4rt"
            >
              Entrar
            </a>
            <a
              href="/login/registro"
              className="home-rounded-xl-bg-gradient-t-iu534x"
            >
              Cadastrar
            </a>
          </div>
        </nav>
      </header>

      {/* BLOCO 6 — Apresentação principal e prévia visual da plataforma. */}
      <main id="inicio" className="home-relative-z-10-1prrylz">
        <section className="home-mx-auto-grid-14zvftt">
          <div className="home-relative-z-10-74v9y0">
            <div className="home-mb-7-inline-flex-1c0wnp8">
              <span className="home-relative-flex-1yqctjd">
                <span className="home-absolute-inline-flex-1sxl4z3" />
                <span className="home-relative-inline-flex-eez7e5" />
              </span>
              Sua central de interação para lives
            </div>

            <h1 className="home-mx-auto-max-w-3xl-1bmda6p">
              Sua live merece
              <span className="home-mt-2-block-zi3mod">
                estar conectada.
              </span>
            </h1>

            <p className="home-mx-auto-mt-6-1o5j63p">
              O LiveNexus reúne seu chat, leitura de mensagens por voz e ferramentas de transmissão
              em uma experiência unificada. Mais controle para você. Mais participação para sua
              comunidade.
            </p>

            <div className="home-mt-8-flex-18lpy6w">
              <a
                href="/login/registro"
                className="home-inline-flex-items-center-1a3j2x0"
              >
                Começar agora <ArrowRight className="home-h-4-w-4-3ulyf2" />
              </a>
              <a
                href="#plataforma"
                className="home-inline-flex-items-center-1c8e949"
              >
                Conhecer a plataforma <ChevronRight className="home-h-4-w-4-3ulyf2" />
              </a>
            </div>

            <div className="home-mt-8-flex-ek0djd">
              <span className="home-inline-flex-items-center-661mzx">
                <Check className="home-h-4-w-4-tk2x2g" /> Direto do navegador
              </span>
              <span className="home-inline-flex-items-center-661mzx">
                <Check className="home-h-4-w-4-tk2x2g" /> Sem instalar programas
              </span>
              <span className="home-inline-flex-items-center-661mzx">
                <Check className="home-h-4-w-4-tk2x2g" /> Feito para streamers
              </span>
            </div>
          </div>

          <div className="home-relative-mx-auto-mhxt4s">
            <div
              aria-hidden="true"
              className="home-absolute-inset-8-1m8xhuc"
            />
            <div className="home-relative-overflow-hidden-li6lbx">
              <div className="home-flex-items-center-nxanuk">
                <div className="home-flex-items-center-8gxtq2">
                  <span className="home-flex-h-9-o2xuxg">
                    <AudioLines className="home-h-5-w-5-sv0uoi" />
                  </span>
                  <div>
                    <p className="home-text-sm-font-bold-guh8mp">LiveNexus Studio</p>
                    <p className="home-mt-0-5-text-11px-q8tnex">Painel de transmissão</p>
                  </div>
                </div>
                <span className="home-inline-flex-items-center-1lhvok6">
                  <span className="home-h-1-5-w-1-5-1oi5mm2" /> AO VIVO
                </span>
              </div>

              <div className="home-grid-grid-cols-3-1zl9b0">
                <div className="home-rounded-xl-border-179z4ba">
                  <Twitch className="home-mb-3-h-4-l3bwym" />
                  <p className="home-text-xs-font-semibold-17knspg">Twitch</p>
                  <p className="home-mt-1-text-10px-2y7gov">Conectável</p>
                </div>
                <div className="home-rounded-xl-border-179z4ba">
                  <Radio className="home-mb-3-h-4-1lv675i" />
                  <p className="home-text-xs-font-semibold-17knspg">Kick</p>
                  <p className="home-mt-1-text-10px-2y7gov">Conectável</p>
                </div>
                <div className="home-rounded-xl-border-179z4ba">
                  <Youtube className="home-mb-3-h-4-oy41du" />
                  <p className="home-text-xs-font-semibold-17knspg">YouTube</p>
                  <p className="home-mt-1-text-10px-2y7gov">Conectável</p>
                </div>
              </div>

              <div className="home-rounded-2xl-border-p3l5d7">
                <div className="home-mb-4-flex-u7wj19">
                  <div className="home-flex-items-center-1bzl8yv">
                    <MessageCircle className="home-h-4-w-4-g44w5v" />
                    <span className="home-text-xs-font-bold-uzvt0p">Chat unificado</span>
                  </div>
                  <span className="home-text-10px-text-slate-500-1eumgoz">Prévia da interface</span>
                </div>
                <div className="home-space-y-3-1o1kk97">
                  <div className="home-flex-gap-3-gwr3e">
                    <span className="home-flex-h-8-1ylm08o">
                      NX
                    </span>
                    <div className="home-min-w-0-flex-1-1hdapse">
                      <p className="home-text-11px-font-semibold-1bx9li4">
                        nexus_viewer{" "}
                        <span className="home-ml-1-font-normal-rkrvrr">· Twitch</span>
                      </p>
                      <p className="home-mt-1-text-xs-1pqlyn8">Salve, live muito boa hoje!</p>
                    </div>
                  </div>
                  <div className="home-flex-gap-3-gwr3e">
                    <span className="home-flex-h-8-nt9194">
                      LV
                    </span>
                    <div className="home-min-w-0-flex-1-1hdapse">
                      <p className="home-text-11px-font-semibold-1gw7i7s">
                        live_fan <span className="home-ml-1-font-normal-rkrvrr">· Kick</span>
                      </p>
                      <p className="home-mt-1-text-xs-1pqlyn8">O áudio está perfeito!</p>
                    </div>
                  </div>
                  <div className="home-flex-gap-3-gwr3e">
                    <span className="home-flex-h-8-srqwnc">
                      YT
                    </span>
                    <div className="home-min-w-0-flex-1-1hdapse">
                      <p className="home-text-11px-font-semibold-yatb1c">
                        pixel_player{" "}
                        <span className="home-ml-1-font-normal-rkrvrr">· YouTube</span>
                      </p>
                      <p className="home-mt-1-text-xs-1pqlyn8">Cheguei agora, bora!</p>
                    </div>
                  </div>
                </div>
                <div className="home-mt-4-flex-82gd13">
                  <span className="home-flex-h-8-q7qbs0">
                    <Headphones className="home-h-4-w-4-3ulyf2" />
                  </span>
                  <div className="home-min-w-0-flex-1-1g3oh63">
                    <p className="home-text-xs-font-semibold-17knspg">Leitura por voz</p>
                    <p className="home-mt-1-text-10px-1opehuv">
                      Mensagens preparadas para leitura em voz alta
                    </p>
                  </div>
                  <AudioLines className="home-h-4-w-4-g44w5v" />
                </div>
              </div>
            </div>
            <div className="home-absolute-bottom-5-1dd5p1l">
              <span className="home-flex-h-10-hrzw8s">
                <Zap className="home-h-5-w-5-sv0uoi" />
              </span>
              <div>
                <p className="home-text-xs-font-bold-lffhti">Tudo em um só lugar</p>
                <p className="home-mt-1-text-10px-p8jfb0">Uma experiência integrada</p>
              </div>
            </div>
          </div>
        </section>

        {/* BLOCO 7 — Seção dedicada à comunidade e às plataformas. */}
        <section id="comunidade" className="home-border-y-border-white-0--xoeo62">
          <div className="home-mx-auto-flex-acefjp">
            <div className="home-text-left-1kw6lmg">
              <p className="home-text-10px-font-bold-1vu79y6">
                Feito para sua comunidade
              </p>
              <p className="home-mt-1-text-sm-1pppyln">
                As principais plataformas, reunidas em um só fluxo.
              </p>
            </div>
            <div className="home-flex-items-center-1aln8i0">
              <span className="home-flex-items-center-v1xch9">
                <Twitch className="home-h-5-w-5-18wa6a3" /> Twitch
              </span>
              <span className="home-flex-items-center-v1xch9">
                <Radio className="home-h-5-w-5-wspts4" /> Kick
              </span>
              <span className="home-flex-items-center-v1xch9">
                <Youtube className="home-h-5-w-5-laydjb" /> YouTube
              </span>
            </div>
          </div>
        </section>

        {/* BLOCO 8 — Cards de recursos e chamada para cadastro. */}
        <section
          id="plataforma"
          className="home-mx-auto-max-w-7xl-1gxcbf9"
        >
          <div className="home-mx-auto-max-w-2xl-105m6zu">
            <span className="home-inline-flex-items-center-h4sp8n">
              <Sparkles className="home-h-3-5-w-3-5-mho9dy" /> Uma plataforma, várias possibilidades
            </span>
            <h2 className="home-mt-5-text-3xl-1i9zgxq">
              Tudo que você precisa para interagir com seu chat
            </h2>
            <p className="home-mt-5-text-sm-1ega81p">
              Uma experiência criada para streamers que querem dar voz ao chat, organizar suas
              ferramentas e simplificar a rotina de transmissão.
            </p>
          </div>

          <div id="recursos" className="home-mt-12-grid-fygkd8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="group home-rounded-2xl-border-49lope"
                >
                  <div className="home-mb-5-flex-1pgn79f">
                    <Icon className="home-h-5-w-5-sv0uoi" />
                  </div>
                  <h3 className="home-text-sm-font-bold-guh8mp">{feature.title}</h3>
                  <p className="home-mt-3-text-xs-12ug7gs">{feature.description}</p>
                </article>
              );
            })}
          </div>

          <div className="home-mt-14-overflow-hidden-lnie0g">
            <div className="home-mx-auto-flex-14fa954">
              <Zap className="home-h-6-w-6-1wr5v1u" />
            </div>
            <h3 className="home-mt-5-text-2xl-11qds3j">
              Dê voz à sua comunidade.
            </h3>
            <p className="home-mx-auto-mt-3-lxs9o4">
              Prepare seu espaço, conecte suas plataformas e torne a conversa parte central da
              transmissão.
            </p>
            <a
              href="/login/registro"
              className="home-mt-6-inline-flex-1bvzh69"
            >
              Criar minha conta <ArrowRight className="home-h-4-w-4-3ulyf2" />
            </a>
          </div>
        </section>

        <section className="home-border-t-border-white-0--qlvhak">
          <div className="home-mx-auto-grid-s02tki">
            <div>
              <p className="home-text-xs-font-bold-12oqxjo">
                Pensado para quem transmite
              </p>
              <h2 className="home-mt-4-text-3xl-5odoxq">
                Menos abas. Mais interação.
              </h2>
              <p className="home-mt-4-max-w-lg-1ywodtv">
                O LiveNexus está sendo desenvolvido para reunir recursos úteis em uma interface
                clara, acessível e preparada para acompanhar sua rotina de live.
              </p>
            </div>
            <div className="home-grid-gap-3-1w78q0i">
              <div className="home-rounded-2xl-border-1gl0rtt">
                <MessageCircle className="home-h-5-w-5-36nguv" />
                <h3 className="home-mt-4-text-sm-j7xluf">Chat centralizado</h3>
                <p className="home-mt-2-text-xs-20ha15">
                  Acompanhe mensagens de diferentes comunidades com menos troca de contexto.
                </p>
              </div>
              <div className="home-rounded-2xl-border-1gl0rtt">
                <ShieldCheck className="home-h-5-w-5-wspts4" />
                <h3 className="home-mt-4-text-sm-j7xluf">Controle e organização</h3>
                <p className="home-mt-2-text-xs-20ha15">
                  Recursos para ajustar a experiência e manter o chat mais organizado.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* BLOCO 9 — Rodapé com links finais. */}
      <footer className="home-relative-z-10-7w0ncw">
        <div className="home-mx-auto-flex-14ua9uj">
          <a href="#inicio" className="home-flex-items-center-8gxtq2">
            <span className="home-flex-h-8-1uzhtbn">
              <AudioLines className="home-h-4-w-4-1si52f5" />
            </span>
            <span className="home-text-sm-font-extrabold-1rixhqp">
              LIVE<span className="home-text-cyan-300-bbfjjq">NEXUS</span>
            </span>
          </a>
          <p className="home-text-xs-text-slate-500-qpnrbx">
            Uma plataforma para conectar streamers e comunidades.
          </p>
          <div className="home-flex-items-center-yqfmxc">
            <a href="/login" className="home-text-white-1j10sj9">
              Entrar
            </a>
            <a href="/login/registro" className="home-text-white-1j10sj9">
              Cadastrar
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
