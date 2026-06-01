// src/app/c/[tenant]/login/page.tsx
"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePublicClientAppSettings } from "@/hooks/supabase/use-client-app-settings";
import { clientAuthService } from "@/lib/services/client-auth";

export default function ClientLoginPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { settings } = usePublicClientAppSettings(tenantSlug);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await clientAuthService.signInWithPassword(email, password);
      router.replace(`/c/${tenantSlug}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo iniciar sesión",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!settings?.google_login_enabled) {
      toast.info("Google estará disponible próximamente");
      return;
    }
    setGoogleLoading(true);
    try {
      await clientAuthService.signInWithGoogle(tenantSlug, `/c/${tenantSlug}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión con Google",
      );
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--client-bg)] px-4 py-10 text-[var(--client-fg)]">
      <Card className="w-full max-w-md border-[var(--client-border)] bg-[var(--client-surface)] shadow-[var(--client-shadow)]">
        <CardHeader className="text-center">
          <CardTitle
            className="text-2xl"
            style={{ fontFamily: "var(--client-font-display)" }}
          >
            {settings?.brand_name || "Bienvenido"}
          </CardTitle>
          <CardDescription>Inicia sesión para agendar tu cita</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  href={`/c/${tenantSlug}/forgot-password`}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Iniciando sesión…
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </form>

          {(settings?.show_google_login_preview ?? true) ? (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">o</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogle}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Conectando con Google…
                  </>
                ) : (
                  `Continuar con Google${settings?.google_login_enabled ? "" : " (pronto)"}`
                )}
              </Button>
            </>
          ) : null}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link
              href={`/c/${tenantSlug}/register`}
              className="font-medium text-primary hover:underline"
            >
              Regístrate
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
