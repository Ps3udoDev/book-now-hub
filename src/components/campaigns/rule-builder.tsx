"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEGMENT_FIELDS } from "@/lib/segments/fields";
import type { SegmentCondition, SegmentRules } from "@/types";
import { ConditionRow } from "./condition-row";

interface ServiceOption {
  id: string;
  name: string;
}

interface RuleBuilderProps {
  rules: SegmentRules;
  onChange: (rules: SegmentRules) => void;
  services?: ServiceOption[];
}

export function RuleBuilder({ rules, onChange, services }: RuleBuilderProps) {
  const restrictSpecial = rules.match === "any";

  const setMatch = (match: "all" | "any") => {
    // Al pasar a OR, se descartan condiciones con campos special (no soportados)
    if (match === "any") {
      const directKeys = new Set(
        SEGMENT_FIELDS.filter((f) => f.translation === "direct").map(
          (f) => f.key,
        ),
      );
      onChange({
        match,
        conditions: rules.conditions.filter((c) => directKeys.has(c.field)),
      });
    } else {
      onChange({ ...rules, match });
    }
  };

  const addCondition = () => {
    const firstField = restrictSpecial
      ? SEGMENT_FIELDS.find((f) => f.translation === "direct")
      : SEGMENT_FIELDS[0];
    if (!firstField) return;
    const newCond: SegmentCondition = {
      field: firstField.key,
      operator: firstField.operators[0],
      value: "",
    };
    onChange({ ...rules, conditions: [...rules.conditions, newCond] });
  };

  const updateCondition = (index: number, next: SegmentCondition) => {
    const conditions = rules.conditions.map((c, i) => (i === index ? next : c));
    onChange({ ...rules, conditions });
  };

  const removeCondition = (index: number) => {
    onChange({
      ...rules,
      conditions: rules.conditions.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          Los clientes deben cumplir
        </span>
        <Select
          value={rules.match}
          onValueChange={(v) => setMatch(v as "all" | "any")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">TODAS las condiciones</SelectItem>
            <SelectItem value="any">ALGUNA condición</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rules.match === "any" && (
        <p className="text-xs text-muted-foreground">
          En modo "alguna condición" sólo se permiten campos directos (sin edad,
          días desde última visita, mes de cumpleaños ni servicio consumido).
        </p>
      )}

      <div className="space-y-2">
        {rules.conditions.length === 0 && (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Aún no hay condiciones. Agrega al menos una para segmentar.
          </p>
        )}
        {rules.conditions.map((condition, index) => (
          <ConditionRow
            // biome-ignore lint/suspicious/noArrayIndexKey: las condiciones no tienen id estable
            key={index}
            condition={condition}
            onChange={(next) => updateCondition(index, next)}
            onRemove={() => removeCondition(index)}
            restrictSpecial={restrictSpecial}
            services={services}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addCondition}>
        <Plus className="mr-2 h-4 w-4" />
        Agregar condición
      </Button>
    </div>
  );
}
