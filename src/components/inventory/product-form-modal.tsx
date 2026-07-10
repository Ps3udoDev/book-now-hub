"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  ResultDialog,
  type ResultDialogData,
} from "@/components/common/result-dialog";
import {
  type SchemaFieldDef,
  SchemaFormModal,
} from "@/components/common/schema-form-modal";
import { ProductImagePanel } from "@/components/inventory/product-image-panel";
import {
  useActiveCurrencies,
  useBaseCurrency,
  useExchangeRates,
} from "@/hooks/supabase/use-currencies";
import type { ProductApiItem } from "@/hooks/supabase/use-products";
import { storageService } from "@/lib/services/storage";
import { buildRateMap, getRateMultiplier } from "@/lib/utils/client-currency";
import {
  type ProductImageDraft,
  uploadDraftProductImages,
} from "@/lib/utils/product-image-upload";
import type { Branch } from "@/types";

const productSchema = z.object({
  branch_id: z.string().min(1, "La sucursal es requerida"),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string(),
  sku: z.string(),
  category: z.string(),
  brand: z.string(),
  price: z.coerce.number().min(0, "El precio debe ser positivo"),
  currency_iso: z.string().min(1, "La moneda es requerida"),
  stock_quantity: z.coerce.number().min(0),
  min_stock_alert: z.coerce.number().min(0),
  is_active: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  branches: Branch[];
  categories: string[];
  product: ProductApiItem | null;
  onSaved: () => void;
}

export function ProductFormModal({
  open,
  onOpenChange,
  tenantId,
  branches,
  categories,
  product,
  onSaved,
}: ProductFormModalProps) {
  const isEdit = product !== null;
  const [images, setImages] = useState<ProductImageDraft[]>([]);
  const [uploadFailures, setUploadFailures] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ResultDialogData | null>(null);

  const { currencies } = useActiveCurrencies();
  const { baseCurrency } = useBaseCurrency();
  const { rates } = useExchangeRates(tenantId);
  const rateMap = useMemo(() => buildRateMap(rates), [rates]);

  // Cargar imágenes existentes al abrir en modo edición.
  useEffect(() => {
    if (!open) return;
    setUploadFailures(new Map());
    setImages(
      (product?.images || []).map((image) => ({
        client_id: image.id,
        id: image.id,
        preview_url: storageService.getPublicUrl(
          image.thumbnail_path || image.storage_path,
          "product-images",
        ),
        storage_path: image.storage_path,
        thumbnail_path: image.thumbnail_path,
        is_existing: true,
      })),
    );
  }, [open, product]);

  const defaultBranchId = useMemo(
    () =>
      product?.branch_id ||
      branches.find((branch) => branch.is_main)?.id ||
      branches[0]?.id ||
      "",
    [branches, product?.branch_id],
  );

  const defaultValues = useMemo<ProductFormValues>(
    () => ({
      branch_id: defaultBranchId,
      name: product?.name || "",
      description: product?.description || "",
      sku: product?.sku || "",
      category: product?.category || "",
      brand: product?.brand || "",
      price: product?.price ?? 0,
      currency_iso: product?.currency_iso || baseCurrency?.code || "USD",
      stock_quantity: product?.stock_quantity ?? 0,
      min_stock_alert: product?.min_stock_alert ?? 0,
      is_active: product?.is_active ?? true,
    }),
    [defaultBranchId, product, baseCurrency?.code],
  );

  const categoryOptions = useMemo(() => {
    const set = new Set(categories.filter(Boolean));
    if (product?.category) set.add(product.category);
    return Array.from(set).sort();
  }, [categories, product?.category]);

  // Leyenda de conversión a la moneda base debajo del precio.
  // Memoizada (useCallback) con deps [rateMap, baseCurrency] para que sea
  // referencialmente estable entre renders y no fuerce a `fields` a
  // recalcularse en cada tecla que el usuario escribe en el form.
  const renderConversionHelp = useCallback(
    (values: ProductFormValues) => {
      const base = baseCurrency?.code;
      if (!base || !values.currency_iso || values.currency_iso === base) {
        return null;
      }
      const multiplier = getRateMultiplier(
        values.currency_iso,
        base,
        rateMap,
        base,
      );
      if (multiplier === null) {
        return (
          <p className="text-xs text-muted-foreground">
            Sin tasa vigente {values.currency_iso} → {base}
          </p>
        );
      }
      const amount = Number(values.price) || 0;
      return (
        <p className="text-xs text-muted-foreground">
          ≈ {(amount * multiplier).toFixed(2)} {base} (tasa{" "}
          {multiplier.toFixed(4)})
        </p>
      );
    },
    [rateMap, baseCurrency],
  );

  const fields = useMemo<SchemaFieldDef<ProductFormValues>[]>(
    () => [
      {
        name: "name",
        label: "Nombre",
        type: "text",
        placeholder: "Ej. Shampoo hidratante",
        colSpan: 2,
      },
      {
        name: "branch_id",
        label: "Sucursal",
        type: "select",
        options: [
          { value: "", label: "Selecciona una sucursal" },
          ...branches.map((branch) => ({
            value: branch.id,
            label: branch.name,
          })),
        ],
      },
      { name: "sku", label: "SKU", type: "text", placeholder: "Ej. SH-001" },
      {
        name: "category",
        label: "Categoría",
        type: "select",
        options: [
          { value: "", label: "Sin categoría" },
          ...categoryOptions.map((category) => ({
            value: category,
            label: category,
          })),
        ],
      },
      {
        name: "brand",
        label: "Marca",
        type: "text",
        placeholder: "Ej. L'Oréal",
      },
      {
        name: "price",
        label: "Precio",
        type: "number",
        step: "0.01",
      },
      {
        name: "currency_iso",
        label: "Moneda",
        type: "select",
        options: currencies.map((currency) => ({
          value: currency.code,
          label: `${currency.code} — ${currency.name}`,
        })),
        renderHelp: renderConversionHelp,
      },
      {
        name: "stock_quantity",
        label: isEdit ? "Stock actual" : "Stock inicial",
        type: "number",
        readOnly: isEdit,
        help: isEdit
          ? "El stock se ajusta desde Inventario → Movimientos, no aquí."
          : 'Se registrará como movimiento de entrada "Stock inicial".',
      },
      {
        name: "min_stock_alert",
        label: "Alerta mínima",
        type: "number",
      },
      {
        name: "description",
        label: "Descripción",
        type: "textarea",
        placeholder: "Descripción del producto",
        colSpan: 2,
      },
      {
        name: "is_active",
        label: "Producto activo",
        type: "switch",
        help: "Los productos inactivos no se muestran en el catálogo público.",
        colSpan: 2,
      },
    ],
    [branches, categoryOptions, currencies, isEdit, renderConversionHelp],
  );

  // Traduce fallos por imagen a un ResultDialog amigable.
  const buildImageFailureDetails = (
    failures: Array<{ file_name: string; reason: string }>,
  ) => failures.map((f) => `${f.file_name}: ${f.reason}`);

  const handleSubmit = async (values: ProductFormValues) => {
    setSaving(true);
    setUploadFailures(new Map());

    try {
      if (!isEdit) {
        // ---- Crear ----
        const response = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tenant_id: tenantId, ...values }),
        });
        const json = await response.json();

        if (!response.ok) {
          setResult({
            variant: response.status === 403 ? "warning" : "error",
            title:
              response.status === 403
                ? "Sin permisos"
                : "No se pudo crear el producto",
            message: json.error || "Inténtalo nuevamente.",
          });
          return;
        }

        const { persisted, failures } = images.length
          ? await uploadDraftProductImages({
              tenantId,
              productId: json.product.id,
              drafts: images,
            })
          : { persisted: new Map(), failures: [] };

        const orderedImages = images
          .map((image, index) => {
            const saved = persisted.get(image.client_id);
            if (!saved) return null;
            return { id: saved.id, is_primary: index === 0, sort_order: index };
          })
          .filter(Boolean);

        if (orderedImages.length) {
          await fetch(`/api/products/${json.product.id}/images`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ images: orderedImages }),
          });
        }

        if (failures.length) {
          setUploadFailures(
            new Map(failures.map((f) => [f.client_id, f.reason])),
          );
          setResult({
            variant: "warning",
            title: "Producto creado con advertencias",
            message: `${failures.length} imagen(es) no se pudieron subir.`,
            details: buildImageFailureDetails(failures),
          });
        } else {
          setResult({ variant: "success", title: "Producto creado" });
        }
        onSaved();
        return;
      }

      // ---- Editar ----
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      const json = await response.json();

      if (!response.ok) {
        setResult({
          variant: response.status === 403 ? "warning" : "error",
          title:
            response.status === 403
              ? "Sin permisos"
              : "No se pudo actualizar el producto",
          message: json.error || "Inténtalo nuevamente.",
        });
        return;
      }

      // Borrar imágenes existentes que se quitaron del panel.
      const existingIds = new Set(
        (product.images || []).map((image) => image.id),
      );
      const keptExistingIds = new Set(
        images.filter((image) => image.id).map((image) => image.id as string),
      );
      const deletedIds = Array.from(existingIds).filter(
        (id) => !keptExistingIds.has(id),
      );
      for (const imageId of deletedIds) {
        await fetch(`/api/products/${product.id}/images/${imageId}`, {
          method: "DELETE",
          credentials: "include",
        });
      }

      const { persisted, failures } = await uploadDraftProductImages({
        tenantId,
        productId: product.id,
        drafts: images.filter((image) => !image.is_existing),
      });

      const orderedImages = images
        .map((image, index) => {
          const savedExisting =
            image.id &&
            (product.images || []).find((current) => current.id === image.id);
          const saved = savedExisting || persisted.get(image.client_id);
          if (!saved) return null;
          return { id: saved.id, is_primary: index === 0, sort_order: index };
        })
        .filter(Boolean);

      if (orderedImages.length) {
        await fetch(`/api/products/${product.id}/images`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ images: orderedImages }),
        });
      }

      if (failures.length) {
        setUploadFailures(
          new Map(failures.map((f) => [f.client_id, f.reason])),
        );
        setResult({
          variant: "warning",
          title: "Producto actualizado con advertencias",
          message: `${failures.length} imagen(es) no se pudieron subir.`,
          details: buildImageFailureDetails(failures),
        });
      } else {
        setResult({ variant: "success", title: "Producto actualizado" });
      }
      onSaved();
    } catch (error) {
      // Nunca más un fallo silencioso: cualquier excepción inesperada
      // (red, conversión, etc.) termina en un dialog de error.
      setResult({
        variant: "error",
        title: "Algo salió mal",
        message: error instanceof Error ? error.message : "Error inesperado.",
      });
    } finally {
      setSaving(false);
    }
  };

  const stockSummary = isEdit ? (
    <div className="mt-6 grid grid-cols-3 gap-2">
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs text-muted-foreground">Stock</p>
        <p className="text-lg font-bold">
          {product.stock_summary?.calculated_stock ?? product.stock_quantity}
        </p>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs text-muted-foreground">Alerta</p>
        <p className="text-lg font-bold">{product.min_stock_alert}</p>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs text-muted-foreground">Estado</p>
        <p className="text-lg font-bold">
          {product.stock_summary?.is_low_stock ? "Bajo" : "OK"}
        </p>
      </div>
    </div>
  ) : null;

  return (
    <>
      <SchemaFormModal<ProductFormValues>
        open={open}
        onOpenChange={onOpenChange}
        title={isEdit ? "Editar producto" : "Nuevo producto"}
        description={
          isEdit
            ? product.name
            : "Registra un producto para el módulo de inventario."
        }
        fields={fields}
        schema={productSchema}
        defaultValues={defaultValues}
        submitLabel="Guardar producto"
        loading={saving}
        onSubmit={handleSubmit}
        mediaPanel={
          <div>
            <ProductImagePanel
              images={images}
              onChange={setImages}
              uploadFailures={uploadFailures}
            />
            {stockSummary}
          </div>
        }
      />

      <ResultDialog
        result={result}
        onClose={() => {
          // Capturar antes de limpiar el estado.
          const closeForm =
            result !== null &&
            (result.variant === "success" ||
              // Warning de guardado parcial cierra; warning de permisos
              // (403) no, porque no hubo guardado.
              (result.variant === "warning" &&
                result.title !== "Sin permisos"));
          setResult(null);
          if (closeForm) {
            onOpenChange(false);
          }
        }}
      />
    </>
  );
}
