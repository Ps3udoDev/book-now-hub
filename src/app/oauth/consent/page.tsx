"use client";

import {
  AlertCircle,
  Bot,
  Building2,
  CheckCircle2,
  Lock,
  Shield,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { createBrowserSB } from "@/lib/supabase/client";

interface TenantOption {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface ClientDetails {
  name?: string;
  id?: string;
  uri?: string;
}

const SCOPE_DESCRIPTIONS: Record<string, { title: string; desc: string }> = {
  "appointments:read": {
    title: "Lectura de agenda",
    desc: "Consultar horarios disponibles y citas programadas.",
  },
  "appointments:write": {
    title: "Gestión de citas",
    desc: "Crear borradores y confirmar reservas en dos pasos.",
  },
  "analytics:read": {
    title: "Métricas del negocio",
    desc: "Ver resúmenes agregados y ocupación sin datos sensibles.",
  },
  "customers:read": {
    title: "Búsqueda de clientes",
    desc: "Buscar clientes para agendar citas (teléfonos enmascarados).",
  },
};

function ConsentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authorizationId = searchParams.get("authorization_id");

  const [supabase] = useState(() => createBrowserSB());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(
    null,
  );
  const [scopes, setScopes] = useState<string[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (!authorizationId) {
        setErrorMessage(
          "Falta el identificador de autorización (authorization_id).",
        );
        setLoading(false);
        return;
      }

      // 1. Verificar sesión
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        const returnUrl = encodeURIComponent(
          `/oauth/consent?authorization_id=${authorizationId}`,
        );
        router.push(`/login?return_to=${returnUrl}`);
        return;
      }

      // 2. Obtener detalles de la autorización OAuth
      try {
        const authAny = supabase.auth as unknown as {
          oauth?: {
            getAuthorizationDetails: (id: string) => Promise<{
              data?: {
                client?: {
                  client_name?: string;
                  client_id?: string;
                  client_uri?: string;
                };
                scopes?: string[];
              };
              error?: Error | null;
            }>;
          };
        };

        if (authAny.oauth?.getAuthorizationDetails) {
          const { data: details, error: detailsErr } =
            await authAny.oauth.getAuthorizationDetails(authorizationId);

          if (detailsErr) {
            setErrorMessage(
              `Error al consultar detalles de autorización: ${detailsErr.message}`,
            );
            setLoading(false);
            return;
          }

          if (details) {
            setClientDetails({
              name: details.client?.client_name || "Cliente MCP",
              id: details.client?.client_id || "mcp-client",
              uri: details.client?.client_uri,
            });
            setScopes(details.scopes || []);
          }
        }
      } catch (err: unknown) {
        console.warn(
          "No se pudo cargar detalles OAuth vía getAuthorizationDetails:",
          err,
        );
        setClientDetails({ name: "Cliente MCP Externo", id: "mcp-client" });
      }

      // 3. Consultar tenants autorizables del usuario (owner, admin, manager)
      const { data: userTenants, error: tErr } = await supabase
        .from("tenant_users")
        .select("role, tenant:tenants(id, name, slug, status)")
        .eq("auth_user_id", user.id)
        .eq("is_active", true)
        .in("role", ["owner", "admin", "manager"]);

      if (tErr) {
        setErrorMessage(`Error cargando tus negocios: ${tErr.message}`);
        setLoading(false);
        return;
      }

      const validTenants: TenantOption[] = [];
      for (const row of userTenants || []) {
        const t = row.tenant as {
          id: string;
          name: string;
          slug: string;
          status: string;
        } | null;
        if (t && t.status === "active") {
          validTenants.push({
            id: t.id,
            name: t.name,
            slug: t.slug,
            role: String(row.role),
          });
        }
      }

      if (validTenants.length === 0) {
        setErrorMessage(
          "No eres administrador ni encargado de ningún negocio activo para conectar a este cliente MCP.",
        );
        setLoading(false);
        return;
      }

      setTenants(validTenants);
      setSelectedTenantId(validTenants[0].id);
      setLoading(false);
    }

    init();
  }, [authorizationId, router, supabase]);

  async function handleApprove() {
    if (!authorizationId || !selectedTenantId) return;

    setSubmitting(true);
    try {
      // 1. Guardar la conexión en la base de datos
      const res = await fetch("/api/oauth/consent/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: selectedTenantId,
          client_id: clientDetails?.id || "mcp-client",
          client_name: clientDetails?.name || "Cliente MCP",
          scopes,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Error al registrar la conexión.");
      }

      // 2. Aprobar en Supabase Auth
      const authAny = supabase.auth as unknown as {
        oauth?: {
          approveAuthorization: (id: string) => Promise<{
            data?: { redirect_url?: string };
            error?: Error | null;
          }>;
        };
      };

      if (!authAny.oauth?.approveAuthorization) {
        throw new Error(
          "El método approveAuthorization no está disponible en este cliente.",
        );
      }

      const { data, error } =
        await authAny.oauth.approveAuthorization(authorizationId);
      if (error) {
        throw new Error(`Error en aprobación OAuth: ${error.message}`);
      }

      if (data?.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        toast.success("Conexión autorizada correctamente.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
      setSubmitting(false);
    }
  }

  async function handleDeny() {
    if (!authorizationId) return;

    setSubmitting(true);
    try {
      const authAny = supabase.auth as unknown as {
        oauth?: {
          denyAuthorization: (id: string) => Promise<{
            data?: { redirect_url?: string };
            error?: Error | null;
          }>;
        };
      };

      if (authAny.oauth?.denyAuthorization) {
        const { data, error } =
          await authAny.oauth.denyAuthorization(authorizationId);
        if (!error && data?.redirect_url) {
          window.location.href = data.redirect_url;
          return;
        }
      }

      router.push("/");
    } catch (err: unknown) {
      console.error(err);
      router.push("/");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">
            Cargando detalles de autorización...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <div className="max-w-md w-full bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 text-destructive mb-4">
            <AlertCircle className="w-6 h-6" />
            <h2 className="font-semibold text-lg">No se puede continuar</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">{errorMessage}</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full py-2.5 px-4 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="max-w-lg w-full bg-card border rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Bot className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Autorizar conexión MCP
          </h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {clientDetails?.name || "Un agente o cliente externo"}
            </span>{" "}
            solicita conectarse a tu negocio en BookNow Hub.
          </p>
        </div>

        {/* Selector de Tenant */}
        <div className="space-y-2">
          <label
            htmlFor="tenant-select"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
          >
            <Building2 className="w-4 h-4" /> Selecciona el negocio
          </label>
          <select
            id="tenant-select"
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="w-full p-2.5 bg-background border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.role})
              </option>
            ))}
          </select>
        </div>

        {/* Permisos / Scopes */}
        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> Permisos solicitados
          </span>
          <div className="space-y-2 border rounded-xl p-3.5 bg-muted/20">
            {scopes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Acceso estándar de agenda y análisis del negocio.
              </p>
            ) : (
              scopes.map((scope) => {
                const info = SCOPE_DESCRIPTIONS[scope] || {
                  title: scope,
                  desc: "Operación autorizada sobre el negocio.",
                };
                return (
                  <div key={scope} className="flex items-start gap-2.5 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">
                        {info.title}
                      </p>
                      <p className="text-muted-foreground">{info.desc}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Aviso de privacidad */}
        <div className="flex items-start gap-2.5 p-3.5 bg-secondary/50 rounded-xl text-xs text-muted-foreground border">
          <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p>
            <strong>Privacidad protegida:</strong> Los teléfonos de tus clientes
            siempre se comparten enmascarados, tus datos financieros sensibles
            están resguardados y cualquier cita requiere aprobación explícita.
          </p>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={handleDeny}
            className="flex-1 py-2.5 px-4 border rounded-xl text-sm font-medium hover:bg-muted transition disabled:opacity-50"
          >
            Denegar
          </button>
          <button
            type="button"
            disabled={submitting || !selectedTenantId}
            onClick={handleApprove}
            className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
          >
            {submitting ? "Conectando..." : "Autorizar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ConsentForm />
    </Suspense>
  );
}
