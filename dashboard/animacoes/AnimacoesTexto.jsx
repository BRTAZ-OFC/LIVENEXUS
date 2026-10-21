import React, { useEffect, useMemo, useRef, useState } from "react";
import "./animacoes.css";

const GLIFOS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";

function embaralharCaractere() {
  return GLIFOS[Math.floor(Math.random() * GLIFOS.length)];
}

const KEYFRAMES = {
  cascata: [
    { opacity: 0, transform: "translate3d(0, -1.5em, 0) scale(0.92)" },
    { opacity: 1, transform: "translate3d(0, 0.12em, 0) scale(1.02)", offset: 0.72 },
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
};

const EASING = {
  cascata: "cubic-bezier(0.22, 0.75, 0.35, 1)",
  rolar: "ease-in-out",
  encarrilha: "steps(1, end)",
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
  const [versao, setVersao] = useState(0);
  const [embaralhados, setEmbaralhados] = useState({});

  const tipoValido = ["cascata", "casanique", "rolar", "encarrilha"].includes(tipo)
    ? tipo
    : "cascata";
  const duracaoSegura = Math.max(50, Number(duracao) || 650);
  const atrasoSeguro = Math.max(0, Number(atraso) || 0);

  // Usa Web Animations API para que cada efeito tenha seus próprios keyframes,
  // sem depender de regras CSS externas ou de shorthand que possa sobrescrevê-las.
  useEffect(() => {
    const animations = [];
    if (tipoValido === "casanique") return undefined;

    caracteres.forEach((caractere, indice) => {
      const element = letterRefs.current[indice];
      if (!element || /\s/.test(caractere)) return;
      const animation = element.animate(KEYFRAMES[tipoValido], {
        duration: duracaoSegura,
        delay: indice * atrasoSeguro,
        iterations: infinita ? Infinity : vaiEVem ? 2 : 1,
        direction: vaiEVem ? "alternate" : "normal",
        fill: "both",
        easing: EASING[tipoValido],
      });
      if (tipoValido === "rolar") element.style.backfaceVisibility = "hidden";
      animations.push(animation);
    });

    return () => {
      animations.forEach((animation) => animation.cancel());
    };
  }, [caracteres, tipoValido, duracaoSegura, atrasoSeguro, infinita, vaiEVem, versao]);

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

      timers.push(setTimeout(() => {
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
      }, comecaEm));
    });

    return () => {
      timers.forEach(clearTimeout);
      intervalos.forEach(clearInterval);
    };
  }, [texto, tipoValido, atrasoSeguro, versao, caracteres]);

  useEffect(() => {
    if (!repetir || caracteres.length === 0) return undefined;
    const timer = setTimeout(() => {
      setEmbaralhados({});
      setVersao((atual) => atual + 1);
    }, caracteres.length * atrasoSeguro + duracaoSegura);
    return () => clearTimeout(timer);
  }, [repetir, caracteres.length, atrasoSeguro, duracaoSegura, versao]);

  return (
    <span
      className={`animacao-texto animacao-texto--${tipoValido} ${className}`.trim()}
      style={style}
      aria-label={String(texto ?? "")}
    >
      {caracteres.map((caractere, indice) => (
        <span
          aria-hidden="true"
          className="animacao-texto__letra"
          key={`${versao}-${indice}`}
          ref={(element) => { letterRefs.current[indice] = element; }}
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
      ))}
    </span>
  );
}
