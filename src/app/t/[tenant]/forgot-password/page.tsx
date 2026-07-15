// src/app/t/[tenant]/forgot-password/page.tsx
"use client";

import { Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/services/auth";

export default function TenantForgotPasswordPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/t/${tenantSlug}/reset-password`;
      await authService.requestPasswordReset(email, redirectTo);
      setSent(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo enviar el correo",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md p-8">
        <div className="bg-card rounded-lg border shadow-sm p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
            <p className="text-muted-foreground mt-1">
              Te enviaremos un enlace para restablecerla.
            </p>
          </div>

          {sent ? (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              Si la cuenta existe, recibirás un correo en breve.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar enlace
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <Link
              href={`/t/${tenantSlug}/login`}
              className="text-muted-foreground hover:text-foreground"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
