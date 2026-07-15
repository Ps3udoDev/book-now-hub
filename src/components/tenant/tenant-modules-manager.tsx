"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAllModules } from "@/hooks/supabase/use-modules";
import { useTenantModuleStates } from "@/hooks/supabase/use-tenant";
import { getModuleIcon } from "@/lib/modules/module-icon";
import { tenantsService } from "@/lib/services/tenants";

interface TenantModulesManagerProps {
  tenantId: string;
}

/** Sección "Módulos" de la ficha de tenant: toggle por módulo (solo admin). */
export function TenantModulesManager({ tenantId }: TenantModulesManagerProps) {
  const { modules, isLoading: loadingModules } = useAllModules();
  const {
    states,
    isLoading: loadingStates,
    mutate,
  } = useTenantModuleStates(tenantId);

  const [savingId, setSavingId] = useState<string | null>(null);

  const isEnabled = (moduleId: string, isCore: boolean) =>
    isCore || states[moduleId] === true;

  const handleToggle = async (
    moduleId: string,
    isCore: boolean,
    next: boolean,
  ) => {
    if (isCore) return; // los core no se pueden apagar
    setSavingId(moduleId);
    // Guardado optimista
    mutate({ ...states, [moduleId]: next }, false);
    try {
      await tenantsService.setModuleEnabled(tenantId, moduleId, next);
      toast.success(next ? "Módulo activado" : "Módulo desactivado");
      mutate();
    } catch (e) {
      toast.error((e as Error).message);
      mutate(); // revertir al estado real
    } finally {
      setSavingId(null);
    }
  };

  const loading = loadingModules || loadingStates;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Módulos</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="divide-y">
            {modules.map((module) => {
              const Icon = getModuleIcon(module.icon);
              const core = module.is_core === true;
              const enabled = isEnabled(module.id, core);
              return (
                <div
                  key={module.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{module.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {core ? "Core · siempre activo" : module.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {savingId === module.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    <Switch
                      checked={enabled}
                      disabled={core || savingId === module.id}
                      onCheckedChange={(v) => handleToggle(module.id, core, v)}
                      aria-label={`Activar ${module.name}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
