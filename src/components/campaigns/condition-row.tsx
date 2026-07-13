"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSegmentField,
  OPERATOR_LABELS,
  SEGMENT_FIELDS,
} from "@/lib/segments/fields";
import type { SegmentCondition, SegmentOperator } from "@/types";

interface ServiceOption {
  id: string;
  name: string;
}

interface ConditionRowProps {
  condition: SegmentCondition;
  onChange: (next: SegmentCondition) => void;
  onRemove: () => void;
  /** En modo OR sólo se permiten campos directos. */
  restrictSpecial?: boolean;
  services?: ServiceOption[];
}

/** Convierte un texto separado por comas en array (números si aplica). */
function parseList(raw: string, numeric: boolean): (string | number)[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (numeric ? Number(s) : s));
}

export function ConditionRow({
  condition,
  onChange,
  onRemove,
  restrictSpecial,
  services = [],
}: ConditionRowProps) {
  const field = getSegmentField(condition.field);

  const availableFields = SEGMENT_FIELDS.filter((f) =>
    restrictSpecial ? f.translation === "direct" : true,
  );

  const handleFieldChange = (key: string) => {
    const def = getSegmentField(key);
    const firstOp = def?.operators[0] ?? "eq";
    onChange({ field: key, operator: firstOp, value: "" });
  };

  const handleOperatorChange = (op: SegmentOperator) => {
    // Al cambiar a between reiniciamos a par vacío
    const value = op === "between" ? [0, 0] : "";
    onChange({ ...condition, operator: op, value });
  };

  const renderValueInput = () => {
    if (!field) return null;
    const { operator } = condition;
    const numeric = field.type === "number";

    // between → dos inputs numéricos
    if (operator === "between") {
      const val = Array.isArray(condition.value)
        ? (condition.value as number[])
        : [0, 0];
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="w-24"
            value={val[0] ?? ""}
            onChange={(e) =>
              onChange({
                ...condition,
                value: [Number(e.target.value), val[1] ?? 0],
              })
            }
          />
          <span className="text-muted-foreground text-sm">y</span>
          <Input
            type="number"
            className="w-24"
            value={val[1] ?? ""}
            onChange={(e) =>
              onChange({
                ...condition,
                value: [val[0] ?? 0, Number(e.target.value)],
              })
            }
          />
        </div>
      );
    }

    // service_consumed → multi-select de servicios (o texto de IDs)
    if (field.key === "service_consumed") {
      const selected = Array.isArray(condition.value)
        ? (condition.value as string[])
        : [];
      if (services.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {services.map((s) => {
              const active = selected.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...condition,
                      value: active
                        ? selected.filter((id) => id !== s.id)
                        : [...selected, s.id],
                    })
                  }
                  className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-accent"
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        );
      }
      return (
        <Input
          placeholder="IDs de servicio separados por coma"
          value={selected.join(", ")}
          onChange={(e) =>
            onChange({
              ...condition,
              value: parseList(e.target.value, false) as string[],
            })
          }
        />
      );
    }

    // enum single (eq) con opciones
    if (
      field.options &&
      (operator === "eq" || field.key === "birthday_month")
    ) {
      return (
        <Select
          value={String(condition.value ?? "")}
          onValueChange={(v) =>
            onChange({
              ...condition,
              value: field.type === "number" ? Number(v) : v,
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecciona" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // boolean
    if (field.type === "boolean") {
      return (
        <Select
          value={String(condition.value)}
          onValueChange={(v) => onChange({ ...condition, value: v === "true" })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Selecciona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Sí</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // listas (in, not_in, contains, contains_any) → texto separado por comas
    if (["in", "not_in", "contains", "contains_any"].includes(operator)) {
      const selected = Array.isArray(condition.value)
        ? (condition.value as (string | number)[])
        : [];
      return (
        <Input
          placeholder={field.hint || "Valores separados por coma"}
          value={selected.join(", ")}
          onChange={(e) =>
            onChange({
              ...condition,
              value: parseList(e.target.value, numeric),
            })
          }
        />
      );
    }

    // valor simple (text/number)
    return (
      <Input
        type={numeric ? "number" : "text"}
        placeholder={field.hint || "Valor"}
        value={String(condition.value ?? "")}
        onChange={(e) =>
          onChange({
            ...condition,
            value: numeric ? Number(e.target.value) : e.target.value,
          })
        }
      />
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
      {/* Campo */}
      <Select value={condition.field} onValueChange={handleFieldChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Campo" />
        </SelectTrigger>
        <SelectContent>
          {availableFields.map((f) => (
            <SelectItem key={f.key} value={f.key}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operador */}
      <Select
        value={condition.operator}
        onValueChange={(v) => handleOperatorChange(v as SegmentOperator)}
        disabled={!field}
      >
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Operador" />
        </SelectTrigger>
        <SelectContent>
          {field?.operators.map((op) => (
            <SelectItem key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Valor */}
      <div className="flex-1 min-w-[180px]">{renderValueInput()}</div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label="Quitar condición"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
