// src/components/customers/customer-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Customer } from "@/types";

// Códigos de país comunes para Venezuela
export const PHONE_COUNTRY_CODES = [
  { value: "+58", label: "🇻🇪 +58 (Venezuela)" },
  { value: "+57", label: "🇨🇴 +57 (Colombia)" },
  { value: "+1", label: "🇺🇸 +1 (USA)" },
  { value: "+34", label: "🇪🇸 +34 (España)" },
  { value: "+52", label: "🇲🇽 +52 (México)" },
] as const;

// Tipos de documento
export const DOCUMENT_TYPES = [
  { value: "V", label: "V - Venezolano" },
  { value: "E", label: "E - Extranjero" },
  { value: "J", label: "J - Jurídico" },
  { value: "P", label: "P - Pasaporte" },
  { value: "CC", label: "CC - Cédula Colombia" },
] as const;

// Tags predefinidos sugeridos
export const SUGGESTED_TAGS = [
  "VIP",
  "Frecuente",
  "Nuevo",
  "Referido",
  "Empresa",
  "Influencer",
] as const;

// Schema de validación
const customerSchema = z.object({
  first_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  last_name: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal(""))
    .transform((val) => val || null),
  phone: z
    .string()
    .optional()
    .transform((val) => val?.replace(/\D/g, "") || null),
  phone_country_code: z.string().default("+58"),
  document_type: z.string().optional().nullable(),
  document_number: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  customer?: Customer | null;
  onSubmit: (data: CustomerFormData & { tags: string[] }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isLoading = false,
}: CustomerFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>(customer?.tags || []);
  const [newTag, setNewTag] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      first_name: customer?.first_name || "",
      last_name: customer?.last_name || "",
      // full_name is not part of the schema, removed to fix TypeScript error
      email: customer?.email || "",
      phone: customer?.phone || "",
      phone_country_code: customer?.phone_country_code || "+58",
      document_type: customer?.document_type || "",
      document_number: customer?.document_number || "",
      birth_date: customer?.birth_date || "",
      gender: customer?.gender as "male" | "female" | "other" | null | undefined,
      address: customer?.address || "",
      city: customer?.city || "",
      notes: customer?.notes || "",
      is_active: customer?.is_active ?? true,
    },
  });

  const phone_country_code = watch("phone_country_code");
  const document_type = watch("document_type");
  const gender = watch("gender");
  const is_active = watch("is_active");

  const handleFormSubmit = async (data: CustomerFormData) => {
    try {
      setSubmitError(null);
      await onSubmit({ ...data, tags });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Error al guardar"
      );
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
    }
    setNewTag("");
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const loading = isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Información personal */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Información personal</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">Nombre *</Label>
            <Input
              id="first_name"
              placeholder="Juan"
              {...register("first_name")}
              disabled={loading}
            />
            {errors.first_name && (
              <p className="text-sm text-destructive">
                {errors.first_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Apellido *</Label>
            <Input
              id="last_name"
              placeholder="Pérez"
              {...register("last_name")}
              disabled={loading}
            />
            {errors.last_name && (
              <p className="text-sm text-destructive">
                {errors.last_name.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gender">Género</Label>
            <Select
              value={gender || ""}
              onValueChange={(value) =>
                setValue(
                  "gender",
                  value as "male" | "female" | "other" | null
                )
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Femenino</SelectItem>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_date">Fecha de nacimiento</Label>
            <Input
              id="birth_date"
              type="date"
              {...register("birth_date")}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Contacto */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Contacto</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="juan@email.com"
              {...register("email")}
              disabled={loading}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono / WhatsApp</Label>
            <div className="flex gap-2">
              <Select
                value={phone_country_code}
                onValueChange={(value) => setValue("phone_country_code", value)}
                disabled={loading}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHONE_COUNTRY_CODES.map((code) => (
                    <SelectItem key={code.value} value={code.value}>
                      {code.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="phone"
                placeholder="4141234567"
                {...register("phone")}
                disabled={loading}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              placeholder="Av. Principal, Casa 123"
              {...register("address")}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input
              id="city"
              placeholder="Caracas"
              {...register("city")}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Documento de identidad */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Documento de identidad</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="document_type">Tipo de documento</Label>
            <Select
              value={document_type || ""}
              onValueChange={(value) => setValue("document_type", value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((doc) => (
                  <SelectItem key={doc.value} value={doc.value}>
                    {doc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_number">Número de documento</Label>
            <Input
              id="document_number"
              placeholder="12345678"
              {...register("document_number")}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Etiquetas</h3>

        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {tags.length === 0 && (
            <span className="text-sm text-muted-foreground">
              Sin etiquetas
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Nueva etiqueta..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(newTag);
              }
            }}
            disabled={loading}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addTag(newTag)}
            disabled={loading || !newTag.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Sugeridas:</span>
          {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="cursor-pointer hover:bg-accent"
              onClick={() => addTag(tag)}
            >
              + {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Notas internas</h3>

        <Textarea
          id="notes"
          placeholder="Alergias, preferencias, información importante..."
          rows={3}
          {...register("notes")}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Solo visible para el personal del salón
        </p>
      </div>

      {/* Estado */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label htmlFor="is_active" className="cursor-pointer">
            Cliente activo
          </Label>
          <p className="text-sm text-muted-foreground">
            Los clientes inactivos no aparecen en búsquedas
          </p>
        </div>
        <Switch
          id="is_active"
          checked={is_active}
          onCheckedChange={(checked) => setValue("is_active", checked)}
          disabled={loading}
        />
      </div>

      {/* Error */}
      {submitError && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {submitError}
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : customer ? (
            "Guardar cambios"
          ) : (
            "Crear cliente"
          )}
        </Button>
      </div>
    </form>
  );
}