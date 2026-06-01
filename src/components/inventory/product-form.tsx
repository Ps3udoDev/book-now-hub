"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Branch } from "@/types";

export interface ProductFormValues {
  branch_id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  brand: string;
  price: number;
  currency_iso: string;
  stock_quantity: number;
  min_stock_alert: number;
  is_active: boolean;
}

interface ProductFormProps {
  branches: Branch[];
  loading?: boolean;
  product?: Partial<ProductFormValues> | null;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({
  branches,
  loading = false,
  product,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const defaultBranchId = useMemo(
    () =>
      product?.branch_id ||
      branches.find((branch) => branch.is_main)?.id ||
      branches[0]?.id ||
      "",
    [branches, product?.branch_id],
  );

  const form = useForm<ProductFormValues>({
    defaultValues: {
      branch_id: defaultBranchId,
      name: product?.name || "",
      description: product?.description || "",
      sku: product?.sku || "",
      category: product?.category || "",
      brand: product?.brand || "",
      price: product?.price ?? 0,
      currency_iso: product?.currency_iso || "USD",
      stock_quantity: product?.stock_quantity ?? 0,
      min_stock_alert: product?.min_stock_alert ?? 0,
      is_active: product?.is_active ?? true,
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = form;

  useEffect(() => {
    reset({
      branch_id: defaultBranchId,
      name: product?.name || "",
      description: product?.description || "",
      sku: product?.sku || "",
      category: product?.category || "",
      brand: product?.brand || "",
      price: product?.price ?? 0,
      currency_iso: product?.currency_iso || "USD",
      stock_quantity: product?.stock_quantity ?? 0,
      min_stock_alert: product?.min_stock_alert ?? 0,
      is_active: product?.is_active ?? true,
    });
  }, [defaultBranchId, product, reset]);

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            placeholder="Ej. Shampoo hidratante"
            {...register("name", { required: "El nombre es requerido" })}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="branch_id">Sucursal</Label>
          <select
            id="branch_id"
            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
            {...register("branch_id", { required: "La sucursal es requerida" })}
          >
            <option value="">Selecciona una sucursal</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          {errors.branch_id && (
            <p className="text-sm text-destructive">
              {errors.branch_id.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" placeholder="Ej. SH-001" {...register("sku")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoría</Label>
          <Input
            id="category"
            placeholder="Ej. Shampoos"
            {...register("category")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand">Marca</Label>
          <Input id="brand" placeholder="Ej. L'Oréal" {...register("brand")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Precio</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            {...register("price", {
              valueAsNumber: true,
              required: "El precio es requerido",
              min: { value: 0, message: "El precio debe ser positivo" },
            })}
          />
          {errors.price && (
            <p className="text-sm text-destructive">{errors.price.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency_iso">Moneda</Label>
          <Input
            id="currency_iso"
            placeholder="USD"
            {...register("currency_iso")}
          />
        </div>

        {product?.name ? (
          <div className="space-y-2">
            <Label htmlFor="stock_quantity">Stock actual</Label>
            <Input
              id="stock_quantity"
              type="number"
              value={product?.stock_quantity ?? 0}
              readOnly
              disabled
              className="bg-muted/40"
            />
            <p className="text-xs text-muted-foreground">
              El stock se ajusta desde <strong>Inventario → Ajustes</strong>, no
              directamente aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="stock_quantity">Stock inicial</Label>
            <Input
              id="stock_quantity"
              type="number"
              min="0"
              {...register("stock_quantity", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Se registrará como movimiento de entrada &quot;Stock
              inicial&quot;.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="min_stock_alert">Alerta mínima</Label>
          <Input
            id="min_stock_alert"
            type="number"
            min="0"
            {...register("min_stock_alert", { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            placeholder="Descripción del producto"
            {...register("description")}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
          <div>
            <p className="font-medium">Producto activo</p>
            <p className="text-sm text-muted-foreground">
              Los productos inactivos no se muestran en el catálogo público.
            </p>
          </div>
          <Switch
            checked={watch("is_active")}
            onCheckedChange={(checked) => setValue("is_active", checked)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Guardar producto
        </Button>
      </div>
    </form>
  );
}
