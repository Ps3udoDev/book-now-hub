# Rediseño del módulo de Inventario — Spec de diseño

**Fecha:** 2026-07-09
**Estado:** Aprobado por el usuario

## Contexto y problema

El módulo de inventario (`/t/[tenant]/inventory`) funciona pero es tedioso:
crear/editar producto navega a páginas completas (`/new`, `/[id]`), la moneda es
un input de texto libre, no hay plantilla Excel ni export (customers/specialists
sí las tienen), y existe un **bug en producción**: al subir una imagen el
cliente no recibe mensaje de éxito ni de error y la imagen nunca se sube.

### Diagnóstico del bug de imágenes (confirmado contra la BD remota)

- El bucket `product-images` existe, es público y sus políticas RLS de
  `storage.objects` están abiertas (insert/update/delete sin restricción de rol).
  **El storage no bloquea nada.**
- 0 objetos huérfanos: 222 objetos = 111 filas de `product_images` × 2
  (original + thumbnail). Todo lo que llega al storage se registra bien.
- Tenant `elvis-studio` tiene 3 productos recientes sin ninguna imagen.
- **Causa raíz:** en `src/app/t/[tenant]/inventory/new/page.tsx` y
  `[id]/page.tsx` el `try` de guardado tiene `finally` pero **no `catch`**.
  La conversión a WebP (`src/lib/utils/image-processing.ts`) usa `new Image()`
  + canvas; con formatos no decodificables por el navegador (típicamente HEIC
  de iPhone) `loadImage` rechaza, la excepción escapa sin manejarse y el flujo
  muere en silencio: sin toast, sin subida.

## Alcance

Solo el módulo de inventario. Componentes nuevos (`SchemaFormModal`,
`ResultDialog`) se crean como globales reutilizables en `src/components/common/`
pero solo se cablean en inventario.

## Decisiones tomadas con el usuario

1. **Modal para crear Y editar** — se eliminan las páginas `/inventory/new` y
   `/inventory/[id]`; el resumen de stock se muestra dentro del modal en modo
   edición.
2. **Leyenda de conversión** — a la moneda base del tenant únicamente.
3. **Export Excel** — filtros: estado, rango de fechas de creación, categoría y
   sucursal, y opción de incluir stock + resumen de movimientos.
4. **Dialog de warning** — para errores de permisos/rol (403 del API).
5. **Librería de animaciones** — **Anime.js** (instalar con `bun add animejs`).

## Diseño

### A. Fix del pipeline de imágenes

Archivos: `src/lib/utils/image-processing.ts`, `src/lib/utils/product-image-upload.ts`.

1. Decodificar con `createImageBitmap(file)` primero; fallback a `<img>`.
2. Si la decodificación falla → **subir el archivo original tal cual** (el
   bucket no restringe MIME), conservando extensión y contentType originales,
   en vez de fallar. Sin thumbnail en ese caso (thumbnail_path = null).
3. `uploadDraftProductImages` deja de lanzar al primer error: procesa todas las
   imágenes y devuelve `{ persisted: Map, failures: Array<{client_id, fileName,
   reason}> }`.
4. Detección temprana: al agregar un archivo al panel, si no se puede generar
   preview se marca la miniatura en estado de error con el motivo.
5. Todo el flujo de guardado (producto + imágenes) va en `try/catch` y el
   resultado se comunica con `ResultDialog`:
   - éxito total → success
   - producto guardado pero N imágenes fallaron → warning con detalle
   - fallo del producto → error
   - 403 → warning de permisos

### B. `SchemaFormModal` (global reutilizable)

Archivo: `src/components/common/schema-form-modal.tsx`.

- Props: `open`, `onOpenChange`, `title`, `description?`,
  `fields: FieldDef[]`, `zodSchema`, `defaultValues`, `submitLabel?`,
  `onSubmit(values) => Promise<void>`, `mediaPanel?: ReactNode`,
  `loading?`.
- `FieldDef`: `name`, `label`, `type: "text" | "number" | "textarea" |
  "select" | "switch" | "currency"`, `options?` (para select), `placeholder?`,
  `help?`, `colSpan?: 1 | 2`, `readOnly?`, `required?`.
- react-hook-form + `zodResolver` (convención del repo).
- Layout: `DialogContent` ancho (~`max-w-5xl`), grid 2 columnas en desktop:
  form a la izquierda (scroll interno), `mediaPanel` a la derecha; apilado en
  móvil. Footer fijo: Cancelar / **Guardar abajo a la derecha**.
- Animaciones Anime.js: entrada del modal (scale + fade) y stagger sutil de
  campos al abrir.
- El tipo de campo `currency` renderiza el select de monedas con leyenda de
  conversión (sección E).

### C. `ResultDialog` (global reutilizable)

Archivo: `src/components/common/result-dialog.tsx`.

- Variantes: `success` (check verde), `error` (X roja), `warning` (triángulo
  ámbar). Ícono SVG animado con Anime.js (stroke-dashoffset dibujándose).
- Props: `variant`, `title`, `message?`, `details?: string[]` (lista
  expandible, ej. imágenes que fallaron), `onClose`, `actionLabel?`/`onAction?`
  (ej. Reintentar).
- Reemplaza los toasts de éxito/error del guardado de producto en inventario.

### D. Panel de imágenes rediseñado

Archivo: `src/components/inventory/product-image-panel.tsx` (reemplaza a
`product-image-uploader.tsx`).

- Preview grande arriba (imagen seleccionada; por defecto la principal).
- Tira de miniaturas debajo: agregar (+), reordenar, marcar principal
  (estrella), quitar. Drag & drop de archivos sobre el panel.
- Estados por miniatura: nueva / guardada / subiendo / error (con motivo).
- En modo edición, debajo del panel: tarjetas compactas de stock (actual,
  alerta mínima, estado) — reemplaza el "Resumen de stock" de la página vieja.

### E. Moneda: select + leyenda de conversión

- Select con monedas activas del tenant (`useCurrencies`).
- Debajo del campo precio: "≈ {monto} {base} (tasa {rate})" convertido a la
  moneda base (`is_base_currency`) con la tasa vigente
  (`valid_until IS NULL`). Reutiliza `buildRateMap`/`getRateMultiplier` de
  `src/lib/utils/client-currency.ts`. Sin leyenda si la moneda ya es la base.

### F. Plantilla Excel + import masivo de productos

- Nuevo `src/templates/xlsx/products-template.ts` registrado en
  `templateConfigs`. Columnas: nombre*, precio*, moneda, sku, categoría,
  marca, stock inicial, alerta mínima, sucursal (por nombre; default la
  principal), activo, descripción.
- Extender `BulkImportButton`/`BulkImportModal` con entidad `"products"`.
  El import escribe fila por fila vía `POST /api/products` (convención:
  escrituras por API con `supabaseAdmin`).
- Botones "Plantilla" e "Importar" en la página de inventario.

### G. Export Excel con filtros

- Botón "Exportar" en la página de inventario abre un dialog con filtros:
  - Estado: todos / activos / inactivos
  - Rango de fechas de creación (desde/hasta, opcionales)
  - Categoría (todas o una) y sucursal (todas o una)
  - Checkbox: incluir stock actual + resumen de movimientos (total entradas /
    salidas por producto)
- Nuevo endpoint `GET /api/products/export` — valida sesión + membresía del
  tenant, consulta con `supabaseAdmin` sin paginación aplicando los filtros,
  devuelve JSON.
- El cliente genera el `.xlsx` con SheetJS (`xlsx`, ya instalado) y lo
  descarga como `inventario-{tenant}-{fecha}.xlsx`.

### H. Página de inventario

- "Nuevo" y "Editar" (desde `ProductCard`) abren `SchemaFormModal`.
- Se agregan: `BulkImportButton` (Plantilla + Importar) y botón Exportar.
- Se eliminan `src/app/t/[tenant]/inventory/new/` y `.../inventory/[id]/`
  (y los links que apunten a ellas).

## Manejo de errores

- Todos los flujos de guardado con `try/catch`; nunca más un `try/finally`
  sin catch en este módulo.
- 403 → ResultDialog warning con mensaje de permisos.
- Éxito parcial de imágenes → ResultDialog warning con lista de archivos
  fallidos y motivo.
- Import masivo conserva su UI actual de resultados (filas con error).

## Dependencias

- Nueva: `animejs` (instalar con **bun**: `bun add animejs`). Anime.js v4
  incluye tipos TS.
- Existentes reutilizadas: `xlsx`, react-hook-form, Zod, Radix Dialog, SWR.

## Verificación

- `npm run build` + `npx biome check --write` sobre archivos tocados.
- Manual con dev server: crear producto con imágenes (incluyendo un archivo
  no decodificable para ver el flujo de error), editar, reordenar imágenes,
  cambiar moneda y ver leyenda, descargar plantilla, importar Excel, exportar
  con filtros.
- No hay test runner configurado en el repo.
