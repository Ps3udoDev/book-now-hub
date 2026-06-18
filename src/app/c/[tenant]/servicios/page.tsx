// src/app/c/[tenant]/servicios/page.tsx
// Catalogo de servicios fiel al prototipo: busqueda, chips de categoria y
// grid 2 col (beauty/wellness) o filas (dental/barber/studio).
"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { ServiceCard } from "@/components/client/service-card";
import {
  ClientChip,
  ClientField,
  clientInputClass,
  ScreenHeader,
  useClientTheme,
} from "@/components/client/themed";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientServices } from "@/hooks/supabase/use-client-services";
import { useClientTenant } from "@/providers/client-tenant-provider";

const CATEGORY_LABELS: Record<string, string> = {
  hair: "Cabello",
  nails: "Uñas",
  skin: "Piel",
  makeup: "Maquillaje",
  spa: "Spa",
  barber: "Barbería",
  other: "Otros",
};

export default function ClientServicesPage() {
  const { tenantSlug } = useClientTenant();
  const { slug } = useClientTheme();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("__all");

  const { services, grouped, isLoading } = useClientServices(tenantSlug, {
    search: search.trim() || undefined,
  });

  const categories = useMemo(
    () =>
      Object.keys(grouped).sort((a, b) => {
        const labelA = CATEGORY_LABELS[a] ?? a;
        const labelB = CATEGORY_LABELS[b] ?? b;
        return labelA.localeCompare(labelB);
      }),
    [grouped],
  );

  const visible = useMemo(
    () => (category === "__all" ? services : (grouped[category] ?? [])),
    [category, services, grouped],
  );

  const useGrid = slug === "beauty" || slug === "wellness";

  return (
    <div className="mx-auto max-w-md space-y-4 px-5 pb-28 pt-4">
      <ScreenHeader
        title="Servicios"
        right={
          <span className="grid h-10 w-10 place-items-center rounded-full border border-[var(--client-border)] bg-[var(--client-surface)] text-[var(--client-fg)]">
            <SlidersHorizontal className="h-[18px] w-[18px]" />
          </span>
        }
      />

      <ClientField icon={<Search className="h-4 w-4" />}>
        <input
          placeholder="Buscar servicios…"
          className={clientInputClass}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </ClientField>

      {categories.length > 0 ? (
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1.5">
          <ClientChip
            active={category === "__all"}
            onClick={() => setCategory("__all")}
          >
            <span>◯</span>
            Todos
          </ClientChip>
          {categories.map((cat) => (
            <ClientChip
              key={cat}
              active={category === cat}
              onClick={() => setCategory(cat)}
            >
              <span className="capitalize">{CATEGORY_LABELS[cat] ?? cat}</span>
            </ClientChip>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {["a", "b", "c", "d"].map((key) => (
            <Skeleton
              key={`svc-skel-${key}`}
              className="h-56 w-full rounded-2xl"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--client-fg-muted)]">
          No hay servicios disponibles
        </div>
      ) : useGrid ? (
        <div className="grid grid-cols-2 gap-3">
          {visible.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              tenantSlug={tenantSlug}
              variant="grid"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visible.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              tenantSlug={tenantSlug}
              variant="row"
            />
          ))}
        </div>
      )}
    </div>
  );
}
