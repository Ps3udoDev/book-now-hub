// src/components/client/service-card.tsx
"use client";

import { Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { ClientServiceListItem } from "@/lib/services/client-services";

interface ServiceCardProps {
  service: ClientServiceListItem;
  tenantSlug: string;
}

function formatPrice(price: number, currency: string | null): string {
  return `${currency ?? "USD"} ${price.toFixed(2)}`;
}

export function ServiceCard({ service, tenantSlug }: ServiceCardProps) {
  return (
    <Link href={`/c/${tenantSlug}/servicios/${service.id}`} className="block">
      <Card className="overflow-hidden hover:border-primary/40 hover:shadow-md transition-all">
        <CardContent className="p-0">
          <div className="aspect-[16/9] bg-muted relative overflow-hidden">
            {service.image_url ? (
              <img
                src={service.image_url}
                alt={service.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary/40" />
              </div>
            )}
            {service.is_featured ? (
              <span className="absolute top-2 right-2 rounded-full bg-primary text-primary-foreground text-xs font-medium px-2 py-1">
                Destacado
              </span>
            ) : null}
          </div>
          <div className="p-4 space-y-2">
            <h3 className="font-semibold leading-tight">{service.name}</h3>
            {service.description ? (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {service.description}
              </p>
            ) : null}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {service.duration_minutes} min
              </span>
              <span className="font-semibold text-primary">
                {formatPrice(service.base_price, service.currency_code)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
