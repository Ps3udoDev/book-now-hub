// src/lib/modules/route-map.ts
// Mapea el primer segmento de la ruta del tenant (/t/[tenant]/<segmento>) al
// slug del módulo que lo habilita. Sólo se listan módulos NO core (gateables);
// las rutas sin mapeo y las de módulos core siempre pasan.

export const ROUTE_MODULE_MAP: Record<string, string> = {
  "ai-assistant": "ai-assistant",
  cafeteria: "cafeteria",
  campaigns: "campaigns",
  ecommerce: "ecommerce",
};

/**
 * Rutas que nunca se gatean (siempre disponibles), independientemente de los
 * módulos activos del tenant.
 */
export const UNGATED_SEGMENTS = new Set([
  "dashboard",
  "settings",
  "my-commissions",
  "my-products",
  "perfil",
  "login",
  "register",
  "forgot-password",
  "reset-password",
]);

/**
 * Devuelve el slug de módulo requerido por un segmento, o null si la ruta no
 * está gateada.
 */
export function requiredModuleForSegment(segment: string): string | null {
  if (UNGATED_SEGMENTS.has(segment)) return null;
  return ROUTE_MODULE_MAP[segment] ?? null;
}
