/* LIVENEXUS: Explica os controles e as opções de animação aplicadas aos textos. */
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./animacoes.css";

const GLIFOS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
const ANIMACOES_TEXTO_INTEIRO = new Set([
  "slide-in-cima",
  "slide-in-baixo",
  "slide-in-esquerda",
  "slide-in-direita",
  "reveal",
  "flip-in",
  "bounce-in",
  "blur-in",
  "light-speed-in",
]);

function inverterKeyframes(keyframes) {
  return [...keyframes].reverse().map(({ offset, ...frame }) => frame);
}

function embaralharCaractere() {
  return GLIFOS[Math.floor(Math.random() * GLIFOS.length)];
}

const KEYFRAMES = {
  cascata: [
    { opacity: 0, transform: "translate3d(0, -1.5em, 0) scale(0.92)" },
    { opacity: 1, transform: "translate3d(0, 0.12em, 0) scale(1.02)", offset: 0.72 },
    { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
  ],
  "cascata-baixo": [
    { opacity: 0, transform: "translate3d(0, 1.5em, 0) scale(0.92)" },
    { opacity: 1, transform: "translate3d(0, -0.12em, 0) scale(1.02)", offset: 0.72 },
    { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
  ],
  rolar: [
    { opacity: 0, transform: "perspective(500px) rotateX(-180deg)" },
    { opacity: 1, transform: "perspective(500px) rotateX(18deg)", offset: 0.55 },
    { opacity: 1, transform: "perspective(500px) rotateX(0deg)" },
  ],
  encarrilha: [
    { opacity: 0, transform: "translateX(-0.35em)" },
    { opacity: 1, transform: "translateX(0)" },
  ],
  "slide-in-cima": [
    { opacity: 0, transform: "translate3d(0, 100%, 0)" },
    { opacity: 1, transform: "translate3d(0, 0, 0)" },
  ],
  "slide-in-baixo": [
    { opacity: 0, transform: "translate3d(0, -100%, 0)" },
    { opacity: 1, transform: "translate3d(0, 0, 0)" },
  ],
  "slide-in-esquerda": [
    { opacity: 0, transform: "translate3d(100%, 0, 0)" },
    { opacity: 1, transform: "translate3d(0, 0, 0)" },
  ],
  "slide-in-direita": [
    { opacity: 0, transform: "translate3d(-100%, 0, 0)" },
    { opacity: 1, transform: "translate3d(0, 0, 0)" },
  ],
  reveal: [
    { opacity: 0, clipPath: "inset(0 100% 0 0)" },
    { opacity: 1, clipPath: "inset(0 0 0 0)" },
  ],
  "flip-in": [
    { opacity: 0, transform: "perspective(500px) rotateX(90deg) scale(0.8)" },
    { opacity: 1, transform: "perspective(500px) rotateX(-12deg) scale(1.02)", offset: 0.75 },
    { opacity: 1, transform: "perspective(500px) rotateX(0deg) scale(1)" },
  ],
  "bounce-in": [
    { opacity: 0, transform: "scale3d(0.3, 0.3, 0.3)" },
    { opacity: 1, transform: "scale3d(1.1, 1.1, 1.1)", offset: 0.2 },
    { opacity: 1, transform: "scale3d(0.9, 0.9, 0.9)", offset: 0.4 },
    { opacity: 1, transform: "scale3d(1.03, 1.03, 1.03)", offset: 0.6 },
    { opacity: 1, transform: "scale3d(0.97, 0.97, 0.97)", offset: 0.8 },
    { opacity: 1, transform: "scale3d(1, 1, 1)" },
  ],
  "blur-in": [
    { opacity: 0, filter: "blur(12px)", transform: "scale(1.04)" },
    { opacity: 1, filter: "blur(0)", transform: "scale(1)" },
  ],
  "light-speed-in": [
    { opacity: 0, transform: "translate3d(100%, 0, 0) skewX(-30deg)" },
    { opacity: 1, transform: "skewX(20deg)", offset: 0.6 },
    { opacity: 1, transform: "skewX(-5deg)", offset: 0.8 },
    { opacity: 1, transform: "translate3d(0, 0, 0) skewX(0deg)" },
  ],
};

const EASING = {
  cascata: "cubic-bezier(0.22, 0.75, 0.35, 1)",
  "cascata-baixo": "cubic-bezier(0.22, 0.75, 0.35, 1)",
  rolar: "ease-in-out",
  encarrilha: "steps(1, end)",
  "slide-in-cima": "cubic-bezier(0.22, 1, 0.36, 1)",
  "slide-in-baixo": "cubic-bezier(0.22, 1, 0.36, 1)",
  "slide-in-esquerda": "cubic-bezier(0.22, 1, 0.36, 1)",
  "slide-in-direita": "cubic-bezier(0.22, 1, 0.36, 1)",
  reveal: "cubic-bezier(0.22, 1, 0.36, 1)",
  "flip-in": "cubic-bezier(0.22, 0.61, 0.36, 1)",
  "bounce-in": "cubic-bezier(0.215, 0.61, 0.355, 1)",
  "blur-in": "ease-out",
  "light-speed-in": "cubic-bezier(0.23, 1, 0.32, 1)",
};

export default function AnimacoesTexto({
  texto = "",
  tipo = "cascata",
  atraso = 1000,
  className = "",
  style = {},
  repetir = false,
  duracao = 650,
  infinita = false,
  vaiEVem = false,
}) {
  const caracteres = useMemo(() => Array.from(String(texto ?? "")), [texto]);
  const letterRefs = useRef([]);
  const wholeTextRef = useRef(null);
  const [versao, setVersao] = useState(0);
  const [embaralhados, setEmbaralhados] = useState({});

  const tipoValido = [
    "cascata",
    "cascata-baixo",
    "casanique",
    "rolar",
    "encarrilha",
    "slide-in-cima",
    "slide-in-baixo",
    "slide-in-esquerda",
    "slide-in-direita",
    "reveal",
    "flip-in",
    "bounce-in",
    "blur-in",
    "light-speed-in",
  ].includes(tipo)
    ? tipo
    : "cascata";
  const duracaoSegura = Math.max(50, Number(duracao) || 650);
  const atrasoSeguro = Math.max(0, Number(atraso) || 0);

  // Os efeitos Slide/Reveal/Flip/Bounce/Blur/Light Speed animam o texto inteiro.
  // Cascata, Casanique, Rolar e Encarrilha mantêm o comportamento por letra.
  useEffect(() => {
    const animations = [];
    const timers = [];
    let cancelled = false;
    if (tipoValido === "casanique") return undefined;

    if (ANIMACOES_TEXTO_INTEIRO.has(tipoValido)) {
      const element = wholeTextRef.current;
      if (!element || !caracteres.length) return undefined;
      animations.push(
        element.animate(KEYFRAMES[tipoValido], {
          duration: duracaoSegura,
          iterations: 1,
          fill: "both",
          easing: EASING[tipoValido],
        }),
      );
      if (vaiEVem)
        timers.push(
          setTimeout(() => {
            if (!cancelled)
              animations.push(
                element.animate(inverterKeyframes(KEYFRAMES[tipoValido]), {
                  duration: duracaoSegura,
                  iterations: 1,
                  fill: "both",
                  easing: EASING[tipoValido],
                }),
              );
          }, duracaoSegura),
        );
      return () => {
        cancelled = true;
        timers.forEach(clearTimeout);
        animations.forEach((animation) => animation.cancel());
      };
    }

    const elements = caracteres
      .map((caractere, indice) => ({
        caractere,
        indice,
        element: letterRefs.current[indice],
      }))
      .filter(({ caractere, element }) => element && !/\s/.test(caractere));
    const tempoEntrada = Math.max(0, caracteres.length - 1) * atrasoSeguro + duracaoSegura;

    elements.forEach(({ element, indice }) => {
      animations.push(
        element.animate(KEYFRAMES[tipoValido], {
          duration: duracaoSegura,
          delay: indice * atrasoSeguro,
          iterations: 1,
          fill: "both",
          easing: EASING[tipoValido],
        }),
      );
      if (tipoValido === "rolar") element.style.backfaceVisibility = "hidden";
    });
    if (vaiEVem)
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          elements.forEach(({ element, indice }) =>
            animations.push(
              element.animate(inverterKeyframes(KEYFRAMES[tipoValido]), {
                duration: duracaoSegura,
                delay: indice * atrasoSeguro,
                iterations: 1,
                fill: "both",
                easing: EASING[tipoValido],
              }),
            ),
          );
        }, tempoEntrada),
      );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      animations.forEach((animation) => animation.cancel());
    };
  }, [caracteres, tipoValido, duracaoSegura, atrasoSeguro, vaiEVem, versao]);

  useEffect(() => {
    if (tipoValido !== "casanique") {
      setEmbaralhados({});
      return undefined;
    }

    const timers = [];
    const intervalos = [];
    const inicio = Date.now();

    caracteres.forEach((caractere, indice) => {
      if (/\s/.test(caractere)) return;
      const comecaEm = indice * atrasoSeguro;
      const terminaEm = comecaEm + Math.min(800, Math.max(250, atrasoSeguro - 100));

      timers.push(
        setTimeout(() => {
          const intervalo = setInterval(() => {
            const decorrido = Date.now() - inicio - comecaEm;
            if (decorrido >= terminaEm - comecaEm) {
              clearInterval(intervalo);
              setEmbaralhados((atual) => ({ ...atual, [indice]: caractere }));
              return;
            }
            setEmbaralhados((atual) => ({ ...atual, [indice]: embaralharCaractere() }));
          }, 55);
          intervalos.push(intervalo);
        }, comecaEm),
      );
    });

    return () => {
      timers.forEach(clearTimeout);
      intervalos.forEach(clearInterval);
    };
  }, [texto, tipoValido, atrasoSeguro, versao, caracteres]);

  useEffect(() => {
    if (!repetir || caracteres.length === 0) return undefined;
    const duracaoCiclo = ANIMACOES_TEXTO_INTEIRO.has(tipoValido)
      ? duracaoSegura
      : Math.max(0, caracteres.length - 1) * atrasoSeguro + duracaoSegura;
    const duracaoSaida = vaiEVem
      ? ANIMACOES_TEXTO_INTEIRO.has(tipoValido)
        ? duracaoSegura
        : duracaoCiclo
      : 0;
    const timer = setTimeout(
      () => {
        setEmbaralhados({});
        setVersao((atual) => atual + 1);
      },
      duracaoCiclo + duracaoSaida + (ANIMACOES_TEXTO_INTEIRO.has(tipoValido) ? atrasoSeguro : 0),
    );
    return () => clearTimeout(timer);
  }, [repetir, caracteres.length, atrasoSeguro, duracaoSegura, vaiEVem, tipoValido, versao]);

  return (
    <span
      className={`animacao-texto animacao-texto--${tipoValido} ${className}`.trim()}
      style={style}
      aria-label={String(texto ?? "")}
    >
      {ANIMACOES_TEXTO_INTEIRO.has(tipoValido) ? (
        <span ref={wholeTextRef} className="animacao-texto__conteudo">
          {String(texto ?? "")}
        </span>
      ) : (
        caracteres.map((caractere, indice) => (
          <span
            aria-hidden="true"
            className="animacao-texto__letra"
            key={`${versao}-${indice}`}
            ref={(element) => {
              letterRefs.current[indice] = element;
            }}
            style={{
              display: "inline-block",
              transformOrigin: "center",
              backfaceVisibility: tipoValido === "rolar" ? "hidden" : undefined,
            }}
          >
            {tipoValido === "casanique" && !/\s/.test(caractere)
              ? (embaralhados[indice] ?? caractere)
              : caractere === " "
                ? "\u00a0"
                : caractere}
          </span>
        ))
      )}
    </span>
  );
}
