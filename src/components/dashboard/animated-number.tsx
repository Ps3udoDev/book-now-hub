"use client";

import { animate } from "animejs";
import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  /** Formatea el número animado (ej. moneda). Por defecto: entero con miles. */
  format?: (n: number) => string;
  durationMs?: number;
}

/** Cuenta desde 0 (o el valor previo) hasta `value` con anime.js al montar. */
export function AnimatedNumber({
  value,
  format,
  durationMs = 1200,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const proxyRef = useRef({ n: 0 });

  useEffect(() => {
    const proxy = proxyRef.current;
    const controls = animate(proxy, {
      n: value,
      duration: durationMs,
      ease: "out(3)",
      onUpdate: () => setDisplay(proxy.n),
    });
    return () => {
      controls.pause();
    };
  }, [value, durationMs]);

  const text = format
    ? format(display)
    : Math.round(display).toLocaleString("es");

  return <span className="tabular-nums">{text}</span>;
}
