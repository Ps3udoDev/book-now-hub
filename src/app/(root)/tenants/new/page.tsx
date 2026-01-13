// src/app/(root)/tenants/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tenantsService } from "@/lib/services/tenants";
import { useActiveModules } from "@/hooks/supabase/use-modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Check, Loader2 } from "lucide-react";

export default function NewTenantPage() {
  const router = useRouter();
  const { modules, isLoading: modulesLoading } = useActiveModules();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    legal_name: "",
    country_code: "VE",
    timezone: "America/Caracas",
    currency_code: "USD",
    subscription_plan: "starter",
    max_users: 5,
  });

  // Pre-seleccionar módulos core cuando se carguen
  useEffect(() => {
    if (modules.length > 0) {
      const coreIds = modules.filter((m) => m.is_core).map((m) => m.id);
      setSelectedModules(coreIds);
    }
  }, [modules]);

  // Auto-generar slug del nombre
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    setFormData((prev) => ({ ...prev, name, slug }));
  };

  const toggleModule = (moduleId: string) => {
    const module = modules.find((m) => m.id === moduleId);
    // No permitir deseleccionar módulos core
    if (module?.is_core) return;

    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Crear el tenant usando el servicio
      const tenant = await tenantsService.createTenant({
        name: formData.name,
        slug: formData.slug,
        legal_name: formData.legal_name || null,
        country_code: formData.country_code,
        timezone: formData.timezone,
        currency_code: formData.currency_code,
        subscription_plan: formData.subscription_plan,
        max_users: formData.max_users,
        status: "active",
      });

      // 2. Asignar módulos seleccionados usando el servicio
      if (selectedModules.length > 0) {
        try {
          await tenantsService.assignModulesToTenant(tenant.id, selectedModules);
        } catch (moduleErr) {
          console.error("Error asignando módulos:", moduleErr);
          // No fallar por esto, el tenant ya está creado
        }
      }

      setSuccess(true);

      // Redirigir después de 2 segundos
      setTimeout(() => {
        router.push("/tenants");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el tenant");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">¡Tenant creado exitosamente!</h2>
              <p className="text-muted-foreground mb-4">
                <strong>{formData.name}</strong> está listo para usar.
              </p>
              <div className="p-3 bg-muted rounded-lg inline-block">
                <p className="text-sm">URL de acceso:</p>
                <code className="text-primary font-mono">
                  /t/{formData.slug}/login
                </code>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Redirigiendo al listado...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tenants">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Tenant</h1>
          <p className="text-muted-foreground">
            Crear una nueva empresa en la plataforma
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información Básica
            </CardTitle>
            <CardDescription>
              Datos principales de la empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la empresa *</Label>
                <Input
                  id="name"
                  placeholder="Elvis Studio"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL) *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/t/</span>
                  <Input
                    id="slug"
                    placeholder="elvis-studio"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      }))
                    }
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="legal_name">Razón Social</Label>
              <Input
                id="legal_name"
                placeholder="Elvis Studio C.A."
                value={formData.legal_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, legal_name: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>País</Label>
                <Select
                  value={formData.country_code}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, country_code: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VE">Venezuela</SelectItem>
                    <SelectItem value="CO">Colombia</SelectItem>
                    <SelectItem value="EC">Ecuador</SelectItem>
                    <SelectItem value="MX">México</SelectItem>
                    <SelectItem value="US">Estados Unidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Zona Horaria</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, timezone: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Caracas">Caracas (VET)</SelectItem>
                    <SelectItem value="America/Bogota">Bogotá (COT)</SelectItem>
                    <SelectItem value="America/Guayaquil">Guayaquil (ECT)</SelectItem>
                    <SelectItem value="America/Mexico_City">CDMX (CST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select
                  value={formData.currency_code}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, currency_code: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - Dólar</SelectItem>
                    <SelectItem value="VES">VES - Bolívar</SelectItem>
                    <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                    <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Plan de Suscripción</Label>
                <Select
                  value={formData.subscription_plan}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, subscription_plan: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter (5 usuarios)</SelectItem>
                    <SelectItem value="pro">Pro (15 usuarios)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (ilimitado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_users">Máximo de usuarios</Label>
                <Input
                  id="max_users"
                  type="number"
                  min={1}
                  max={100}
                  value={formData.max_users}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      max_users: parseInt(e.target.value) || 5,
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Módulos */}
        <Card>
          <CardHeader>
            <CardTitle>Módulos</CardTitle>
            <CardDescription>
              Selecciona los módulos que estarán disponibles para este tenant.
              Los módulos core son obligatorios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {modulesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {modules.map((module) => {
                  const isSelected = selectedModules.includes(module.id);
                  const isCore = module.is_core;

                  return (
                    <div
                      key={module.id}
                      className={`
                        flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                        ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"}
                        ${isCore ? "cursor-not-allowed opacity-80" : ""}
                      `}
                      onClick={() => toggleModule(module.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isCore ?? false}
                        className="mt-0.5"

                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{module.name}</span>
                          {isCore && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              Core
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {module.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-sm text-muted-foreground mt-4">
              {selectedModules.length} módulo(s) seleccionado(s)
            </p>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/tenants">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear Tenant"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}