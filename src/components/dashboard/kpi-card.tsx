"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedNumber } from "./animated-number";

interface KpiCardProps {
  title: string;
  value: number;
  description?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  format?: (n: number) => string;
}

export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  iconBg,
  format,
}: KpiCardProps) {
  return (
    <Card className="dashboard-stagger">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`rounded-lg p-2 ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <AnimatedNumber value={value} format={format} />
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
