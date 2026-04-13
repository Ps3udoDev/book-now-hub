// src/components/commissions/commission-rule-dialog.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActiveServices } from "@/hooks/supabase/use-services";
import {
  type CreateRuleData,
  commissionsService,
} from "@/lib/services/commissions";
import type { CommissionRule, Profile } from "@/types";

const ruleSchema = z
  .object({
    specialist_id: z.string().min(1, "Selecciona un especialista"),
    scope: z.enum(["all", "item_type", "service"]),
    item_type: z.enum(["service", "product", "cafeteria"]).optional(),
    service_id: z.string().optional(),
    commission_type: z.enum(["percentage", "fixed"]),
    value: z.coerce.number().min(0, "Debe ser mayor o igual a 0"),
    currency_code: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((d) => d.scope !== "item_type" || !!d.item_type, {
    message: "Selecciona el tipo de ítem",
    path: ["item_type"],
  })
  .refine((d) => d.scope !== "service" || !!d.service_id, {
    message: "Selecciona un servicio",
    path: ["service_id"],
  })
  .refine((d) => d.commission_type !== "percentage" || d.value <= 100, {
    message: "El porcentaje no puede superar 100",
    path: ["value"],
  });

type RuleForm = z.infer<typeof ruleSchema>;

interface CommissionRuleDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  specialists: Profile[];
  editingRule?: CommissionRule | null;
  onSaved: () => void;
}

const scopeLabels = {
  all: "Global (todos los ítems)",
  item_type: "Por tipo de ítem",
  service: "Servicio específico",
};
const itemTypeLabels = {
  service: "Servicio",
  product: "Producto",
  cafeteria: "Cafetería",
};

export function CommissionRuleDialog({
  open,
  onOpenChange,
  tenantId,
  specialists,
  editingRule,
  onSaved,
}: CommissionRuleDialogProps) {
  const { services } = useActiveServices(tenantId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RuleForm>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      scope: "all",
      commission_type: "percentage",
      value: 0,
    },
  });

  const scope = watch("scope");
  const commissionType = watch("commission_type");

  // Rellenar formulario al editar
  useEffect(() => {
    if (editingRule) {
      reset({
        specialist_id: editingRule.specialist_id,
        scope: editingRule.scope,
        item_type: editingRule.item_type ?? undefined,
        service_id: editingRule.service_id ?? undefined,
        commission_type: editingRule.commission_type,
        value: editingRule.value,
        currency_code: editingRule.currency_code ?? "USD",
        notes: editingRule.notes ?? "",
      });
    } else {
      reset({ scope: "all", commission_type: "percentage", value: 0 });
    }
  }, [editingRule, reset]);

  async function onSubmit(values: RuleForm) {
    try {
      if (editingRule) {
        await commissionsService.updateRule(editingRule.id, {
          commission_type: values.commission_type,
          value: values.value,
          currency_code:
            values.commission_type === "fixed"
              ? values.currency_code || "USD"
              : null,
          notes: values.notes || null,
        });
        toast.success("Regla actualizada");
      } else {
        const data: CreateRuleData = {
          tenant_id: tenantId,
          specialist_id: values.specialist_id,
          scope: values.scope,
          item_type: values.scope === "item_type" ? values.item_type : null,
          service_id: values.scope === "service" ? values.service_id : null,
          commission_type: values.commission_type,
          value: values.value,
          currency_code:
            values.commission_type === "fixed"
              ? values.currency_code || "USD"
              : null,
          notes: values.notes || null,
        };
        await commissionsService.createRule(data);
        toast.success("Regla creada");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar regla",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingRule ? "Editar regla" : "Nueva regla de comisión"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Especialista */}
          {!editingRule && (
            <div className="space-y-1.5">
              <Label>Especialista</Label>
              <Select onValueChange={(v) => setValue("specialist_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona especialista" />
                </SelectTrigger>
                <SelectContent>
                  {specialists.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.specialist_id && (
                <p className="text-xs text-destructive">
                  {errors.specialist_id.message}
                </p>
              )}
            </div>
          )}

          {/* Ámbito */}
          {!editingRule && (
            <div className="space-y-1.5">
              <Label>Ámbito de aplicación</Label>
              <Select
                defaultValue="all"
                onValueChange={(v) => setValue("scope", v as RuleForm["scope"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(scopeLabels) as [RuleForm["scope"], string][]
                  ).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tipo de ítem (si scope = item_type) */}
          {scope === "item_type" && !editingRule && (
            <div className="space-y-1.5">
              <Label>Tipo de ítem</Label>
              <Select
                onValueChange={(v) =>
                  setValue("item_type", v as RuleForm["item_type"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(itemTypeLabels) as [
                      NonNullable<RuleForm["item_type"]>,
                      string,
                    ][]
                  ).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.item_type && (
                <p className="text-xs text-destructive">
                  {errors.item_type.message}
                </p>
              )}
            </div>
          )}

          {/* Servicio específico (si scope = service) */}
          {scope === "service" && !editingRule && (
            <div className="space-y-1.5">
              <Label>Servicio</Label>
              <Select onValueChange={(v) => setValue("service_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.service_id && (
                <p className="text-xs text-destructive">
                  {errors.service_id.message}
                </p>
              )}
            </div>
          )}

          {/* Tipo de comisión */}
          <div className="space-y-1.5">
            <Label>Tipo de comisión</Label>
            <Select
              defaultValue={editingRule?.commission_type || "percentage"}
              onValueChange={(v) =>
                setValue("commission_type", v as RuleForm["commission_type"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                <SelectItem value="fixed">Monto fijo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Valor */}
          <div className="space-y-1.5">
            <Label>
              {commissionType === "percentage"
                ? "Porcentaje (0-100)"
                : "Monto fijo"}
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                max={commissionType === "percentage" ? 100 : undefined}
                step={commissionType === "percentage" ? "0.5" : "0.01"}
                {...register("value")}
                className="flex-1"
              />
              {commissionType === "percentage" && (
                <span className="flex items-center px-3 rounded-md border bg-muted text-sm">
                  %
                </span>
              )}
              {commissionType === "fixed" && (
                <Select
                  defaultValue={editingRule?.currency_code || "USD"}
                  onValueChange={(v) => setValue("currency_code", v)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="VES">VES</SelectItem>
                    <SelectItem value="COP">COP</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            {errors.value && (
              <p className="text-xs text-destructive">{errors.value.message}</p>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label>Notas (opcional)</Label>
            <Textarea
              {...register("notes")}
              rows={2}
              placeholder="Observaciones sobre esta regla"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingRule ? "Guardar cambios" : "Crear regla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
