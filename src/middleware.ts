// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Landing pública
const PUBLIC_ROUTES = ["/"];

// Rutas auth de Supabase (callback OAuth, email confirm, password reset)
const AUTH_PUBLIC_PREFIXES = ["/auth/callback", "/auth/confirm"];

// Endpoints publicos usados por la app del cliente antes de tener sesion
const PUBLIC_API_PREFIXES = [
  "/api/client/tenant-status",
  "/api/client/auth/register",
  // QA temporal de las alertas Sentry -> Google Chat. Protegido por ALERT_TEST_KEY.
  "/api/sentry-alert-test",
  // Webhook entrante de Sentry: no se autentica con sesion, valida ?token=.
  "/api/sentry-chat",
];

// Ruta tunel del SDK de Sentry (next.config.ts -> tunnelRoute). Debe quedar
// fuera del middleware: si la protegemos, los errores de cliente en paginas
// sin sesion (landing, /login, registro) se redirigen a /login y se pierden.
const SENTRY_TUNNEL_PREFIX = "/monitoring";

// Rutas de ADMIN (root console) - sin /t/
const ADMIN_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/tenants",
  "/modules",
  "/templates",
  "/themes",
  "/users",
  "/settings",
];

// Slugs reservados que no pueden ser usados como tenant
const RESERVED_SLUGS = [
  "admin",
  "api",
  "auth",
  "c",
  "login",
  "register",
  "t",
  "tenants",
  "modules",
  "settings",
  "public",
  "static",
  "_next",
];

function isAdminRoute(pathname: string): boolean {
  if (pathname === "/") return false;
  return ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isTenantRoute(pathname: string): boolean {
  return pathname.startsWith("/t/");
}

function isClientRoute(pathname: string): boolean {
  return pathname.startsWith("/c/");
}

function extractTenantSlug(pathname: string): string | null {
  const match = pathname.match(/^\/t\/([^/]+)/);
  return match ? match[1] : null;
}

function extractClientTenantSlug(pathname: string): string | null {
  const match = pathname.match(/^\/c\/([^/]+)/);
  return match ? match[1] : null;
}

function getTenantSubPath(pathname: string): string {
  const match = pathname.match(/^\/t\/[^/]+(\/.*)?$/);
  return match?.[1] || "/";
}

function getClientSubPath(pathname: string): string {
  const match = pathname.match(/^\/c\/[^/]+(\/.*)?$/);
  return match?.[1] || "/";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Tunel de Sentry - nunca autenticar ni redirigir
  if (pathname.startsWith(SENTRY_TUNNEL_PREFIX)) {
    return NextResponse.next();
  }

  // 1. Rutas públicas - pasar directo
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Auth callbacks de Supabase no requieren sesion previa
  if (AUTH_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Crear cliente de Supabase
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ============================================
  // 2. RUTAS DE TENANT (/t/[tenant]/...)
  // ============================================
  if (isTenantRoute(pathname)) {
    const tenantSlug = extractTenantSlug(pathname);
    const subPath = getTenantSubPath(pathname);

    if (!tenantSlug) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Verificar que no sea un slug reservado
    if (RESERVED_SLUGS.includes(tenantSlug.toLowerCase())) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Rutas públicas del tenant (login, register)
    const tenantPublicPaths = [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/products",
    ];
    const isPublicTenantPath = tenantPublicPaths.some(
      (publicPath) =>
        subPath === publicPath || subPath.startsWith(`${publicPath}/`),
    );

    if (isPublicTenantPath) {
      // IMPORTANTE: NO redirigir aunque haya sesión
      // El login page verificará si el usuario pertenece al tenant
      // y mostrará el formulario o redirigirá según corresponda
      response.headers.set("x-tenant-slug", tenantSlug);
      return response;
    }

    // Rutas privadas del tenant - requieren auth
    if (!user) {
      return NextResponse.redirect(
        new URL(`/t/${tenantSlug}/login`, request.url),
      );
    }

    // Usuario autenticado - pasar el slug en headers
    // La verificación de pertenencia al tenant se hace en el layout
    response.headers.set("x-tenant-slug", tenantSlug);
    return response;
  }

  // ============================================
  // 2.5 RUTAS DE CLIENTE FINAL (/c/[tenant]/...)
  // ============================================
  if (isClientRoute(pathname)) {
    const tenantSlug = extractClientTenantSlug(pathname);
    const subPath = getClientSubPath(pathname);

    if (!tenantSlug) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (RESERVED_SLUGS.includes(tenantSlug.toLowerCase())) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Rutas publicas del cliente final
    const clientPublicPaths = [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
    ];
    const isPublicClientPath = clientPublicPaths.some(
      (publicPath) =>
        subPath === publicPath || subPath.startsWith(`${publicPath}/`),
    );

    if (isPublicClientPath) {
      response.headers.set("x-tenant-slug", tenantSlug);
      response.headers.set("x-client-app", "1");
      return response;
    }

    // Rutas privadas del cliente final - requieren auth
    if (!user) {
      return NextResponse.redirect(
        new URL(`/c/${tenantSlug}/login`, request.url),
      );
    }

    response.headers.set("x-tenant-slug", tenantSlug);
    response.headers.set("x-client-app", "1");
    return response;
  }

  // ============================================
  // 3. RUTAS DE ADMIN (/tenants, /modules, etc.)
  // ============================================
  if (isAdminRoute(pathname)) {
    const adminAuthPaths = [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
    ];
    const isAdminAuthPath = adminAuthPaths.includes(pathname);

    if (isAdminAuthPath) {
      // No redirigir automáticamente aunque haya sesión
      // La página de login verificará si el usuario es admin global
      // y mostrará opciones apropiadas (logout) si no lo es
      return response;
    }

    // Otras rutas admin requieren auth
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return response;
  }

  // ============================================
  // 4. OTRAS RUTAS - Por defecto requieren auth
  // ============================================
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
