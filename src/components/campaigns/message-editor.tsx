"use client";

import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { renderMessage, TEMPLATE_VARIABLES } from "@/lib/campaigns/render";
import type { Customer } from "@/types";

interface MessageEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Cliente de muestra para la vista previa renderizada. */
  sampleCustomer?: Customer | null;
}

export function MessageEditor({
  value,
  onChange,
  sampleCustomer,
}: MessageEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (key: string) => {
    const token = `{{${key}}}`;
    const el = textareaRef.current;
    if (!el) {
      onChange(value + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    // reposicionar el cursor tras el token
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const preview = sampleCustomer
    ? renderMessage(value, sampleCustomer).message
    : value;

  return (
    <div className="space-y-3">
      <div>
        <Label>Variables disponibles</Label>
        <div className="mt-1 flex flex-wrap gap-1">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => insertVariable(v.key)}
              className="rounded-full border bg-background px-2 py-0.5 text-xs hover:bg-accent"
            >
              {`{{${v.key}}}`} · {v.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="message-template">Mensaje</Label>
        <Textarea
          id="message-template"
          ref={textareaRef}
          rows={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribe el mensaje. Usa {{first_name}} para personalizar."
          className="mt-1"
        />
      </div>

      <div>
        <Label>Vista previa</Label>
        <div className="mt-1 rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
          {preview || (
            <span className="text-muted-foreground">
              La vista previa aparecerá aquí…
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
