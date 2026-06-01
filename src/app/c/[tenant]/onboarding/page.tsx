// src/app/c/[tenant]/onboarding/page.tsx
// Pantalla de onboarding post-registro: completa nombre, telefono y preferencias.
"use client";

import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useClientProfile } from "@/hooks/supabase/use-client-profile";
import { clientAuthService } from "@/lib/services/client-auth";

export default function ClientOnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const { customer, isLoading } = useClientProfile(tenantSlug);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<string>("es");
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setFirstName(customer.first_name || "");
      setLastName(customer.last_name || "");
      setPhone(customer.phone || "");
      setLanguage(customer.preferred_language || "es");
      setMarketingConsent(customer.accepts_marketing ?? true);
    }
  }, [customer]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await clientAuthService.completeOnboarding({
        tenant_slug: tenantSlug,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        phone: phone || null,
        preferred_language: language,
        marketing_consent: marketingConsent,
      });
      toast.success("¡Listo! Tu perfil está configurado");
      router.replace(`/c/${tenantSlug}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar",
      );
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Cuéntanos sobre ti</CardTitle>
          <CardDescription>
            Necesitamos algunos datos para personalizar tu experiencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  required
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  id="lastName"
                  required
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Idioma preferido</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Recibir promociones</p>
                <p className="text-xs text-muted-foreground">
                  Ofertas y novedades por email
                </p>
              </div>
              <Switch
                checked={marketingConsent}
                onCheckedChange={setMarketingConsent}
                disabled={saving}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Continuar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
