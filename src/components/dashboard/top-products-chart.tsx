"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TopProduct } from "@/lib/services/dashboard";

interface TopProductsChartProps {
  data: TopProduct[];
}

type Metric = "units" | "revenue";

export function TopProductsChart({ data }: TopProductsChartProps) {
  const [metric, setMetric] = useState<Metric>("units");

  return (
    <Card className="dashboard-stagger">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Top productos vendidos</CardTitle>
          <CardDescription>
            {metric === "units"
              ? "Por unidades del mes"
              : "Por ingreso del mes"}
          </CardDescription>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={metric === "units" ? "default" : "outline"}
            onClick={() => setMetric("units")}
          >
            Unidades
          </Button>
          <Button
            size="sm"
            variant={metric === "revenue" ? "default" : "outline"}
            onClick={() => setMetric("revenue")}
          >
            Ingreso
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Sin ventas este mes.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  allowDecimals={metric === "revenue"}
                  tick={{ fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={110}
                  tick={{ fill: "var(--foreground)" }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  formatter={(value: unknown) => [
                    metric === "units"
                      ? `${Number(value)} uds`
                      : `${Number(value).toLocaleString("es", { maximumFractionDigits: 2 })}`,
                    metric === "units" ? "Unidades" : "Ingreso",
                  ]}
                  contentStyle={{
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                    fontSize: "0.8rem",
                  }}
                />
                <Bar
                  dataKey={metric}
                  fill="var(--primary)"
                  radius={[0, 4, 4, 0]}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
