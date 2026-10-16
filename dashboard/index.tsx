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

export const Route = createFileRoute("/")({
  component: HomePage,
});

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

function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080a13] text-slate-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-64 left-[18%] h-[620px] w-[620px] rounded-full bg-violet-700/20 blur-[150px]" />
        <div className="absolute right-[-12rem] top-[28rem] h-[540px] w-[540px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute bottom-[8rem] left-[-12rem] h-[480px] w-[480px] rounded-full bg-fuchsia-600/10 blur-[140px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#080a13]/75 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <a
            href="#inicio"
            className="flex shrink-0 items-center gap-3"
            aria-label="LiveNexus início"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/20 bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/25">
              <AudioLines className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white">
              LIVE<span className="text-cyan-300">NEXUS</span>
              <span className="ml-2 hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:inline">
                for streamers
              </span>
            </span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#plataforma" className="text-sm text-slate-300 transition hover:text-white">
              Plataforma
            </a>
            <a href="#recursos" className="text-sm text-slate-300 transition hover:text-white">
              Recursos
            </a>
            <a href="#comunidade" className="text-sm text-slate-300 transition hover:text-white">
              Comunidade
            </a>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href="/login"
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-violet-300/50 hover:bg-white/[0.06]"
            >
              Entrar
            </a>
            <a
              href="/login/registro"
              className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:brightness-110"
            >
              Cadastrar
            </a>
          </div>
        </nav>
      </header>

      <main id="inicio" className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:grid-cols-[1fr_0.95fr] lg:gap-10">
          <div className="relative z-10 text-center lg:text-left">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[0.07] px-4 py-2 text-xs font-semibold text-violet-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
              </span>
              Sua central de interação para lives
            </div>

            <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:mx-0 lg:text-7xl">
              Sua live merece
              <span className="mt-2 block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text pb-2 text-transparent">
                estar conectada.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-slate-400 sm:text-lg lg:mx-0">
              O LiveNexus reúne seu chat, leitura de mensagens por voz e ferramentas de transmissão
              em uma experiência unificada. Mais controle para você. Mais participação para sua
              comunidade.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <a
                href="/login/registro"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-violet-600/25 transition hover:brightness-110"
              >
                Começar agora <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#plataforma"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.035] px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
              >
                Conhecer a plataforma <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs text-slate-500 lg:justify-start">
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-300" /> Direto do navegador
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-300" /> Sem instalar programas
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-300" /> Feito para streamers
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[600px]">
            <div
              aria-hidden="true"
              className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-cyan-500/20 blur-3xl"
            />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0d1120]/95 p-3 shadow-2xl shadow-black/50 sm:p-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-2 pb-4 pt-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                    <AudioLines className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">LiveNexus Studio</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Painel de transmissão</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> AO VIVO
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-4">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                  <Twitch className="mb-3 h-4 w-4 text-violet-300" />
                  <p className="text-xs font-semibold text-white">Twitch</p>
                  <p className="mt-1 text-[10px] text-emerald-300">Conectável</p>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                  <Radio className="mb-3 h-4 w-4 text-cyan-300" />
                  <p className="text-xs font-semibold text-white">Kick</p>
                  <p className="mt-1 text-[10px] text-emerald-300">Conectável</p>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                  <Youtube className="mb-3 h-4 w-4 text-rose-300" />
                  <p className="text-xs font-semibold text-white">YouTube</p>
                  <p className="mt-1 text-[10px] text-emerald-300">Conectável</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#080b14] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-cyan-300" />
                    <span className="text-xs font-bold text-slate-200">Chat unificado</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Prévia da interface</span>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-[10px] font-bold text-violet-200">
                      NX
                    </span>
                    <div className="min-w-0 flex-1 rounded-xl bg-white/[0.04] px-3 py-2.5">
                      <p className="text-[11px] font-semibold text-violet-200">
                        nexus_viewer{" "}
                        <span className="ml-1 font-normal text-slate-600">· Twitch</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-300">Salve, live muito boa hoje!</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-[10px] font-bold text-cyan-200">
                      LV
                    </span>
                    <div className="min-w-0 flex-1 rounded-xl bg-white/[0.04] px-3 py-2.5">
                      <p className="text-[11px] font-semibold text-cyan-200">
                        live_fan <span className="ml-1 font-normal text-slate-600">· Kick</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-300">O áudio está perfeito!</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-[10px] font-bold text-rose-200">
                      YT
                    </span>
                    <div className="min-w-0 flex-1 rounded-xl bg-white/[0.04] px-3 py-2.5">
                      <p className="text-[11px] font-semibold text-rose-200">
                        pixel_player{" "}
                        <span className="ml-1 font-normal text-slate-600">· YouTube</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-300">Cheguei agora, bora!</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-violet-400/15 bg-violet-400/[0.06] p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-200">
                    <Headphones className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white">Leitura por voz</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Mensagens preparadas para leitura em voz alta
                    </p>
                  </div>
                  <AudioLines className="h-4 w-4 text-cyan-300" />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#121628]/95 p-3 shadow-xl sm:flex">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <Zap className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-white">Tudo em um só lugar</p>
                <p className="mt-1 text-[10px] text-slate-500">Uma experiência integrada</p>
              </div>
            </div>
          </div>
        </section>

        <section id="comunidade" className="border-y border-white/[0.07] bg-white/[0.018]">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-7 sm:px-8 md:flex-row">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Feito para sua comunidade
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-200">
                As principais plataformas, reunidas em um só fluxo.
              </p>
            </div>
            <div className="flex items-center gap-7">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-300">
                <Twitch className="h-5 w-5 text-violet-300" /> Twitch
              </span>
              <span className="flex items-center gap-2 text-sm font-bold text-slate-300">
                <Radio className="h-5 w-5 text-emerald-300" /> Kick
              </span>
              <span className="flex items-center gap-2 text-sm font-bold text-slate-300">
                <Youtube className="h-5 w-5 text-rose-300" /> YouTube
              </span>
            </div>
          </div>
        </section>

        <section
          id="plataforma"
          className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28"
        >
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" /> Uma plataforma, várias possibilidades
            </span>
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Tudo que você precisa para interagir com seu chat
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-400 sm:text-base">
              Uma experiência criada para streamers que querem dar voz ao chat, organizar suas
              ferramentas e simplificar a rotina de transmissão.
            </p>
          </div>

          <div id="recursos" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 transition duration-300 hover:-translate-y-1 hover:border-violet-300/25 hover:bg-violet-300/[0.04]"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-300/[0.08] text-violet-200 transition group-hover:bg-violet-300/[0.14]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{feature.title}</h3>
                  <p className="mt-3 text-xs leading-6 text-slate-400">{feature.description}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-14 overflow-hidden rounded-3xl border border-violet-300/15 bg-gradient-to-r from-violet-600/15 via-fuchsia-500/[0.07] to-cyan-500/10 p-7 text-center sm:p-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-cyan-200">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-2xl font-extrabold text-white sm:text-3xl">
              Dê voz à sua comunidade.
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
              Prepare seu espaço, conecte suas plataformas e torne a conversa parte central da
              transmissão.
            </p>
            <a
              href="/login/registro"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:brightness-110"
            >
              Criar minha conta <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        <section className="border-t border-white/[0.07] bg-black/20">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[0.9fr_1.1fr] md:items-center md:py-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
                Pensado para quem transmite
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
                Menos abas. Mais interação.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-400">
                O LiveNexus está sendo desenvolvido para reunir recursos úteis em uma interface
                clara, acessível e preparada para acompanhar sua rotina de live.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                <MessageCircle className="h-5 w-5 text-cyan-300" />
                <h3 className="mt-4 text-sm font-bold text-white">Chat centralizado</h3>
                <p className="mt-2 text-xs leading-6 text-slate-400">
                  Acompanhe mensagens de diferentes comunidades com menos troca de contexto.
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <h3 className="mt-4 text-sm font-bold text-white">Controle e organização</h3>
                <p className="mt-2 text-xs leading-6 text-slate-400">
                  Recursos para ajustar a experiência e manter o chat mais organizado.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.08] bg-[#070910]/80">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-7 text-center sm:px-8 md:flex-row md:text-left">
          <a href="#inicio" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400">
              <AudioLines className="h-4 w-4 text-white" />
            </span>
            <span className="text-sm font-extrabold text-slate-300">
              LIVE<span className="text-cyan-300">NEXUS</span>
            </span>
          </a>
          <p className="text-xs text-slate-500">
            Uma plataforma para conectar streamers e comunidades.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <a href="/login" className="transition hover:text-white">
              Entrar
            </a>
            <a href="/login/registro" className="transition hover:text-white">
              Cadastrar
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
