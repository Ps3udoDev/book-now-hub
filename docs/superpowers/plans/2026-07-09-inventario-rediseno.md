# Rediseño del módulo de Inventario — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar las páginas de crear/editar producto por un modal global schema-driven con panel de imágenes, feedback con dialogs animados (Anime.js), select de moneda con conversión, arreglar el pipeline de imágenes que falla en silencio, y agregar plantilla/import/export Excel al inventario.

**Architecture:** Componentes globales nuevos en `src/components/common/` (`SchemaFormModal`, `ResultDialog`); wiring específico de inventario en `src/components/inventory/` (`ProductFormModal`, `ProductImagePanel`); extensión del sistema bulk-import existente (`src/templates/xlsx/`) con la entidad `products`; endpoint nuevo `GET /api/products/export`. Se eliminan `src/app/t/[tenant]/inventory/new/` y `.../inventory/[id]/`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, react-hook-form + Zod (`zodResolver`), Radix Dialog, SWR, Anime.js v4 (nueva dependencia, instalar con **bun**), SheetJS (`xlsx`, ya instalado), Supabase.

**Spec:** `docs/superpowers/specs/2026-07-09-inventario-rediseno-design.md`

## Global Constraints

- Instalar dependencias con **bun** (`bun add animejs`), NO npm.
- No hay test runner: verificar con `npx tsc --noEmit`, `npx biome check --write <archivos>` y `npm run build` al final; QA manual con dev server.
- Comentarios de código **en español**.
- Componentes cliente llevan `"use client"`.
- Escrituras a BD siempre vía API routes con `supabaseAdmin`; lecturas cliente vía service singleton con `createBrowserSB()`.
- Siempre filtrar por `tenant_id` en queries tenant-scoped.
- Biome: 2 espacios, imports organizados; evitar `noArrayIndexKey`, `noImgElement` está ya tolerado en este módulo (se usa `<img>` con URLs de blob/storage), `noUselessFragments`.
- Bucket de storage: `product-images` (público, sin restricción de MIME). Path: `{tenantId}/products/{productId}/{uuid}.{ext}`.
- Commits frecuentes, mensajes en español con prefijo convencional (`feat:`, `fix:`), terminados en `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Dependencia Anime.js + `ResultDialog` global

**Files:**
- Create: `src/components/common/result-dialog.tsx`
- Modify: `package.json` (vía `bun add animejs`)

**Interfaces:**
- Produces: `ResultDialog` (default-less named export), tipos `ResultVariant = "success" | "error" | "warning"` y `ResultDialogData { variant, title, message?, details? }`. Task 5 los consume.

- [ ] **Step 1: Instalar Anime.js con bun**

```bash
bun add animejs
```

Verificar en `package.json` que quedó `"animejs": "^4.x"`. Anime.js v4 trae tipos TS propios (no requiere `@types/animejs`).

- [ ] **Step 2: Crear `src/components/common/result-dialog.tsx`**

```tsx
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

const VARIANT_STYLES: Record<
  ResultVariant,
  { stroke: string; ring: string }
> = {
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
    animate(svgRef.current, {
      scale: [0.5, 1],
      opacity: [0, 1],
      duration: 350,
      ease: "outBack",
    });
    animate(svg.createDrawable(shapes), {
      draw: "0 1",
      duration: 600,
      delay: stagger(150, { start: 120 }),
      ease: "outQuad",
    });
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
            <path
              data-draw
              d="M24 6L44 41H4L24 6z"
              {...strokeProps}
            />
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

  return (
    <Dialog
      open={result !== null}
      onOpenChange={(open) => {
        if (!open) {
          setShowDetails(false);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        {result && (
          <>
            <DialogHeader className="items-center space-y-4 pt-4 text-center sm:text-center">
              <ResultIcon variant={result.variant} />
              <DialogTitle className="text-xl">{result.title}</DialogTitle>
              {result.message && (
                <DialogDescription className="text-base">
                  {result.message}
                </DialogDescription>
              )}
            </DialogHeader>

            {result.details && result.details.length > 0 && (
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
                    {result.details.map((detail) => (
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
```

Nota: si `svg.createDrawable` exige elementos individuales en la versión instalada, iterar: `shapes.forEach((s) => animate(svg.createDrawable(s), {...}))`. Verificar contra los tipos del paquete instalado.

- [ ] **Step 3: Verificar tipos y lint**

Run: `npx tsc --noEmit` — Expected: sin errores nuevos (los preexistentes del repo, si los hay, no aumentan).
Run: `npx biome check --write src/components/common/result-dialog.tsx` — Expected: OK.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock src/components/common/result-dialog.tsx
git commit -m "feat(common): ResultDialog animado con Anime.js"
```

(Si bun generó `bun.lockb` o modificó `package-lock.json`, incluirlo.)

---

### Task 2: Pipeline de imágenes robusto (fix del bug de producción)

**Files:**
- Modify: `src/lib/utils/image-processing.ts`
- Modify: `src/lib/utils/product-image-upload.ts`

**Interfaces:**
- Produces: `uploadDraftProductImages(params): Promise<UploadDraftImagesResult>` donde `UploadDraftImagesResult = { persisted: Map<string, PersistedProductImage>; failures: ProductImageUploadFailure[] }` y `ProductImageUploadFailure = { client_id: string; file_name: string; reason: string }`. **Cambio de contrato**: antes devolvía `Map` directo y lanzaba al primer error; ahora nunca lanza por una imagen individual. Tasks 5 lo consume. `ProductImageDraft` no cambia.

**Contexto del bug:** la conversión a WebP usa `new Image()` + canvas; con formatos que el navegador no decodifica (HEIC de iPhone) `loadImage` rechaza y, como los callers usan `try/finally` sin `catch`, el error muere en silencio. Confirmado contra la BD: 0 objetos huérfanos en storage, productos recientes sin imágenes.

- [ ] **Step 1: Decodificación robusta en `image-processing.ts`**

Reemplazar la función `loadImage` y adaptar `resizeImageToWebP` para intentar `createImageBitmap` primero (soporta más formatos y no depende del pipeline `<img>`):

```ts
// Fuente decodificada lista para dibujar en canvas.
type DecodedImage = ImageBitmap | HTMLImageElement;

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("El navegador no pudo decodificar la imagen"));
    };

    image.src = imageUrl;
  });
}

// Intenta createImageBitmap (más formatos, más rápido) y cae a <img>.
async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Algunos navegadores fallan con ciertos formatos: probar vía <img>.
    }
  }
  return loadImageElement(file);
}
```

En `resizeImageToWebP`, cambiar `const image = await loadImage(file);` por `const image = await decodeImage(file);`. `calculateContainSize` y `context.drawImage(image, ...)` funcionan igual con `ImageBitmap` (tiene `width`/`height` y es un `CanvasImageSource`). Si la imagen es `ImageBitmap`, llamar `image.close()` después del `drawImage` para liberar memoria.

- [ ] **Step 2: Reescribir `uploadDraftProductImages` para no fallar en silencio**

Reemplazar el contenido de `src/lib/utils/product-image-upload.ts` (conservando `ProductImageDraft` y `PersistedProductImage` tal cual):

```ts
import { storageService } from "@/lib/services/storage";
import { generateProductImageSet } from "@/lib/utils/image-processing";

export interface ProductImageDraft {
  client_id: string;
  id?: string;
  file?: File;
  preview_url: string;
  storage_path?: string | null;
  thumbnail_path?: string | null;
  is_existing: boolean;
}

export interface PersistedProductImage {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  is_primary: boolean | null;
  sort_order: number | null;
}

export interface ProductImageUploadFailure {
  client_id: string;
  file_name: string;
  reason: string;
}

export interface UploadDraftImagesResult {
  persisted: Map<string, PersistedProductImage>;
  failures: ProductImageUploadFailure[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido";
}

/**
 * Sube las imágenes nuevas de un producto. Nunca lanza por una imagen
 * individual: intenta convertir a WebP y, si el navegador no puede
 * decodificar el archivo (ej. HEIC), sube el original tal cual (sin
 * thumbnail). Devuelve las persistidas y las que fallaron con su motivo.
 */
export async function uploadDraftProductImages(params: {
  tenantId: string;
  productId: string;
  drafts: ProductImageDraft[];
}): Promise<UploadDraftImagesResult> {
  const uploads = params.drafts.filter((draft) => draft.file);
  const failures: ProductImageUploadFailure[] = [];
  const payload: Array<{
    client_id: string;
    storage_path: string;
    thumbnail_path: string | null;
    is_primary: boolean;
    sort_order: number;
  }> = [];

  for (let index = 0; index < uploads.length; index += 1) {
    const draft = uploads[index];
    if (!draft.file) continue;

    try {
      let originalFile = draft.file;
      let thumbnailFile: File | null = null;
      let extension =
        draft.file.name.split(".").pop()?.toLowerCase() || "bin";

      try {
        const imageSet = await generateProductImageSet(draft.file);
        originalFile = imageSet.original;
        thumbnailFile = imageSet.thumbnail;
        extension = "webp";
      } catch {
        // No decodificable en este navegador (ej. HEIC): subir el
        // archivo original sin conversión ni thumbnail.
      }

      const originalPath = storageService.buildProductImagePath(
        params.tenantId,
        params.productId,
        extension,
        "original",
      );

      await storageService.uploadImage(originalFile, originalPath, {
        bucket: "product-images",
        contentType: originalFile.type || undefined,
        upsert: true,
      });

      let thumbnailPath: string | null = null;
      if (thumbnailFile) {
        thumbnailPath = storageService.buildProductImagePath(
          params.tenantId,
          params.productId,
          "webp",
          "thumbnail",
        );
        await storageService.uploadImage(thumbnailFile, thumbnailPath, {
          bucket: "product-images",
          contentType: "image/webp",
          upsert: true,
        });
      }

      payload.push({
        client_id: draft.client_id,
        storage_path: originalPath,
        thumbnail_path: thumbnailPath,
        is_primary: false,
        sort_order: index,
      });
    } catch (error) {
      failures.push({
        client_id: draft.client_id,
        file_name: draft.file.name,
        reason: errorMessage(error),
      });
    }
  }

  if (!payload.length) {
    return { persisted: new Map(), failures };
  }

  const response = await fetch(`/api/products/${params.productId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      images: payload.map(
        ({ storage_path, thumbnail_path, is_primary, sort_order }) => ({
          storage_path,
          thumbnail_path,
          is_primary,
          sort_order,
        }),
      ),
    }),
  });
  const json = await response.json();

  if (!response.ok) {
    // El registro en BD falló para todo el lote: reportar cada imagen.
    for (const item of payload) {
      const draft = uploads.find((u) => u.client_id === item.client_id);
      failures.push({
        client_id: item.client_id,
        file_name: draft?.file?.name || item.storage_path,
        reason: json.error || "No se pudieron registrar las imágenes",
      });
    }
    return { persisted: new Map(), failures };
  }

  const persisted = new Map<string, PersistedProductImage>();
  for (let index = 0; index < (json.images || []).length; index += 1) {
    const createdImage = json.images[index];
    const source = payload[index];
    if (source) {
      persisted.set(source.client_id, createdImage);
    }
  }

  return { persisted, failures };
}
```

Nota: `contentType: originalFile.type || undefined` — `uploadFile` en `storage.ts` ya usa `file.type` como fallback, esto es solo explícito.

- [ ] **Step 3: Verificar que los callers actuales rompen (esperado) y tipos del resto compilan**

Run: `npx tsc --noEmit`
Expected: errores SOLO en `src/app/t/[tenant]/inventory/new/page.tsx` y `src/app/t/[tenant]/inventory/[id]/page.tsx` (usan el contrato viejo `Map`). Esas páginas se eliminan en Task 6; se toleran los errores hasta entonces **o** (preferido, para mantener `tsc` verde) hacer el ajuste mínimo en ambas páginas: destructurar `const { persisted } = await uploadDraftProductImages(...)` y usar `persisted` donde antes se usaba el resultado directo. Hacer el ajuste mínimo.

Run: `npx biome check --write src/lib/utils/image-processing.ts src/lib/utils/product-image-upload.ts`

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils/image-processing.ts src/lib/utils/product-image-upload.ts "src/app/t/[tenant]/inventory/new/page.tsx" "src/app/t/[tenant]/inventory/[id]/page.tsx"
git commit -m "fix(inventory): pipeline de imágenes robusto — decodificación con fallback y errores por imagen"
```

---

### Task 3: `SchemaFormModal` global (form schema-driven + slot de media)

**Files:**
- Create: `src/components/common/schema-form-modal.tsx`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces (Task 5 los consume):
  - `SchemaFieldDef<T>`: `{ name: Path<T>; label: string; type: "text" | "number" | "textarea" | "select" | "switch"; options?: SchemaFieldOption[]; placeholder?: string; help?: string; colSpan?: 1 | 2; readOnly?: boolean; step?: string; renderHelp?: (values: T) => ReactNode }`
  - `SchemaFieldOption`: `{ value: string; label: string }`
  - `SchemaFormModal<T>` props: `{ open; onOpenChange; title; description?; fields: SchemaFieldDef<T>[]; schema: ZodType<T>; defaultValues: DefaultValues<T>; submitLabel?; loading?; onSubmit: (values: T) => Promise<void>; mediaPanel?: ReactNode }`

- [ ] **Step 1: Crear `src/components/common/schema-form-modal.tsx`**

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { animate, stagger } from "animejs";
import { Loader2 } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import {
  type DefaultValues,
  type FieldValues,
  type Path,
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
  renderHelp?: (values: T) => ReactNode;
}

interface SchemaFormModalProps<T extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: SchemaFieldDef<T>[];
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
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
    resolver: zodResolver(schema),
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
    const error = errors[field.name];
    const errorMessage =
      typeof error?.message === "string" ? error.message : null;
    const spanClass = field.colSpan === 2 ? "md:col-span-2" : "";

    if (field.type === "switch") {
      return (
        <div
          key={field.name}
          data-field
          className={cn(
            "flex items-center justify-between rounded-lg border p-4",
            spanClass,
          )}
        >
          <div>
            <p className="font-medium">{field.label}</p>
            {field.help && (
              <p className="text-sm text-muted-foreground">{field.help}</p>
            )}
          </div>
          <Switch
            checked={Boolean(values[field.name])}
            onCheckedChange={(checked) =>
              setValue(
                field.name,
                checked as T[typeof field.name],
                { shouldDirty: true },
              )
            }
          />
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

        {(field.type === "text" || field.type === "number") && (
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

        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
        {!errorMessage && field.help && (
          <p className="text-xs text-muted-foreground">{field.help}</p>
        )}
        {field.renderHelp && field.renderHelp(values as T)}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
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
```

Notas de implementación:
- Los campos `number` deben validarse con `z.coerce.number()` en el schema del caller (los inputs HTML devuelven string).
- Si `zodResolver` genera fricción de tipos con genéricos (`Resolver<T>` vs `ZodType`), tipar el resolver como `zodResolver(schema) as Resolver<T>` — es un cast conocido con schemas `z.coerce`.
- El `useEffect` de reset depende de `defaultValues` por referencia: el caller debe memoizar `defaultValues` (`useMemo`) para no resetear en cada render.

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit` — Expected: sin errores.
Run: `npx biome check --write src/components/common/schema-form-modal.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/common/schema-form-modal.tsx
git commit -m "feat(common): SchemaFormModal reutilizable con form schema-driven y panel de media"
```

---

### Task 4: `ProductImagePanel` (preview grande + miniaturas + estados)

**Files:**
- Create: `src/components/inventory/product-image-panel.tsx`
- Modify: `src/components/inventory/index.ts`

**Interfaces:**
- Consumes: `ProductImageDraft` de `@/lib/utils/product-image-upload`.
- Produces: `ProductImagePanel` con props `{ images: ProductImageDraft[]; onChange: (images: ProductImageDraft[]) => void; uploadFailures?: Map<string, string> }`. `uploadFailures` mapea `client_id → motivo` para marcar en rojo las que fallaron al guardar. Task 5 lo consume. La imagen en índice 0 es siempre la principal.

- [ ] **Step 1: Crear `src/components/inventory/product-image-panel.tsx`**

```tsx
"use client";

import { animate } from "animejs";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProductImageDraft } from "@/lib/utils/product-image-upload";

interface ProductImagePanelProps {
  images: ProductImageDraft[];
  onChange: (images: ProductImageDraft[]) => void;
  // client_id → motivo de fallo en el último intento de guardado.
  uploadFailures?: Map<string, string>;
}

/**
 * Panel de imágenes del producto: preview grande arriba y tira de
 * miniaturas debajo. La imagen en índice 0 es la principal.
 */
export function ProductImagePanel({
  images,
  onChange,
  uploadFailures,
}: ProductImagePanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Previews que el navegador no pudo renderizar (ej. HEIC). Se suben
  // igual (el pipeline sube el original), solo avisamos que no hay vista.
  const [brokenPreviews, setBrokenPreviews] = useState<Set<string>>(
    () => new Set(),
  );

  const selected = useMemo(
    () =>
      images.find((image) => image.client_id === selectedId) ||
      images[0] ||
      null,
    [images, selectedId],
  );
  const selectedIndex = selected
    ? images.findIndex((image) => image.client_id === selected.client_id)
    : -1;

  // Animar el cambio de preview.
  useEffect(() => {
    if (!previewRef.current || !selected) return;
    animate(previewRef.current, {
      opacity: [0.4, 1],
      scale: [0.98, 1],
      duration: 220,
      ease: "outQuad",
    });
  }, [selected]);

  const appendFiles = (files: FileList | File[]) => {
    const next = Array.from(files).map((file) => ({
      client_id: crypto.randomUUID(),
      file,
      preview_url: URL.createObjectURL(file),
      is_existing: false,
    })) as ProductImageDraft[];

    onChange([...images, ...next]);
    if (next.length) setSelectedId(next[next.length - 1].client_id);
  };

  const removeImage = (clientId: string) => {
    const image = images.find((item) => item.client_id === clientId);
    if (image && !image.is_existing) {
      URL.revokeObjectURL(image.preview_url);
    }
    const remaining = images.filter((item) => item.client_id !== clientId);
    onChange(remaining);
    if (selectedId === clientId) {
      setSelectedId(remaining[0]?.client_id ?? null);
    }
  };

  const moveSelected = (direction: -1 | 1) => {
    if (selectedIndex < 0) return;
    const targetIndex = selectedIndex + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const next = [...images];
    const [item] = next.splice(selectedIndex, 1);
    next.splice(targetIndex, 0, item);
    onChange(next);
  };

  const makeSelectedPrimary = () => {
    if (selectedIndex <= 0) return;
    const next = [...images];
    const [item] = next.splice(selectedIndex, 1);
    next.unshift(item);
    onChange(next);
  };

  const markBroken = (clientId: string) => {
    setBrokenPreviews((current) => {
      if (current.has(clientId)) return current;
      const next = new Set(current);
      next.add(clientId);
      return next;
    });
  };

  return (
    <div
      className="space-y-4"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (event.dataTransfer.files?.length) {
          appendFiles(event.dataTransfer.files);
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) {
            appendFiles(event.target.files);
            event.target.value = "";
          }
        }}
      />

      {/* Preview grande */}
      {selected ? (
        <div className="space-y-3">
          <div
            ref={previewRef}
            className="relative aspect-square overflow-hidden rounded-xl border bg-muted"
          >
            {brokenPreviews.has(selected.client_id) ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
                <p>
                  Vista previa no disponible en este navegador. El archivo se
                  subirá igualmente.
                </p>
              </div>
            ) : (
              <img
                src={selected.preview_url}
                alt="Vista previa del producto"
                className="h-full w-full object-contain"
                onError={() => markBroken(selected.client_id)}
              />
            )}
            {selectedIndex === 0 && (
              <div className="absolute left-3 top-3 rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                Principal
              </div>
            )}
            {uploadFailures?.has(selected.client_id) && (
              <div className="absolute inset-x-3 bottom-3 rounded-md bg-destructive/90 px-3 py-2 text-xs text-destructive-foreground">
                {uploadFailures.get(selected.client_id)}
              </div>
            )}
          </div>

          {/* Toolbar sobre la imagen seleccionada */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => moveSelected(-1)}
                disabled={selectedIndex <= 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => moveSelected(1)}
                disabled={
                  selectedIndex < 0 || selectedIndex >= images.length - 1
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={selectedIndex === 0 ? "default" : "outline"}
                size="sm"
                onClick={makeSelectedPrimary}
                disabled={selectedIndex === 0}
              >
                <Star className="mr-1 h-4 w-4" />
                Principal
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => selected && removeImage(selected.client_id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-6 text-center transition hover:bg-muted/40"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Arrastra imágenes aquí</p>
            <p className="text-sm text-muted-foreground">
              o haz clic para seleccionar
            </p>
          </div>
        </button>
      )}

      {/* Tira de miniaturas */}
      <div className="flex flex-wrap gap-2">
        {images.map((image, index) => {
          const isSelected = selected?.client_id === image.client_id;
          const failed = uploadFailures?.has(image.client_id);
          return (
            <button
              key={image.client_id}
              type="button"
              onClick={() => setSelectedId(image.client_id)}
              className={cn(
                "relative h-16 w-16 overflow-hidden rounded-lg border bg-muted",
                isSelected && "ring-2 ring-primary",
                failed && "ring-2 ring-destructive",
              )}
            >
              {brokenPreviews.has(image.client_id) ? (
                <div className="flex h-full w-full items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
              ) : (
                <img
                  src={image.preview_url}
                  alt={`Miniatura ${index + 1}`}
                  className="h-full w-full object-cover"
                  onError={() => markBroken(image.client_id)}
                />
              )}
              {index === 0 && (
                <Star className="absolute left-1 top-1 h-3.5 w-3.5 fill-primary text-primary" />
              )}
              {!image.is_existing && (
                <span className="absolute bottom-0 inset-x-0 bg-background/80 text-[10px] leading-tight text-muted-foreground">
                  Nueva
                </span>
              )}
            </button>
          );
        })}

        {images.length > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed text-muted-foreground transition hover:bg-muted/40"
            aria-label="Agregar imágenes"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Exportar desde el índice del módulo**

En `src/components/inventory/index.ts` agregar:

```ts
export { ProductImagePanel } from "./product-image-panel";
```

(No eliminar todavía el export de `ProductImageUploader`; se retira en Task 6 junto con las páginas viejas.)

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit` — Expected: sin errores.
Run: `npx biome check --write src/components/inventory/product-image-panel.tsx src/components/inventory/index.ts`

- [ ] **Step 4: Commit**

```bash
git add src/components/inventory/product-image-panel.tsx src/components/inventory/index.ts
git commit -m "feat(inventory): ProductImagePanel con preview grande, miniaturas y estados de error"
```

---

### Task 5: `ProductFormModal` (wiring completo: crear/editar, moneda, ResultDialog, stock)

**Files:**
- Create: `src/components/inventory/product-form-modal.tsx`
- Modify: `src/components/inventory/index.ts`

**Interfaces:**
- Consumes: `SchemaFormModal`/`SchemaFieldDef` (Task 3), `ResultDialog`/`ResultDialogData` (Task 1), `ProductImagePanel` (Task 4), `uploadDraftProductImages` → `UploadDraftImagesResult` (Task 2), `useActiveCurrencies`/`useBaseCurrency`/`useExchangeRates` de `@/hooks/supabase/use-currencies`, `buildRateMap`/`getRateMultiplier` de `@/lib/utils/client-currency`, `ProductApiItem` de `@/hooks/supabase/use-products`, `Branch` de `@/types`.
- Produces: `ProductFormModal` con props `{ open: boolean; onOpenChange: (open: boolean) => void; tenantId: string; branches: Branch[]; categories: string[]; product: ProductApiItem | null; onSaved: () => void }`. `product === null` → crear; con producto → editar. Task 6 lo consume.

- [ ] **Step 1: Crear `src/components/inventory/product-form-modal.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ResultDialog, type ResultDialogData } from "@/components/common/result-dialog";
import {
  SchemaFormModal,
  type SchemaFieldDef,
} from "@/components/common/schema-form-modal";
import { ProductImagePanel } from "@/components/inventory/product-image-panel";
import {
  useActiveCurrencies,
  useBaseCurrency,
  useExchangeRates,
} from "@/hooks/supabase/use-currencies";
import type { ProductApiItem } from "@/hooks/supabase/use-products";
import { storageService } from "@/lib/services/storage";
import {
  buildRateMap,
  getRateMultiplier,
} from "@/lib/utils/client-currency";
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
  const renderConversionHelp = (values: ProductFormValues) => {
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
  };

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
    // renderConversionHelp usa rateMap/baseCurrency: incluirlos aquí.
    [branches, categoryOptions, currencies, isEdit, rateMap, baseCurrency],
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
        message:
          error instanceof Error ? error.message : "Error inesperado.",
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
              (result.variant === "warning" && result.title !== "Sin permisos"));
          setResult(null);
          if (closeForm) {
            onOpenChange(false);
          }
        }}
      />
    </>
  );
}
```

Nota de tipos: `productSchema` usa `z.coerce.number()`, así que el tipo de *entrada* difiere del de salida; si `zodResolver` reclama, usar `zodResolver(productSchema) as Resolver<ProductFormValues>` (importar `Resolver` de react-hook-form) — consistente con la nota de Task 3.

- [ ] **Step 2: Exportar en `src/components/inventory/index.ts`**

```ts
export { ProductFormModal } from "./product-form-modal";
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit` — Expected: sin errores.
Run: `npx biome check --write src/components/inventory/product-form-modal.tsx src/components/inventory/index.ts`

- [ ] **Step 4: Commit**

```bash
git add src/components/inventory/product-form-modal.tsx src/components/inventory/index.ts
git commit -m "feat(inventory): ProductFormModal con moneda convertida, imágenes y ResultDialog"
```

---

### Task 6: Cablear la página de inventario y eliminar las páginas viejas

**Files:**
- Modify: `src/app/t/[tenant]/inventory/page.tsx`
- Modify: `src/components/inventory/product-card.tsx`
- Modify: `src/components/inventory/index.ts`
- Delete: `src/app/t/[tenant]/inventory/new/page.tsx` (y su carpeta)
- Delete: `src/app/t/[tenant]/inventory/[id]/page.tsx` (y su carpeta)
- Delete: `src/components/inventory/product-form.tsx`
- Delete: `src/components/inventory/product-image-uploader.tsx`

**Interfaces:**
- Consumes: `ProductFormModal` (Task 5).
- Produces: `ProductCard` cambia su prop `tenantSlug` — se elimina — y gana `onEdit: (product: ProductApiItem) => void`.

- [ ] **Step 1: `ProductCard` — botón Editar como callback**

En `src/components/inventory/product-card.tsx`:
- Quitar `import Link from "next/link"` y la prop `tenantSlug`.
- Agregar `onEdit: (product: ProductApiItem) => void` a `ProductCardProps`.
- Reemplazar el botón Editar (líneas ~139-144):

```tsx
<Button variant="outline" size="sm" onClick={() => onEdit(product)}>
  <Pencil className="mr-2 h-4 w-4" />
  Editar
</Button>
```

- [ ] **Step 2: Página de inventario — abrir modal en "Nuevo" y "Editar"**

En `src/app/t/[tenant]/inventory/page.tsx`:

1. Agregar imports:

```tsx
import { ProductFormModal } from "@/components/inventory";
import { useBranches } from "@/hooks/supabase/use-branches";
```

2. Agregar estado y datos dentro del componente:

```tsx
const { branches } = useBranches(tenant?.id || null);
const [formOpen, setFormOpen] = useState(false);
const [editingProduct, setEditingProduct] = useState<ProductApiItem | null>(
  null,
);

const openCreate = () => {
  setEditingProduct(null);
  setFormOpen(true);
};

const openEdit = (product: ProductApiItem) => {
  setEditingProduct(product);
  setFormOpen(true);
};
```

3. Reemplazar los DOS `<Link href={`/t/${tenantSlug}/inventory/new`}>` (header y empty-state, líneas ~155 y ~245) por botones que llaman `openCreate()`. Ejemplo del header:

```tsx
<Button onClick={openCreate}>
  <Plus className="mr-2 h-4 w-4" />
  Nuevo producto
</Button>
```

(Quitar el `asChild` y el `Link` interior; conservar íconos/textos existentes.)

4. Pasar `onEdit={openEdit}` a cada `<ProductCard>` y quitar `tenantSlug`.

5. Renderizar el modal al final del JSX (dentro del div raíz):

```tsx
{tenant?.id && (
  <ProductFormModal
    open={formOpen}
    onOpenChange={setFormOpen}
    tenantId={tenant.id}
    branches={branches}
    categories={categories.map((category) => category.name)}
    product={editingProduct}
    onSaved={() => {
      refresh();
    }}
  />
)}
```

6. Si `tenantSlug` queda sin usos tras quitar los Links, eliminar la variable.

- [ ] **Step 3: Eliminar páginas y componentes viejos**

```bash
git rm -r "src/app/t/[tenant]/inventory/new" "src/app/t/[tenant]/inventory/[id]"
git rm src/components/inventory/product-form.tsx src/components/inventory/product-image-uploader.tsx
```

En `src/components/inventory/index.ts` quitar los exports de `ProductForm`, `ProductFormValues` (el viejo) y `ProductImageUploader`.

- [ ] **Step 4: Buscar referencias colgantes**

Run: `npx tsc --noEmit` — Expected: sin errores. Si algo más importaba `ProductForm`/`ProductImageUploader` o linkeaba a `/inventory/new` o `/inventory/[id]`, corregirlo (según grep previo solo las páginas eliminadas y `product-card.tsx` los usaban).
Run: `npx biome check --write "src/app/t/[tenant]/inventory/page.tsx" src/components/inventory/product-card.tsx src/components/inventory/index.ts`

- [ ] **Step 5: Prueba manual**

Run: `npm run dev` y en el navegador: `/t/<tenant>/inventory` → "Nuevo producto" abre el modal; crear un producto con 2 imágenes; verificar dialog de éxito animado; "Editar" en una card abre el modal con datos e imágenes; quitar una imagen y guardar; cambiar moneda y ver la leyenda de conversión.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(inventory): crear/editar producto en modal; eliminar páginas /new y /[id]"
```

---

### Task 7: Plantilla Excel + import masivo de productos

**Files:**
- Create: `src/templates/xlsx/products-template.ts`
- Modify: `src/templates/xlsx/types.ts`
- Modify: `src/templates/xlsx/index.ts`
- Modify: `src/lib/xlsx/generate-template.ts`
- Modify: `src/lib/xlsx/parse-upload.ts`
- Modify: `src/components/bulk-import/bulk-import-button.tsx`
- Modify: `src/components/bulk-import/bulk-import-modal.tsx`
- Modify: `src/app/t/[tenant]/inventory/page.tsx`

**Interfaces:**
- Consumes: sistema bulk-import existente (`templateConfigs`, `generateTemplate`, `parseUpload`, `BulkImportButton`).
- Produces: entidad `"products"` disponible en `BulkImportButton`. El import crea productos vía `POST /api/products` (body: `tenant_id, branch_id, name, price, currency_iso?, sku?, category?, brand?, stock_quantity?, min_stock_alert?, is_active?, description?`).

- [ ] **Step 1: Ampliar el tipo de entidad**

En `src/templates/xlsx/types.ts`:

```ts
export interface XlsxTemplateConfig {
  entity: "services" | "specialists" | "customers" | "products";
  sheetName: string;
  columns: XlsxColumnDef[];
}
```

- [ ] **Step 2: Crear `src/templates/xlsx/products-template.ts`**

```ts
// src/templates/xlsx/products-template.ts
import type { XlsxTemplateConfig } from "./types";

export const productsTemplate: XlsxTemplateConfig = {
  entity: "products",
  sheetName: "Productos",
  columns: [
    {
      key: "name",
      header: "Nombre",
      required: true,
      type: "string",
      description: "Nombre del producto (obligatorio)",
      width: 28,
    },
    {
      key: "price",
      header: "Precio",
      required: true,
      type: "number",
      description: "Precio de venta (obligatorio, ej: 12.50)",
      width: 12,
    },
    {
      key: "currency_iso",
      header: "Moneda",
      required: false,
      type: "string",
      defaultValue: "USD",
      description: "Código ISO de la moneda (ej: USD, BOB)",
      width: 10,
    },
    {
      key: "sku",
      header: "SKU",
      required: false,
      type: "string",
      description: "Código único del producto",
      width: 14,
    },
    {
      key: "category",
      header: "Categoría",
      required: false,
      type: "string",
      description: "Categoría del producto",
      width: 18,
    },
    {
      key: "brand",
      header: "Marca",
      required: false,
      type: "string",
      description: "Marca del producto",
      width: 16,
    },
    {
      key: "stock_quantity",
      header: "Stock inicial",
      required: false,
      type: "number",
      defaultValue: 0,
      description: "Unidades iniciales (movimiento de entrada)",
      width: 14,
    },
    {
      key: "min_stock_alert",
      header: "Alerta mínima",
      required: false,
      type: "number",
      defaultValue: 0,
      description: "Stock mínimo antes de alertar",
      width: 14,
    },
    {
      key: "branch",
      header: "Sucursal",
      required: false,
      type: "string",
      description: "Nombre de la sucursal (vacío = principal)",
      width: 20,
    },
    {
      key: "is_active",
      header: "Activo",
      required: false,
      type: "boolean",
      defaultValue: true,
      description: "true o false",
      width: 10,
    },
    {
      key: "description",
      header: "Descripción",
      required: false,
      type: "string",
      description: "Descripción del producto",
      width: 35,
    },
  ],
};
```

- [ ] **Step 3: Registrar la plantilla**

En `src/templates/xlsx/index.ts`:

```ts
export { productsTemplate } from "./products-template";
// ...
import { productsTemplate } from "./products-template";

export const templateConfigs: Record<string, XlsxTemplateConfig> = {
  services: servicesTemplate,
  specialists: specialistsTemplate,
  customers: customersTemplate,
  products: productsTemplate,
};
```

En `src/lib/xlsx/generate-template.ts`, agregar al objeto `exampleData`:

```ts
products: {
  name: "Shampoo hidratante 500ml",
  price: 12.5,
  currency_iso: "USD",
  sku: "SH-001",
  category: "Cuidado capilar",
  brand: "L'Oréal",
  stock_quantity: 24,
  min_stock_alert: 5,
  branch: "",
  is_active: true,
  description: "Shampoo para cabello seco",
},
```

En `src/lib/xlsx/parse-upload.ts`, en el bloque de duplicados (después del caso `services`), agregar dedupe por SKU o nombre:

```ts
if (config.entity === "products") {
  const sku = String(data.sku || "").toLowerCase();
  const name = String(data.name || "").toLowerCase();
  const dedupeKey = sku || name;
  if (dedupeKey && seenNames.has(dedupeKey)) {
    isDuplicate = true;
  }
  if (dedupeKey) seenNames.add(dedupeKey);
}
```

- [ ] **Step 4: Extender BulkImport a products**

En `src/components/bulk-import/bulk-import-button.tsx`:

```ts
entity: "services" | "specialists" | "customers" | "products";
```

En `src/components/bulk-import/bulk-import-modal.tsx`:

1. Mismo cambio en el tipo de `entity` de las props.
2. `entityLabels`: agregar `products: "productos",`.
3. Import del hook de sucursales y uso (solo carga cuando aplica):

```ts
import { useBranches } from "@/hooks/supabase/use-branches";
// dentro del componente:
const { branches } = useBranches(entity === "products" ? tenantId : null);
```

4. En `createEntity`, agregar el caso:

```ts
case "products": {
  // Resolver la sucursal por nombre; vacío → sucursal principal.
  const branchName = String(data.branch || "").trim().toLowerCase();
  const branch = branchName
    ? branches.find((b) => b.name.trim().toLowerCase() === branchName)
    : branches.find((b) => b.is_main) || branches[0];

  if (!branch) {
    throw new Error(
      branchName
        ? `Sucursal "${data.branch}" no encontrada`
        : "El tenant no tiene sucursales",
    );
  }

  const response = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      tenant_id: tenantId,
      branch_id: branch.id,
      name: String(data.name),
      price: Number(data.price),
      currency_iso: data.currency_iso ? String(data.currency_iso) : undefined,
      sku: data.sku ? String(data.sku) : undefined,
      category: data.category ? String(data.category) : undefined,
      brand: data.brand ? String(data.brand) : undefined,
      stock_quantity: data.stock_quantity
        ? Number(data.stock_quantity)
        : undefined,
      min_stock_alert: data.min_stock_alert
        ? Number(data.min_stock_alert)
        : undefined,
      is_active: data.is_active !== null ? Boolean(data.is_active) : undefined,
      description: data.description ? String(data.description) : undefined,
    }),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || "No se pudo crear el producto");
  }
  return json;
}
```

- [ ] **Step 5: Agregar los botones a la página de inventario**

En `src/app/t/[tenant]/inventory/page.tsx`, junto al botón "Nuevo producto" del header:

```tsx
import { BulkImportButton } from "@/components/bulk-import";
// en el JSX del header, antes del botón Nuevo:
{tenant?.id && (
  <BulkImportButton
    entity="products"
    tenantId={tenant.id}
    onImportComplete={refresh}
  />
)}
```

(Verificar cómo exporta `src/components/bulk-import/index.ts` y usar ese import.)

- [ ] **Step 6: Verificar**

Run: `npx tsc --noEmit` — Expected: sin errores.
Run: `npx biome check --write src/templates/xlsx src/lib/xlsx src/components/bulk-import "src/app/t/[tenant]/inventory/page.tsx"`
Manual: descargar plantilla, llenar 2 filas (una válida, una sin nombre), importar; verificar preview con error en la inválida y creación de la válida.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(inventory): plantilla Excel e import masivo de productos"
```

---

### Task 8: Export de inventario a Excel con filtros

**Files:**
- Create: `src/app/api/products/export/route.ts`
- Create: `src/lib/xlsx/export-products.ts`
- Create: `src/components/inventory/export-products-dialog.tsx`
- Modify: `src/components/inventory/index.ts`
- Modify: `src/app/t/[tenant]/inventory/page.tsx`

**Interfaces:**
- Consumes: `requireTenantAccess` de `src/app/api/products/_utils.ts`, `useProductCategories`, `useBranches`.
- Produces: `GET /api/products/export?tenant_id=&status=&date_from=&date_to=&category=&branch_id=&include_stock=` → `{ products: ExportProductRow[] }`; `exportProductsToXlsx(rows, fileName, includeStock)`; `<ExportProductsDialog tenantId categories branches tenantSlug />`.

- [ ] **Step 1: Crear `src/app/api/products/export/route.ts`**

```ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";
import { requireTenantAccess } from "../_utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");
    const status = searchParams.get("status"); // all | active | inactive
    const dateFrom = searchParams.get("date_from"); // YYYY-MM-DD
    const dateTo = searchParams.get("date_to"); // YYYY-MM-DD
    const category = searchParams.get("category");
    const branchId = searchParams.get("branch_id");
    const includeStock = searchParams.get("include_stock") === "true";

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenant_id es requerido" },
        { status: 400 },
      );
    }

    const access = await requireTenantAccess(tenantId, user.id);
    if (access instanceof NextResponse) return access;

    const admin = supabaseAdmin as any;

    let query = admin
      .from("products")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (status === "active") query = query.eq("is_active", true);
    if (status === "inactive") query = query.eq("is_active", false);
    if (category) query = query.eq("category", category);
    if (branchId) query = query.eq("branch_id", branchId);
    if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

    const { data: products, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Nombres de sucursal para el Excel.
    const { data: branches } = await admin
      .from("branches")
      .select("id, name")
      .eq("tenant_id", tenantId);
    const branchNames = new Map<string, string>(
      (branches || []).map((b: { id: string; name: string }) => [
        b.id,
        b.name,
      ]),
    );

    let stockByProduct = new Map<string, unknown>();
    const movementTotals = new Map<
      string,
      { entries: number; exits: number }
    >();

    if (includeStock && (products || []).length) {
      const productIds = (products || []).map((p: { id: string }) => p.id);

      const [{ data: stockRows }, { data: movements }] = await Promise.all([
        admin
          .from("v_product_stock_summary")
          .select("*")
          .in("product_id", productIds),
        admin
          .from("inventory_movements")
          .select("product_id, movement_type, quantity")
          .in("product_id", productIds),
      ]);

      stockByProduct = new Map(
        (stockRows || []).map((s: { product_id: string }) => [
          s.product_id,
          s,
        ]),
      );

      for (const movement of movements || []) {
        const key = movement.product_id as string;
        const current = movementTotals.get(key) || { entries: 0, exits: 0 };
        if (movement.movement_type === "entry") {
          current.entries += Number(movement.quantity) || 0;
        } else if (movement.movement_type === "exit") {
          current.exits += Number(movement.quantity) || 0;
        }
        movementTotals.set(key, current);
      }
    }

    const rows = (products || []).map(
      (product: Record<string, unknown>) => {
        const stock = stockByProduct.get(product.id as string) as
          | { calculated_stock?: number; is_low_stock?: boolean }
          | undefined;
        const totals = movementTotals.get(product.id as string);

        return {
          ...product,
          branch_name: branchNames.get(product.branch_id as string) || "",
          ...(includeStock
            ? {
                calculated_stock:
                  stock?.calculated_stock ?? product.stock_quantity,
                is_low_stock: stock?.is_low_stock ?? false,
                total_entries: totals?.entries ?? 0,
                total_exits: totals?.exits ?? 0,
              }
            : {}),
        };
      },
    );

    return NextResponse.json({ products: rows });
  } catch (error) {
    console.error("Error in GET /api/products/export:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
```

Nota: verificar durante la implementación los valores reales del enum `movement_type` (el diagnóstico previo usa `entry`; comprobar si el de salida es `exit` con `SELECT DISTINCT movement_type FROM inventory_movements` o mirando `src/types/supabase.ts`, enum `inventory_movement_type` o similar) y ajustar el `else if`.

- [ ] **Step 2: Crear `src/lib/xlsx/export-products.ts`**

```ts
// src/lib/xlsx/export-products.ts
import * as XLSX from "xlsx";

export interface ExportProductRow {
  name: string;
  sku: string | null;
  category: string | null;
  brand: string | null;
  price: number;
  currency_iso: string;
  branch_name: string;
  stock_quantity: number;
  min_stock_alert: number;
  is_active: boolean;
  created_at?: string | null;
  description?: string | null;
  calculated_stock?: number;
  is_low_stock?: boolean;
  total_entries?: number;
  total_exits?: number;
}

// Genera y descarga el Excel de respaldo del inventario.
export function exportProductsToXlsx(
  rows: ExportProductRow[],
  fileName: string,
  includeStock: boolean,
): void {
  const data = rows.map((row) => ({
    Nombre: row.name,
    SKU: row.sku || "",
    "Categoría": row.category || "",
    Marca: row.brand || "",
    Precio: row.price,
    Moneda: row.currency_iso,
    Sucursal: row.branch_name,
    Stock: row.stock_quantity,
    "Alerta mínima": row.min_stock_alert,
    Activo: row.is_active ? "Sí" : "No",
    Creado: row.created_at ? row.created_at.slice(0, 10) : "",
    "Descripción": row.description || "",
    ...(includeStock
      ? {
          "Stock calculado": row.calculated_stock ?? row.stock_quantity,
          "Stock bajo": row.is_low_stock ? "Sí" : "No",
          "Total entradas": row.total_entries ?? 0,
          "Total salidas": row.total_exits ?? 0,
        }
      : {}),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = Object.keys(data[0] || { a: 1 }).map((key) => ({
    wch: Math.max(12, key.length + 4),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  XLSX.writeFile(wb, fileName);
}
```

- [ ] **Step 3: Crear `src/components/inventory/export-products-dialog.tsx`**

```tsx
"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  type ExportProductRow,
  exportProductsToXlsx,
} from "@/lib/xlsx/export-products";
import type { Branch } from "@/types";

interface ExportProductsDialogProps {
  tenantId: string;
  tenantSlug: string;
  categories: string[];
  branches: Branch[];
}

/**
 * Dialog de exportación del inventario a Excel con filtros
 * (respaldo completo o parcial).
 */
export function ExportProductsDialog({
  tenantId,
  tenantSlug,
  categories,
  branches,
}: ExportProductsDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState("all");
  const [branchId, setBranchId] = useState("all");
  const [includeStock, setIncludeStock] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ tenant_id: tenantId, status });
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (category !== "all") params.set("category", category);
      if (branchId !== "all") params.set("branch_id", branchId);
      if (includeStock) params.set("include_stock", "true");

      const response = await fetch(
        `/api/products/export?${params.toString()}`,
        { credentials: "include" },
      );
      const json = await response.json();

      if (!response.ok) {
        toast.error(json.error || "No se pudo exportar el inventario");
        return;
      }

      const rows = (json.products || []) as ExportProductRow[];
      if (!rows.length) {
        toast.warning("No hay productos con esos filtros");
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      exportProductsToXlsx(
        rows,
        `inventario-${tenantSlug}-${today}.xlsx`,
        includeStock,
      );
      toast.success(`${rows.length} productos exportados`);
      setOpen(false);
    } catch {
      toast.error("Error inesperado al exportar");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar inventario</DialogTitle>
          <DialogDescription>
            Descarga un Excel con tus productos como respaldo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as typeof status)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Solo activos</SelectItem>
                <SelectItem value="inactive">Solo inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="export-date-from">Creado desde</Label>
              <Input
                id="export-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-date-to">Creado hasta</Label>
              <Input
                id="export-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sucursal</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={includeStock}
              onCheckedChange={(checked) =>
                setIncludeStock(checked === true)
              }
            />
            Incluir stock calculado y resumen de movimientos
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={exporting}
          >
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Cablear en la página + export en índice**

`src/components/inventory/index.ts`:

```ts
export { ExportProductsDialog } from "./export-products-dialog";
```

En `src/app/t/[tenant]/inventory/page.tsx`, junto a `BulkImportButton` en el header:

```tsx
{tenant?.id && (
  <ExportProductsDialog
    tenantId={tenant.id}
    tenantSlug={tenantSlug}
    categories={categories.map((category) => category.name)}
    branches={branches}
  />
)}
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit` — Expected: sin errores.
Run: `npx biome check --write src/app/api/products/export/route.ts src/lib/xlsx/export-products.ts src/components/inventory/export-products-dialog.tsx "src/app/t/[tenant]/inventory/page.tsx" src/components/inventory/index.ts`
Manual: exportar con "Todos" + stock incluido; abrir el Excel; probar filtro por fechas que no matchee nada (toast "No hay productos").

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(inventory): export de inventario a Excel con filtros"
```

---

### Task 9: Verificación final integral

**Files:** ninguno nuevo.

- [ ] **Step 1: Lint y build completos**

Run: `npx biome check --write src` — Expected: sin errores (warnings preexistentes fuera del módulo se toleran).
Run: `npm run build` — Expected: build exitoso, sin referencias a las rutas eliminadas.

- [ ] **Step 2: QA manual completo (dev server)**

Con `npm run dev`, en `/t/<tenant>/inventory`:

1. **Crear**: modal con form izquierda / imágenes derecha; subir 3 imágenes; reordenar; marcar principal; guardar → check animado; el producto aparece en la grilla con sus imágenes.
2. **Error de imagen**: renombrar un `.txt` a `.jpg` y subirlo → al guardar, warning con detalle del archivo fallido (el producto sí se guarda).
3. **Editar**: abrir, quitar una imagen, agregar otra, guardar → success; verificar imágenes actualizadas.
4. **Moneda**: seleccionar moneda ≠ base → leyenda "≈ X.XX {base}"; sin tasa configurada → "Sin tasa vigente".
5. **403**: (si hay un usuario con rol sin permisos) → warning "Sin permisos".
6. **Plantilla**: descargar, verificar columnas y fila de ejemplo.
7. **Import**: llenar 3 filas (1 inválida), importar → 2 creados, 1 con error visible.
8. **Export**: exportar todo con stock → abrir Excel y verificar columnas de entradas/salidas.

- [ ] **Step 3: Commit final si hubo ajustes**

```bash
git add -A
git commit -m "chore(inventory): ajustes de QA del rediseño de inventario"
```
