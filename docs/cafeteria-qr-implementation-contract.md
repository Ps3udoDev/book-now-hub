# Contrato de Implementación: QR de Cafetería por Estación

Fecha: 2026-04-24
Estado: propuesta técnica previa a implementación

## 1. Objetivo

Agregar un flujo de acceso rápido a cafetería mediante QR por estación de trabajo, de forma que:

- el especialista pueda mostrar o imprimir un QR desde su estación;
- el cliente escanee el QR y entre directo al menú de cafetería con contexto de sucursal, estación y especialista;
- si el cliente ya tiene cita activa o próxima en esa estación, el sistema intente asociar automáticamente su identidad;
- si no tiene cita o no se puede inferir, el cliente pueda continuar identificándose con nombre + email;
- al crear el pedido, quede trazabilidad de qué estación y qué especialista originaron el flujo;
- el cliente vea número de pedido, estado y tiempo estimado restante.

## 2. Estado actual verificado

## Base de datos

- `cafe_orders` ya existe y ya soporta integración contable/commission flow.
- `appointments` ya tiene `customer_id`, `specialist_id` y `workstation_id`.
- `workstations` hoy solo guarda datos operativos básicos:
  - `branch_id`
  - `tenant_id`
  - `name`
  - `code`
  - `station_type`
  - `position_x`, `position_y`, `floor`
  - `is_active`
- `customers` ya tiene índice único por `(tenant_id, email)`.
- El sistema ya tiene lógica para buscar/crear customer por email en servicios existentes y hay patrones reaprovechables.

## Frontend

- Ya existe `/t/[tenant]/cafeteria` para pedido cliente/especialista autenticado.
- Ya existe `/t/[tenant]/cafeteria/menu` y `/t/[tenant]/cafeteria/cocina`.
- La sidebar actual solo expone cafetería como módulo general, más “Menú cafetería” y “Cocina cafetería”.
- No existe hoy una pantalla de settings específica para QR de cafetería.

## Dependencias

- No hay librería QR instalada actualmente.
- Para impresión ya existen patrones en el proyecto con `window.print()`.

## 3. Alcance propuesto

## Incluido

1. Configuración de QR por estación.
2. Visualización del QR desde settings.
3. Vista rápida del QR desde sidebar en cafetería.
4. Ruta pública o semipública de entrada por QR.
5. Resolución de contexto `tenant + branch + workstation + specialist`.
6. Captura mínima de cliente cuando no se lo pueda inferir.
7. Creación/asociación de `customer` por email si hace falta.
8. Creación de pedido de cafetería con trazabilidad de estación.
9. Vista de seguimiento del pedido para cliente.
10. Opción de imprimir el QR.

## Fuera de alcance inicial

- login obligatorio del cliente antes de pedir;
- pagos online desde el flujo QR;
- múltiples QRs por una misma estación para distintos modos;
- campaña de marketing, analytics avanzados o push notifications;
- autoasignación compleja por agenda histórica o reconocimiento de dispositivo.

## 4. Cambios SQL propuestos

Voy a proponer un SQL nuevo, separado de los scripts anteriores, con cambios mínimos y trazables.

## 4.1 `workstations`

Agregar columnas:

- `cafeteria_qr_enabled boolean not null default false`
- `cafeteria_qr_slug text unique null`
- `cafeteria_qr_label text null`
- `cafeteria_qr_last_generated_at timestamptz null`

Propósito:

- activar/desactivar QR por estación;
- tener un identificador público corto y estable para el enlace;
- permitir una etiqueta visual imprimible si quieres algo más amigable que el nombre técnico;
- auditar regeneración.

## 4.2 `cafe_orders`

Agregar columnas:

- `workstation_id uuid null references public.workstations(id) on delete set null`
- `source text not null default 'internal'`
- `placed_by_name text null`
- `placed_by_email text null`
- `estimated_ready_at timestamptz null`

Propósito:

- guardar la estación origen del pedido;
- distinguir pedidos internos vs QR vs futuros canales;
- conservar nombre/email capturados en el flujo QR aunque todavía no existiera sesión autenticada;
- mostrar ETA al cliente.

## 4.3 Vista o RPC de resolución de contexto

Opción recomendada: RPC o función SQL para resolver el contexto del QR.

Entrada:

- `tenant_slug`
- `workstation_qr_slug`

Salida:

- `tenant_id`
- `branch_id`
- `workstation_id`
- `workstation_name`
- `specialist_id` asignado o inferido
- `specialist_name`
- `qr_enabled`
- `station_active`

Esto centraliza reglas y evita duplicarlas entre API y frontend.

## 4.4 Función para “find or create customer by email”

Opción recomendada: crear una función SQL específica para QR, en vez de depender de lógica duplicada en frontend.

Entrada:

- `tenant_id`
- `branch_id`
- `email`
- `full_name`
- `preferred_specialist_id`

Salida:

- `customer_id`
- `was_created boolean`

Razón:

- hay unicidad por email;
- esta operación es crítica y conviene hacerla transaccional del lado servidor.

## 5. Dependencias/librerías propuestas

## Recomendación

Instalar una sola librería de QR:

- `qrcode`

Uso propuesto:

- generar `data URL` o SVG en cliente/servidor para vista previa e impresión;
- no hace falta una librería distinta para render React si usamos utilidades pequeñas.

## No hace falta agregar

- librería especial de impresión;
- librería de PDF en esta primera versión.

La impresión puede resolverse con una vista limpia HTML + CSS + `window.print()`.

## 6. Arquitectura funcional propuesta

## 6.1 Settings cafetería

Nueva sección:

- `/t/[tenant]/settings/cafeteria`

Submódulos dentro de la página:

- selector de sucursal;
- listado de estaciones de la sucursal;
- especialista asociado o inferido;
- estado del QR;
- botón “Generar / regenerar QR”;
- botón “Ver”;
- botón “Imprimir”.

Nota:

- hoy `workstations` no tiene “owner specialist” explícito.
- la asociación especialista-estación deberá inferirse inicialmente por cita activa del día o configurarse explícitamente en esta misma fase.

## 6.2 Sidebar

Agregar un grupo operativo de cafetería:

- `Cafetería`
- debajo, estaciones de la sucursal activa

Comportamiento:

- al hacer click en una estación con QR activo, abrir una vista con el QR listo para mostrar;
- si no tiene QR activo, mostrar estado “No configurado”.

Ruta sugerida:

- `/t/[tenant]/cafeteria/estaciones/[workstationId]`

## 6.3 Ruta pública de escaneo

Ruta sugerida:

- `/cafeteria/qr/[tenantSlug]/[qrSlug]`

Comportamiento:

1. resuelve contexto;
2. valida que QR esté activo;
3. muestra branding básico, estación, especialista y sucursal;
4. intenta resolver si el cliente ya está autenticado o viene con una cita reconocible;
5. si no, solicita nombre + email;
6. permite pedir;
7. muestra tracking del pedido creado.

## 6.4 Flujo de identificación del cliente

Orden recomendado:

1. Si el usuario ya está autenticado y tiene `customer` en el tenant, usarlo.
2. Si no está autenticado:
   - pedir `nombre` y `email`;
   - buscar `customer` por `(tenant_id, email)`;
   - si existe, reutilizarlo;
   - si no existe, crearlo con los datos mínimos.
3. Guardar siempre `placed_by_name` y `placed_by_email` en `cafe_orders`.

## 6.5 Relación con especialista y estación

Al crear el pedido QR, guardar:

- `workstation_id`
- `specialist_id` si pudo resolverse
- `client_id`
- `source = 'workstation_qr'`

Regla recomendada:

- el QR identifica primero la estación;
- el especialista asociado se resuelve desde configuración explícita o fallback por cita activa.

## 6.6 Tracking del pedido

En la vista post-envío mostrar:

- número de pedido;
- estado actual;
- productos pedidos;
- total;
- tiempo estimado;
- estación y especialista;
- mensaje de retiro/entrega.

ETA sugerido:

- `sum(preparation_time_minutes * quantity)` con tope razonable y luego recalcular según estado en cocina.

## 7. APIs y servicios a crear o ajustar

## Nuevos endpoints sugeridos

- `GET /api/cafeteria/settings/workstations?tenant_id&branch_id`
- `PATCH /api/cafeteria/settings/workstations/[id]/qr`
- `GET /api/cafeteria/qr/[tenantSlug]/[qrSlug]/context`
- `POST /api/cafeteria/qr/[tenantSlug]/[qrSlug]/identify`
- `POST /api/cafeteria/qr/[tenantSlug]/[qrSlug]/orders`
- `GET /api/cafeteria/orders/[id]/tracking`

## Ajustes a endpoints existentes

- extender creación de `cafe_orders` para aceptar `workstation_id`, `source`, `placed_by_name`, `placed_by_email`, `estimated_ready_at`;
- exponer esos campos en hooks y tipos;
- permitir que la UI pública escuche realtime de su pedido puntual.

## 8. Reglas de negocio propuestas

## Regla 1

Un QR pertenece a una sola estación.

## Regla 2

Una estación puede tener QR activo o inactivo.

## Regla 3

Escanear el QR no obliga a login.

## Regla 4

El email será obligatorio cuando no haya identidad resuelta.

## Regla 5

Si el email ya existe en `customers`, se reutiliza ese registro.

## Regla 6

Si el email no existe, se crea un customer mínimo.

## Regla 7

El especialista del pedido se resuelve así, en este orden:

1. asignación explícita de la estación;
2. cita activa o próxima en esa estación;
3. `null` si no se puede determinar.

## Regla 8

Si no se puede resolver especialista, el pedido igual se crea, pero:

- no permite “cargar a comisiones”;
- queda como pedido normal de cafetería;
- se registra warning para auditoría.

## 9. Riesgos técnicos detectados

## Riesgo 1

Hoy `workstations` no tiene asignación directa a especialista. Si dependemos solo de citas activas, el QR podría apuntar al especialista equivocado o a ninguno.

Mitigación recomendada:

- agregar una configuración explícita por estación para “especialista actual” o “especialista por defecto”.

## Riesgo 2

Si el QR es completamente público, cualquiera con el enlace podría abrir el menú fuera del local.

Mitigación recomendada:

- no bloquear en esta fase;
- dejar trazabilidad por estación y limitar acciones sensibles;
- evaluar más adelante token rotatorio o expiración.

## Riesgo 3

Buscar cita exacta del cliente antes de pedir no es confiable si el cliente no está autenticado.

Mitigación recomendada:

- separar claramente “contexto de estación” de “identidad del cliente”;
- usar email/nombre como mecanismo principal de identificación cuando no haya sesión.

## Riesgo 4

El ETA puede ser engañoso si cocina está saturada.

Mitigación recomendada:

- en primera versión, mostrarlo como “estimado” y recalcular solo con reglas simples.

## 10. Plan de implementación por fases

## Fase A. SQL y tipos

- crear migración SQL para QR de estación;
- regenerar tipos;
- actualizar aliases manuales si hace falta.

## Fase B. Settings cafetería

- nueva página `settings/cafeteria`;
- listado de estaciones por sucursal;
- activar/desactivar QR;
- generar/visualizar/imprimir.

## Fase C. Sidebar y vista QR interna

- listado de estaciones en cafetería para la sucursal activa;
- pantalla para mostrar el QR al cliente.

## Fase D. Ruta QR pública

- resolver contexto;
- pantalla de acceso rápido;
- identificación mínima;
- envío de pedido.

## Fase E. Tracking

- pantalla de seguimiento;
- realtime por pedido;
- ETA y número visible.

## Fase F. Documentación y QA

- actualizar `tasks/fase-3/...`;
- documentar checklist de pruebas;
- validar flujo completo.

## 11. Decisiones que necesito que me confirmes

## Duda 1. Asignación especialista-estación

Opciones:

- A. inferir siempre por cita activa en esa estación;
- B. permitir configurar un especialista fijo por estación;
- C. combinar ambas.

Recomendación:

- C. configurar especialista por defecto en estación y usar cita activa como override contextual.

## Duda 2. Exposición del QR

Opciones:

- A. ruta pública sin login;
- B. ruta pública pero pidiendo email antes de mostrar menú;
- C. login obligatorio.

Recomendación:

- A. ruta pública sin login y pedir identificación recién antes de enviar el pedido.

## Duda 3. Datos mínimos para cliente walk-in

Opciones:

- A. solo email;
- B. nombre + email;
- C. nombre + email + teléfono.

Recomendación:

- B. nombre + email.

## Duda 4. Qué hacer si ya existe customer por email

Opciones:

- A. reutilizar automáticamente;
- B. pedir confirmación;
- C. crear otro registro temporal.

Recomendación:

- A. reutilizar automáticamente.

## Duda 5. Qué mostrar en tracking

Opciones:

- A. solo número y estado;
- B. número, estado y ETA;
- C. número, estado, ETA y detalle de ítems.

Recomendación:

- C. número, estado, ETA y detalle de ítems.

## Duda 6. Impresión

Opciones:

- A. imprimir solo QR;
- B. imprimir QR + nombre estación + especialista + instrucciones;
- C. imprimir formato póster completo.

Recomendación:

- B. QR + nombre estación + especialista + instrucciones cortas.

## Duda 7. Ubicación del nuevo settings

Opciones:

- A. una sola página `/settings/cafeteria`;
- B. índice `/settings/cafeteria` y subpáginas por estación;
- C. integrarlo dentro de `/workstations`.

Recomendación:

- A. una sola página primero. Es más rápida de entregar y consistente con el alcance.

## Duda 8. Asociación con cita

Cuando el cliente escanea un QR, ¿quieres que el sistema intente enlazar automáticamente a una cita activa si encuentra coincidencia por sesión/login o prefieres no mezclar pedido con agenda en esta primera versión?

Recomendación:

- no bloquear el pedido por agenda;
- usar la agenda solo como ayuda para inferir especialista/contexto.

## 12. Mi sugerencia final de implementación

La forma más sólida y con mejor costo/beneficio para esta fase es:

1. guardar QR por estación, no por especialista;
2. permitir estación con especialista por defecto configurable;
3. exponer una ruta pública de cafetería con branding y captura mínima de nombre/email;
4. crear o reutilizar `customer` automáticamente por email;
5. guardar `workstation_id`, `specialist_id`, `source`, `placed_by_name`, `placed_by_email` en `cafe_orders`;
6. mostrar tracking en tiempo real tras enviar el pedido;
7. implementar impresión simple HTML, sin PDF ni librerías extra de print.

## 13. Siguiente paso una vez aprobado este contrato

Si me confirmas las dudas clave, el siguiente bloque de trabajo será:

1. SQL nuevo para QR de estación.
2. Regeneración de tipos.
3. Settings de cafetería.
4. Vista QR interna.
5. Ruta pública QR.
6. Tracking.
7. Actualización del task markdown.

