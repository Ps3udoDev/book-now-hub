// src/app/(root)/modules/page.tsx
// Admin de módulos: lee la lista real desde la BD (tabla modules),
// agrupada por categoría y ordenada por sort_order.
import { getModuleIcon } from "@/lib/modules/module-icon";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Module } from "@/types";
import { TenantModuleManager } from "./tenant-module-manager";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  core: "Módulos Core",
  addon: "Módulos Addon",
  sales: "Ventas",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  core: "Incluidos en todos los planes; se activan automáticamente.",
  addon: "Opcionales; se activan por tenant según sus necesidades.",
  sales: "Módulos orientados a ventas y comercio.",
};

const CATEGORY_ORDER = ["core", "addon", "sales"];

export default async function ModulesPage() {
  const { data } = await supabaseAdmin
    .from("modules")
    .select("*")
    .order("sort_order");

  const modules = (data ?? []) as Module[];

  // Agrupar por categoría
  const grouped = new Map<string, Module[]>();
  for (const m of modules) {
    const cat = m.category ?? "addon";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)?.push(m);
  }

  const categories = [
    ...CATEGORY_ORDER.filter((c) => grouped.has(c)),
    ...[...grouped.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Módulos</h1>
        <p className="text-muted-foreground">
          Gestiona los módulos disponibles en la plataforma ({modules.length} en
          total).
        </p>
      </div>

      <TenantModuleManager modules={modules} />

      {categories.map((cat) => (
        <div key={cat}>
          <h2 className="mb-1 text-lg font-semibold">
            {CATEGORY_LABELS[cat] ?? cat}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {CATEGORY_DESCRIPTIONS[cat] ?? ""}
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {grouped.get(cat)?.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ModuleCard({ module }: { module: Module }) {
  const Icon = getModuleIcon(module.icon);
  return (
    <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{module.name}</p>
            <p className="text-sm text-muted-foreground">{module.slug}</p>
          </div>
        </div>
        <StatusBadge status={module.status ?? "coming_soon"} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        {module.is_core && (
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
            Core
          </span>
        )}
        <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
          {module.category}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:
      "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
    beta: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    deprecated:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300",
    coming_soon: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    active: "Activo",
    beta: "Beta",
    deprecated: "Obsoleto",
    coming_soon: "Próximamente",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs ${styles[status] || styles.coming_soon}`}
    >
      {labels[status] || status}
    </span>
  );
}
