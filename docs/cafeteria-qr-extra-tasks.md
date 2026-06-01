# Tareas Extra: Cafeteria QR por Estaciones

Fecha: 2026-04-24
Estado: implementado en codigo local

## Decisiones cerradas

- El QR es por workstation, no por especialista fijo.
- La ruta del QR es publica.
- Si el cliente no esta autenticado, se pide `nombre + email`.
- Si el email ya existe en `customers`, se reutiliza el registro.
- Si no existe, se crea un customer minimo.
- El tracking muestra numero de pedido, estado, ETA y detalle de items.
- La impresion en esta version es solo el QR.
- La configuracion vive en `/t/[tenant]/settings/cafeteria`.
- La agenda no bloquea el pedido; solo ayuda a inferir `specialist_id`.
- Si no se puede inferir especialista, el pedido se crea con `specialist_id = null`.

## Estado por tarea

1. [x] Ejecutar el SQL base de QR por estaciones.
   Archivo: `database/fase3-tarea2.11-cafeteria-qr-estaciones.sql`

2. [x] Regenerar tipos de Supabase.
   Comando: `npm run db:types`

3. [x] Ajustar tipos manuales y aliases locales para los nuevos campos.

4. [x] Crear la pagina `/t/[tenant]/settings/cafeteria`.
   Lista workstations por sucursal y permite activar/desactivar QR, guardar slug, ver QR e imprimirlo.

5. [x] Crear hooks y servicios para configuracion QR de cafeteria.

6. [x] Extender sidebar de cafeteria para mostrar workstations con QR activo.

7. [x] Crear vista interna del QR por workstation.
   Ruta: `/t/[tenant]/cafeteria/estaciones/[workstationId]`

8. [x] Crear endpoint/contexto publico para el QR.
   Resuelve `tenant`, `branch`, `workstation` y el `specialist_id` inferido por cita del dia si existe.

9. [x] Crear flujo publico `/cafeteria/qr/[tenantSlug]/[qrSlug]`.
   Muestra menu, captura nombre/email y permite crear pedidos.

10. [x] Extender creacion de `cafe_orders` para origen `workstation_qr`.
    Guarda `workstation_id`, `source`, `placed_by_name`, `placed_by_email`, `estimated_ready_at` y `specialist_id` si pudo inferirse.

11. [x] Crear tracking publico del pedido.
    Muestra numero, estado, ETA e items por polling.

12. [x] Integrar impresion simple del QR.
    En esta version solo QR.

13. [x] Actualizar documentacion funcional y el task markdown de fase 3.

## Verificacion

- `bun run build` completado correctamente despues de integrar rutas, APIs, hooks y paginas nuevas.

## Nota actual

- El tracking publico se resolvio por polling via API (`/api/cafeteria/orders/[id]/tracking`) y no por realtime anonimo directo, porque las politicas actuales de `cafe_orders` no exponen lectura anonima.
