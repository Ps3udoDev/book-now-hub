// src/app/(root)/login/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const { loginGlobal, hydrateGlobal, loading, error, isAuthenticated, clearError } =
    useAuthStore();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Verificar si ya está autenticado
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await hydrateGlobal();
      if (isAuth) {
        router.replace("/");
      }
    };
    checkAuth();
  }, [hydrateGlobal, router]);

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
      router.replace("/");
    } catch {
      toast.error("Error al iniciar sesión", {
        description: error || "Credenciales inválidas",
      });
    }
  };

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