// src/components/client/service-card.tsx
// Card de servicio fiel al prototipo. Variante grid (beauty/wellness: imagen
// 4/5 + nombre en fuente display) o fila (imagen 80px + meta) segun template.
"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { displayStyle, useClientTheme } from "@/components/client/themed";
import type { ClientServiceListItem } from "@/lib/services/client-services";

interface ServiceCardProps {
  service: ClientServiceListItem;
  tenantSlug: string;
  variant?: "grid" | "row";
}

function formatPrice(price: number, currency: string | null): string {
  return `${currency ?? "USD"} ${price.toFixed(2)}`;
}

function ServiceImage({
  service,
  className,
}: {
  service: ClientServiceListItem;
  className?: string;
}) {
  if (service.image_url) {
    return (
      <div
        className={className}
        style={{
          backgroundImage: `url(${service.image_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    );
  }
  return (
    <div
      className={`grid place-items-center bg-[var(--client-surface-alt)] ${className ?? ""}`}
    >
      <Sparkles className="h-8 w-8 text-[var(--client-fg-faint)]" />
    </div>
  );
}

export function ServiceCard({
  service,
  tenantSlug,
  variant = "grid",
}: ServiceCardProps) {
  const { isBarber } = useClientTheme();
  const href = `/c/${tenantSlug}/servicios/${service.id}`;

  if (variant === "row") {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 border border-[var(--client-border)] bg-[var(--client-surface)] p-2.5 shadow-[var(--client-shadow-soft)] transition-colors hover:bg-[var(--client-surface-alt)]"
        style={{ borderRadius: "var(--client-rad-lg)" }}
      >
        <ServiceImage
          service={service}
          className="h-20 w-20 shrink-0 overflow-hidden rounded-[var(--client-rad-md)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {service.is_featured ? (
              <span className="rounded-full bg-[var(--client-accent)] px-1.5 py-0.5 text-[9.5px] font-bold text-[var(--client-accent-fg)]">
                ★
              </span>
            ) : null}
            {service.category ? (
              <span className="text-[11.5px] capitalize text-[var(--client-fg-muted)]">
                {service.category}
              </span>
            ) : null}
          </div>
          <p
            className="mt-1 truncate text-[14.5px] font-semibold leading-tight text-[var(--client-fg)]"
            style={
              isBarber
                ? { textTransform: "uppercase", letterSpacing: "0.04em" }
                : undefined
            }
          >
            {service.name}
          </p>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-[var(--client-fg-muted)]">
              {service.duration_minutes} min
            </span>
            <span className="text-[15px] font-bold text-[var(--client-fg)]">
              {formatPrice(service.base_price, service.currency_code)}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="block overflow-hidden border border-[var(--client-border)] bg-[var(--client-surface)] shadow-[var(--client-shadow-soft)] transition-transform hover:-translate-y-0.5"
      style={{ borderRadius: "var(--client-rad-lg)" }}
    >
      <div className="relative">
        <ServiceImage service={service} className="aspect-[4/5] w-full" />
        {service.is_featured ? (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-[var(--client-accent)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[var(--client-accent-fg)]">
            DESTACADO
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <p
          className="line-clamp-2 min-h-[36px] text-[15px] font-medium leading-tight text-[var(--client-fg)]"
          style={displayStyle(isBarber)}
        >
          {service.name}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11.5px] text-[var(--client-fg-muted)]">
            {service.duration_minutes} min
          </span>
          <span className="text-[15px] font-bold text-[var(--client-fg)]">
            {formatPrice(service.base_price, service.currency_code)}
          </span>
        </div>
      </div>
    </Link>
  );
}
