// src/app/(root)/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, LogOut, AlertCircle } from "lucide-react";

import { useAuthStore } from "@/lib/stores/auth-store";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { ThemeToggle } from "@/components/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const {
    loginGlobal,
    hydrateGlobal,
    logout,
    loading,
    error,
    isAuthenticated,
    mode,
    user,
    clearError
  } = useAuthStore();

  const [isChecking, setIsChecking] = useState(true);
  const [hasSessionMismatch, setHasSessionMismatch] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Verificar si ya está autenticado como global admin
  useEffect(() => {
    const checkAuth = async () => {
      setIsChecking(true);
      const isGlobalAdmin = await hydrateGlobal();

      if (isGlobalAdmin) {
        // Es admin global, redirigir al panel
        router.replace("/tenants");
      } else if (isAuthenticated && mode === "tenant") {
        // Tiene sesión pero es de un tenant, mostrar mensaje
        setHasSessionMismatch(true);
      }
      setIsChecking(false);
    };
    checkAuth();
  }, [hydrateGlobal, router, isAuthenticated, mode]);

  // Limpiar error cuando el usuario escribe
  useEffect(() => {
    const subscription = form.watch(() => {
      if (error) clearError();
    });
    return () => subscription.unsubscribe();
  }, [form, error, clearError]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginGlobal(data.email, data.password);
      toast.success("Bienvenido", {
        description: "Has iniciado sesión correctamente",
      });
      router.replace("/tenants");
    } catch {
      toast.error("Error al iniciar sesión", {
        description: error || "Credenciales inválidas",
      });
    }
  };

  const handleLogoutAndRetry = async () => {
    await logout();
    setHasSessionMismatch(false);
    form.reset();
  };

  // Loading mientras verifica
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Theme Toggle en esquina superior derecha */}
      <div className="fixed top-4 right-4">
        <ThemeToggle variant="dropdown" />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">BN</span>
            </div>
            <span className="font-bold text-xl">Book Now Hub</span>
          </Link>
          <p className="text-muted-foreground mt-2">
            Panel de administración
          </p>
        </div>

        {/* Aviso de sesión activa de otro contexto */}
        {hasSessionMismatch && (
          <div className="mb-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Sesión activa de tenant
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Estás logueado como <strong className="truncate">{user?.email}</strong>
                  {" "}en una cuenta de empresa. Para acceder al panel de administración,
                  necesitas cerrar esa sesión primero.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogoutAndRetry}
                  className="mt-3 text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión e ingresar con otra cuenta
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Card */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Iniciar sesión</CardTitle>
            <CardDescription className="text-center">
              Ingresa tus credenciales de administrador
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Error global */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@tudominio.com"
                  autoComplete="email"
                  disabled={loading}
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              <Link
                href="/forgot-password"
                className="hover:text-primary transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Book Now Hub © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}