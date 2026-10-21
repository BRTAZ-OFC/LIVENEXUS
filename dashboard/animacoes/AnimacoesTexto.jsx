import React, { useEffect, useMemo, useState } from "react";
import "./animacoes.css";

const GLIFOS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";

function embaralharCaractere() {
  return GLIFOS[Math.floor(Math.random() * GLIFOS.length)];
}

/**
 * Anima texto caractere por caractere.
 *
 * tipos:
 * - cascata: cada letra cai de cima para baixo.
 * - casanique: cada letra embaralha como caça-níquel e termina no caractere correto.
 * - rolar: cada letra faz um flip vertical.
 * - encarrilha: cada letra aparece da esquerda para a direita.
 *
 * O atraso entre o início de cada letra é de 1 segundo por padrão.
 */
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
  const [versao, setVersao] = useState(0);
  const [embaralhados, setEmbaralhados] = useState({});

  useEffect(() => {
    if (tipo !== "casanique") {
      setEmbaralhados({});
      return undefined;
    }

    const timers = [];
    const intervalos = [];
    const inicio = Date.now();

    caracteres.forEach((caractere, indice) => {
      if (/\s/.test(caractere)) return;

      const comecaEm = indice * atraso;
      const terminaEm = comecaEm + Math.min(800, Math.max(250, atraso - 100));

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
  }, [texto, tipo, atraso, versao, caracteres]);

  useEffect(() => {
    if (!repetir || caracteres.length === 0) return undefined;
    const duracao = caracteres.length * atraso + 1000;
    const timer = setTimeout(() => {
      setEmbaralhados({});
      setVersao((atual) => atual + 1);
    }, duracao);
    return () => clearTimeout(timer);
  }, [repetir, caracteres.length, atraso, versao]);

  const tipoValido = ["cascata", "casanique", "rolar", "encarrilha"].includes(tipo)
    ? tipo
    : "cascata";

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
          style={{
            "--animacao-atraso": `${indice * atraso}ms`,
            "--animacao-duracao": `${Math.max(50, Number(duracao) || 650)}ms`,
            "--animacao-iteracoes": infinita ? "infinite" : vaiEVem ? "2" : "1",
            "--animacao-direcao": vaiEVem ? "alternate" : "normal",
            animationName: `animacao-${tipoValido}`,
            animationDuration: `${Math.max(50, Number(duracao) || 650)}ms`,
            animationDelay: `${indice * Math.max(0, Number(atraso) || 0)}ms`,
            animationIterationCount: infinita ? "infinite" : vaiEVem ? 2 : 1,
            animationDirection: vaiEVem ? "alternate" : "normal",
            animationFillMode: "both",
            animationTimingFunction: tipoValido === "cascata"
              ? "cubic-bezier(0.22, 0.75, 0.35, 1)"
              : tipoValido === "casanique"
                ? "ease-out"
                : tipoValido === "rolar"
                  ? "ease-in-out"
                  : "steps(1, end)",
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
