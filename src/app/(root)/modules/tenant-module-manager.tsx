"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { tenantsService } from "@/lib/services/tenants";
import { createBrowserSB } from "@/lib/supabase/client";
import type { Module } from "@/types";

interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  modules: Module[];
}

export function TenantModuleManager({ modules }: Props) {
  const supabase = createBrowserSB();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantId, setTenantId] = useState<string>("");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Cargar tenants una vez.
  useEffect(() => {
    supabase
      .from("tenants")
      .select("id, name, slug")
      .order("name")
      .then(({ data }) => setTenants((data as TenantOption[]) ?? []));
  }, [supabase]);

  // Cargar estado de módulos del tenant seleccionado.
  useEffect(() => {
    if (!tenantId) {
      setEnabled({});
      return;
    }
    let ignore = false;
    supabase
      .from("tenant_modules")
      .select("module_id, is_enabled")
      .eq("tenant_id", tenantId)
      .then(({ data }) => {
        if (ignore) return;
        const map: Record<string, boolean> = {};
        for (const row of data ?? []) {
          map[(row as { module_id: string }).module_id] =
            (row as { is_enabled: boolean | null }).is_enabled ?? false;
        }
        setEnabled(map);
      });
    return () => {
      ignore = true;
    };
  }, [tenantId, supabase]);

  async function toggle(moduleId: string, next: boolean) {
    setSaving(moduleId);
    setEnabled((prev) => ({ ...prev, [moduleId]: next }));
    try {
      await tenantsService.setModuleEnabled(tenantId, moduleId, next);
      toast.success(next ? "Módulo activado" : "Módulo desactivado");
    } catch (e) {
      setEnabled((prev) => ({ ...prev, [moduleId]: !next })); // revertir
      toast.error((e as Error).message || "No se pudo actualizar");
    } finally {
      setSaving(null);
    }
  }

  const addons = modules.filter((m) => !m.is_core);

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-1 text-lg font-semibold">Activación por tenant</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Elige un tenant y activa o desactiva sus módulos addon.
      </p>

      <select
        className="mb-4 w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm"
        value={tenantId}
        onChange={(e) => setTenantId(e.target.value)}
      >
        <option value="">Selecciona un tenant…</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.slug})
          </option>
        ))}
      </select>

      {tenantId && (
        <ul className="divide-y">
          {addons.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-sm text-muted-foreground">{m.slug}</p>
              </div>
              <Switch
                checked={enabled[m.id] ?? false}
                disabled={saving === m.id}
                onCheckedChange={(v) => toggle(m.id, v)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
