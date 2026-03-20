// src/components/appointments/day-stats-bar.tsx
"use client";

import {
    Calendar,
    CheckCircle,
    Clock,
    XCircle,
    AlertTriangle,
    DollarSign,
    TrendingUp,
} from "lucide-react";

interface DayStatsBarProps {
    stats: {
        total: number;
        confirmed: number;
        completed: number;
        cancelled: number;
        noShow: number;
        pending: number;
        inProgress: number;
        revenue: number;
    };
    date: string;
}

export function DayStatsBar({ stats, date }: DayStatsBarProps) {
    const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("es-VE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const items = [
        {
            label: "Total",
            value: stats.total,
            icon: Calendar,
            color: "text-foreground",
        },
        {
            label: "Pendientes",
            value: stats.pending,
            icon: Clock,
            color: "text-amber-500",
        },
        {
            label: "Confirmadas",
            value: stats.confirmed,
            icon: CheckCircle,
            color: "text-blue-500",
        },
        {
            label: "En curso",
            value: stats.inProgress,
            icon: TrendingUp,
            color: "text-purple-500",
        },
        {
            label: "Completadas",
            value: stats.completed,
            icon: CheckCircle,
            color: "text-green-500",
        },
        {
            label: "No asistió",
            value: stats.noShow,
            icon: AlertTriangle,
            color: "text-gray-400",
            hide: stats.noShow === 0,
        },
    ];

    return (
        <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground capitalize mb-2">
                {formattedDate}
            </p>
            <div className="flex flex-wrap items-center gap-4">
                {items
                    .filter((item) => !item.hide)
                    .map((item) => (
                        <div key={item.label} className="flex items-center gap-1.5">
                            <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                            <span className="text-sm font-semibold">{item.value}</span>
                            <span className="text-xs text-muted-foreground">
                                {item.label}
                            </span>
                        </div>
                    ))}
                {stats.revenue > 0 && (
                    <div className="flex items-center gap-1.5 ml-auto">
                        <DollarSign className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-sm font-semibold">
                            ${stats.revenue.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            ingreso
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}