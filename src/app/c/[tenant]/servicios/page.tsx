// src/app/c/[tenant]/servicios/page.tsx
// Catalogo publico de servicios del tenant agrupado por categoria.
"use client";

import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ServiceCard } from "@/components/client/service-card";
import { Input } from "@/components/ui/input";
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
  const [search, setSearch] = useState("");

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-6">
      <header className="space-y-3">
        <Link
          href={`/c/${tenantSlug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Inicio
        </Link>
        <h1 className="text-2xl font-bold">Servicios</h1>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar servicio…"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {["a", "b", "c", "d"].map((key) => (
            <Skeleton
              key={`svc-skel-${key}`}
              className="h-56 w-full rounded-xl"
            />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No hay servicios disponibles
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => (
            <section key={cat} className="space-y-3">
              <h2 className="text-base font-semibold capitalize">
                {CATEGORY_LABELS[cat] ?? cat}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {grouped[cat].map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    tenantSlug={tenantSlug}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
