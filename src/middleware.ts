import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Landing pública
const PUBLIC_ROUTES = ["/"];

// Rutas de ADMIN (root console) (no tenant)
const ADMIN_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/modules",
  "/tenants",
  "/users",
  "/settings",
];

function isAdminPath(pathname: string) {
  return ADMIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) públicas
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // 2) si es admin route, no la trates como tenant
  const adminRoute = isAdminPath(pathname);

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

  // ---------- ADMIN ----------
  if (adminRoute) {
    // login admin permitido sin sesión
    if (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password") {
      // si ya está logeado, mándalo al home admin (ajusta a tu página real)
      if (user) return NextResponse.redirect(new URL("/tenants", request.url));
      return response;
    }

    // el resto de admin requiere auth
    if (!user) return NextResponse.redirect(new URL("/login", request.url));

    return response;
  }

  // ---------- TENANT ----------
  // Interpretamos el primer segmento como tenantSlug: /{tenant}/...
  const segments = pathname.split("/").filter(Boolean);
  const tenantSlug = segments[0]; // primer segmento
  const tenantPath = `/${segments.slice(1).join("/")}` || "/";

  // Si por alguna razón no hay segmento (ej "/") ya se manejó arriba
  if (!tenantSlug) return response;

  // (opcional pero recomendado) proteger palabras reservadas para que no sean tenant
  // si algún slug coincide con admin prefix, lo tratamos como admin (evita colisiones raras)
  if (isAdminPath(`/${tenantSlug}`)) {
    // ej tenantSlug = "login" -> lo tratamos como admin
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    return response;
  }

  // Rutas públicas del tenant
  if (tenantPath === "/login" || tenantPath === "/register") {
    if (user) {
      return NextResponse.redirect(new URL(`/${tenantSlug}/dashboard`, request.url));
    }
    response.headers.set("x-tenant-slug", tenantSlug);
    return response;
  }

  // Rutas privadas del tenant
  if (!user) {
    return NextResponse.redirect(new URL(`/${tenantSlug}/login`, request.url));
  }

  response.headers.set("x-tenant-slug", tenantSlug);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
