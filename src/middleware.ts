// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Landing pública
const PUBLIC_ROUTES = ["/"];

// Rutas de ADMIN (root console) - sin /t/
const ADMIN_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
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
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isTenantRoute(pathname: string): boolean {
  return pathname.startsWith("/t/");
}

function extractTenantSlug(pathname: string): string | null {
  const match = pathname.match(/^\/t\/([^/]+)/);
  return match ? match[1] : null;
}

function getTenantSubPath(pathname: string): string {
  const match = pathname.match(/^\/t\/[^/]+(\/.*)?$/);
  return match?.[1] || "/";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rutas públicas - pasar directo
  if (PUBLIC_ROUTES.includes(pathname)) {
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
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
    const tenantPublicPaths = ["/login", "/register", "/forgot-password"];
    const isPublicTenantPath = tenantPublicPaths.includes(subPath);

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
        new URL(`/t/${tenantSlug}/login`, request.url)
      );
    }

    // Usuario autenticado - pasar el slug en headers
    // La verificación de pertenencia al tenant se hace en el layout
    response.headers.set("x-tenant-slug", tenantSlug);
    return response;
  }

  // ============================================
  // 3. RUTAS DE ADMIN (/tenants, /modules, etc.)
  // ============================================
  if (isAdminRoute(pathname)) {
    const adminAuthPaths = ["/login", "/register", "/forgot-password"];
    const isAdminAuthPath = adminAuthPaths.includes(pathname);

    if (isAdminAuthPath) {
      if (user) {
        return NextResponse.redirect(new URL("/tenants", request.url));
      }
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