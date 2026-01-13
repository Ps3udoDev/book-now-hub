// src/app/t/[tenant]/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useTenantBySlug } from "@/hooks/supabase/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogOut, AlertCircle } from "lucide-react";

export default function TenantLoginPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  // Cargar datos del tenant
  const { tenant, isLoading: tenantLoading, error: tenantError } = useTenantBySlug(tenantSlug);

  // Auth store
  const {
    loginTenant,
    hydrateTenant,
    logout,
    loading: authLoading,
    error: authError,
    clearError,
    isAuthenticated,
    isTenantUser,
    tenant: currentTenant,
    user,
    mode,
  } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccessToTenant, setHasAccessToTenant] = useState(false);

  // Verificar si el usuario actual tiene acceso a este tenant
  useEffect(() => {
    const checkAccess = async () => {
      if (!tenantSlug) return;

      setCheckingAccess(true);

      // Intentar hidratar el contexto del tenant
      const hasAccess = await hydrateTenant(tenantSlug);

      setHasAccessToTenant(hasAccess);
      setCheckingAccess(false);

      // Si tiene acceso, redirigir al dashboard
      if (hasAccess) {
        router.replace(`/t/${tenantSlug}/dashboard`);
      }
    };

    checkAccess();
  }, [tenantSlug, hydrateTenant, router]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginTenant(email, password, tenantSlug);
      router.push(`/t/${tenantSlug}/dashboard`);
    } catch {
      // Error manejado por el store
    }
  };

  const handleLogoutAndStay = async () => {
    await logout();
    // Limpiar formulario
    setEmail("");
    setPassword("");
    setHasAccessToTenant(false);
  };

  // Loading inicial
  if (tenantLoading || checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Tenant no encontrado
  if (tenantError || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="w-full max-w-md p-8">
          <div className="bg-card rounded-lg border shadow-sm p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Empresa no encontrada</h1>
            <p className="text-muted-foreground mb-6">
              No existe una empresa con el identificador "{tenantSlug}".
            </p>
            <Link href="/">
              <Button variant="outline">Volver al inicio</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Usuario tiene sesión pero NO pertenece a este tenant
  const hasSessionButNoAccess = isAuthenticated && !hasAccessToTenant && !checkingAccess;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md p-8">
        <div className="bg-card rounded-lg border shadow-sm p-8">
          {/* Logo / Branding del Tenant */}
          <div className="text-center mb-8">
            {tenant.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="h-12 mx-auto mb-4"
              />
            ) : (
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {tenant.name?.charAt(0) || "T"}
                </span>
              </div>
            )}
            <h1 className="text-2xl font-bold">{tenant.name}</h1>
            <p className="text-muted-foreground mt-1">
              Inicia sesión para continuar
            </p>
          </div>

          {/* Aviso si hay sesión activa de otro contexto */}
          {hasSessionButNoAccess && (
            <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Sesión activa detectada
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Estás logueado como <strong className="truncate">{user?.email}</strong>
                    {mode === "global" && " (Administrador de la plataforma)"}
                    , pero esta cuenta no tiene acceso a {tenant.name}.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogoutAndStay}
                    className="mt-3 text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar sesión e ingresar con otra cuenta
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={authLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={authLoading}
              />
            </div>

            {authError && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {authError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={authLoading}>
              {authLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </form>

          {/* Links adicionales */}
          <div className="mt-6 text-center text-sm">
            <Link
              href={`/t/${tenantSlug}/forgot-password`}
              className="text-muted-foreground hover:text-foreground"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by{" "}
          <Link href="/" className="hover:underline">
            Book Now Hub
          </Link>
        </p>
      </div>
    </div>
  );
}