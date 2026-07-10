"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { animate, stagger } from "animejs";
import { Loader2 } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import {
  type DefaultValues,
  type FieldValues,
  type Path,
  type Resolver,
  useForm,
} from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface SchemaFieldOption {
  value: string;
  label: string;
}

export interface SchemaFieldDef<T extends FieldValues> {
  name: Path<T>;
  label: string;
  type: "text" | "number" | "textarea" | "select" | "switch";
  options?: SchemaFieldOption[];
  placeholder?: string;
  help?: string;
  colSpan?: 1 | 2;
  readOnly?: boolean;
  step?: string;
  // Leyenda dinámica que depende de los valores actuales del form
  // (ej. conversión de moneda debajo del precio).
  // Nota: los valores recibidos son "best effort" — los campos number ya
  // vienen convertidos con valueAsNumber, pero pueden llegar como NaN
  // mientras el usuario está escribiendo (input vacío o parcial).
  renderHelp?: (values: T) => ReactNode;
}

interface SchemaFormModalProps<T extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: SchemaFieldDef<T>[];
  // Nota: zod v4 tipa ZodType como <Output, Input>; usamos Input = unknown
  // porque el resolver de @hookform/resolvers exige un cast (ver más abajo).
  schema: z.ZodType<T, unknown>;
  defaultValues: DefaultValues<T>;
  submitLabel?: string;
  loading?: boolean;
  onSubmit: (values: T) => Promise<void>;
  mediaPanel?: ReactNode;
}

/**
 * Modal global reutilizable: recibe un schema de campos y renderiza el
 * formulario a la izquierda con un panel de media opcional a la derecha.
 * Validación con Zod, animación de entrada con Anime.js.
 */
export function SchemaFormModal<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  fields,
  schema,
  defaultValues,
  submitLabel = "Guardar",
  loading = false,
  onSubmit,
  mediaPanel,
}: SchemaFormModalProps<T>) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement | null>(null);

  const form = useForm<T>({
    // Cast necesario: zod v4 + @hookform/resolvers infiere Input desde el
    // schema (aquí `unknown`), que no satisface el `FieldValues` que espera
    // `Resolver<T>`. Es un cast conocido con schemas `z.coerce`.
    resolver: zodResolver(
      schema as unknown as z.ZodType<T, T>,
    ) as unknown as Resolver<T>,
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = form;

  // Resetear al abrir con los valores del registro actual (crear/editar).
  // Importante: `defaultValues` debe venir memoizado (useMemo) del caller;
  // si se recrea en cada render, este efecto resetearía el form constantemente.
  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open, defaultValues, reset]);

  // Entrada escalonada de los campos al abrir el modal.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (!formRef.current) return;
      animate(formRef.current.querySelectorAll("[data-field]"), {
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 320,
        delay: stagger(35),
        ease: "outQuad",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const values = watch();

  const renderField = (field: SchemaFieldDef<T>) => {
    // Nota: solo se soportan nombres de campo planos (sin rutas anidadas
    // tipo "a.b"); `errors[field.name]` no resuelve paths anidados.
    const error = errors[field.name];
    const errorMessage =
      typeof error?.message === "string" ? error.message : null;
    const spanClass = field.colSpan === 2 ? "md:col-span-2" : "";

    if (field.type === "switch") {
      const switchId = `${formId}-${field.name}`;
      return (
        <div key={field.name} data-field className={spanClass}>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor={switchId} className="font-medium">
                {field.label}
              </Label>
              {field.help && (
                <p className="text-sm text-muted-foreground">{field.help}</p>
              )}
            </div>
            <Switch
              id={switchId}
              checked={Boolean(values[field.name])}
              onCheckedChange={(checked) =>
                setValue(field.name, checked as T[typeof field.name], {
                  shouldDirty: true,
                })
              }
            />
          </div>
          {errorMessage && (
            <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
          )}
        </div>
      );
    }

    return (
      <div key={field.name} data-field className={cn("space-y-2", spanClass)}>
        <Label htmlFor={`${formId}-${field.name}`}>{field.label}</Label>

        {field.type === "textarea" && (
          <Textarea
            id={`${formId}-${field.name}`}
            placeholder={field.placeholder}
            readOnly={field.readOnly}
            {...register(field.name)}
          />
        )}

        {field.type === "select" && (
          <select
            id={`${formId}-${field.name}`}
            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
            disabled={field.readOnly}
            {...register(field.name)}
          >
            {(field.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {field.type === "text" && (
          <Input
            id={`${formId}-${field.name}`}
            type={field.type}
            step={field.step}
            placeholder={field.placeholder}
            readOnly={field.readOnly}
            className={field.readOnly ? "bg-muted/40" : undefined}
            {...register(field.name)}
          />
        )}

        {field.type === "number" && (
          <Input
            id={`${formId}-${field.name}`}
            type={field.type}
            step={field.step}
            placeholder={field.placeholder}
            readOnly={field.readOnly}
            className={field.readOnly ? "bg-muted/40" : undefined}
            // valueAsNumber: sin esto, watch()/renderHelp reciben el string
            // crudo del input aunque el tipo diga number (el cast del
            // resolver zod lo oculta). Puede entregar NaN mientras el
            // usuario escribe; z.coerce.number del caller lo tolera.
            {...register(field.name, { valueAsNumber: true })}
          />
        )}

        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
        {!errorMessage && field.help && (
          <p className="text-xs text-muted-foreground">{field.help}</p>
        )}
        {field.renderHelp?.(values as T)}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div
          className={cn(
            "grid flex-1 overflow-y-auto",
            mediaPanel ? "lg:grid-cols-[1fr_400px]" : "",
          )}
        >
          <form
            id={formId}
            ref={formRef}
            className="grid content-start gap-4 p-6 md:grid-cols-2"
            onSubmit={handleSubmit(onSubmit)}
          >
            {fields.map(renderField)}
          </form>

          {mediaPanel && (
            <aside className="border-t bg-muted/20 p-6 lg:border-l lg:border-t-0">
              {mediaPanel}
            </aside>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
