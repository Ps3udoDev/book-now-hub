"use client";

import { animate, stagger, svg } from "animejs";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ResultVariant = "success" | "error" | "warning";

export interface ResultDialogData {
  variant: ResultVariant;
  title: string;
  message?: string;
  details?: string[];
}

interface ResultDialogProps {
  result: ResultDialogData | null;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

const VARIANT_STYLES: Record<ResultVariant, { stroke: string; ring: string }> =
  {
    success: { stroke: "stroke-emerald-500", ring: "bg-emerald-500/10" },
    error: { stroke: "stroke-red-500", ring: "bg-red-500/10" },
    warning: { stroke: "stroke-amber-500", ring: "bg-amber-500/10" },
  };

// Ícono SVG cuyo trazo se dibuja con Anime.js al montarse.
function ResultIcon({ variant }: { variant: ResultVariant }) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const shapes = svgRef.current.querySelectorAll("[data-draw]");
    const scaleAnimation = animate(svgRef.current, {
      scale: [0.5, 1],
      opacity: [0, 1],
      duration: 350,
      ease: "outBack",
    });
    const drawAnimation = animate(svg.createDrawable(shapes), {
      draw: "0 1",
      duration: 600,
      delay: stagger(150, { start: 120 }),
      ease: "outQuad",
    });

    // Cancela las animaciones si el ícono se desmonta antes de terminar.
    return () => {
      scaleAnimation.pause();
      drawAnimation.pause();
    };
  }, []);

  const styles = VARIANT_STYLES[variant];
  const strokeProps = {
    fill: "none",
    strokeWidth: 3.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <div
      className={cn(
        "mx-auto flex h-20 w-20 items-center justify-center rounded-full",
        styles.ring,
      )}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 48 48"
        className={cn("h-12 w-12", styles.stroke)}
        aria-hidden="true"
      >
        {variant === "success" && (
          <>
            <circle data-draw cx="24" cy="24" r="21" {...strokeProps} />
            <path data-draw d="M14 25l7 7 13-15" {...strokeProps} />
          </>
        )}
        {variant === "error" && (
          <>
            <circle data-draw cx="24" cy="24" r="21" {...strokeProps} />
            <path data-draw d="M16 16l16 16" {...strokeProps} />
            <path data-draw d="M32 16L16 32" {...strokeProps} />
          </>
        )}
        {variant === "warning" && (
          <>
            <path data-draw d="M24 6L44 41H4L24 6z" {...strokeProps} />
            <path data-draw d="M24 19v10" {...strokeProps} />
            <path data-draw d="M24 34.5v.5" {...strokeProps} />
          </>
        )}
      </svg>
    </div>
  );
}

/**
 * Dialog de resultado con ícono animado. Reemplaza a los toasts en los
 * flujos de guardado del inventario: success (check), error (X) y
 * warning (permisos o éxito parcial).
 */
export function ResultDialog({
  result,
  onClose,
  actionLabel,
  onAction,
}: ResultDialogProps) {
  const [showDetails, setShowDetails] = useState(false);
  // Se conserva el último resultado para que el contenido no desaparezca
  // de golpe mientras el diálogo anima su cierre (Radix anima ~200ms).
  const [lastResult, setLastResult] = useState<ResultDialogData | null>(null);
  // Contador para forzar el remount del ícono (y su animación) cuando
  // llega un nuevo resultado, aunque `result` nunca haya pasado por null.
  const [resultKey, setResultKey] = useState(0);

  if (result && result !== lastResult) {
    setLastResult(result);
    setResultKey((current) => current + 1);
    setShowDetails(false);
  }

  const display = result ?? lastResult;

  return (
    <Dialog
      open={result !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        {display && (
          <>
            <DialogHeader className="items-center space-y-4 pt-4 text-center sm:text-center">
              <ResultIcon key={resultKey} variant={display.variant} />
              <DialogTitle className="text-xl">{display.title}</DialogTitle>
              {display.message && (
                <DialogDescription className="text-base">
                  {display.message}
                </DialogDescription>
              )}
            </DialogHeader>

            {display.details && display.details.length > 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => setShowDetails((current) => !current)}
                >
                  {showDetails ? "Ocultar detalle" : "Ver detalle"}
                </button>
                {showDetails && (
                  <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    {display.details.map((detail) => (
                      <li key={detail}>• {detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <DialogFooter className="sm:justify-center">
              {actionLabel && onAction && (
                <Button variant="outline" onClick={onAction}>
                  {actionLabel}
                </Button>
              )}
              <Button onClick={onClose}>Aceptar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
