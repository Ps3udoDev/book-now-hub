// src/app/t/[tenant]/specialists/page.tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Filter, Loader2, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SpecialistCard } from "@/components/specialists";
import {
    useSpecialists,
    useSpecialistStats,
} from "@/hooks/supabase/use-specialists";
import { useAuthStore } from "@/lib/stores/auth-store";
import { specialistsService, SPECIALTIES } from "@/lib/services/specialists";
import type { Tables } from "@/types";

type Profile = Tables["profiles"]["Row"];

export default function SpecialistsPage() {
    const params = useParams();
    const tenantSlug = params.tenant as string;
    const { tenant } = useAuthStore();

    const { specialists, isLoading, error, mutate } = useSpecialists(
        tenant?.id || null
    );
    const { stats } = useSpecialistStats(tenant?.id || null);

    const [search, setSearch] = useState("");
    const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Filtrar especialistas
    const filteredSpecialists = specialists.filter((specialist) => {
        const matchesSearch = specialist.full_name
            .toLowerCase()
            .includes(search.toLowerCase());

        const matchesSpecialty =
            specialtyFilter === "all" ||
            specialist.specialties?.includes(specialtyFilter);

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && specialist.is_active) ||
            (statusFilter === "inactive" && !specialist.is_active);

        return matchesSearch && matchesSpecialty && matchesStatus;
    });

    // Handlers
    const handleToggleActive = async (specialist: Profile) => {
        try {
            if (specialist.is_active) {
                await specialistsService.deactivateSpecialist(specialist.id);
                toast.success("Especialista desactivado");
            } else {
                await specialistsService.reactivateSpecialist(specialist.id);
                toast.success("Especialista activado");
            }
            mutate();
        } catch (error) {
            toast.error("Error al actualizar el especialista");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
                Error cargando especialistas: {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Especialistas</h1>
                    <p className="text-muted-foreground">
                        {stats.total} especialistas · {stats.active} activos
                    </p>
                </div>
                <Button asChild>
                    <Link href={`/t/${tenantSlug}/specialists/new`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo especialista
                    </Link>
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">Total</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <UserPlus className="h-4 w-4" />
                        <span className="text-sm">Activos</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">Inactivos</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.total - stats.active}</p>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Especialidad" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {SPECIALTIES.map((specialty) => (
                                <SelectItem key={specialty.value} value={specialty.value}>
                                    {specialty.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="active">Activos</SelectItem>
                            <SelectItem value="inactive">Inactivos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Lista de especialistas */}
            {filteredSpecialists.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredSpecialists.map((specialist) => (
                        <SpecialistCard
                            key={specialist.id}
                            specialist={specialist}
                            tenantSlug={tenantSlug}
                            onToggleActive={handleToggleActive}
                        />
                    ))}
                </div>
            ) : specialists.length > 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-1">Sin resultados</h3>
                    <p className="text-muted-foreground">
                        No se encontraron especialistas con los filtros seleccionados
                    </p>
                </div>
            ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-1">Sin especialistas</h3>
                    <p className="text-muted-foreground mb-4">
                        Aún no has registrado ningún especialista
                    </p>
                    <Button asChild>
                        <Link href={`/t/${tenantSlug}/specialists/new`}>
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar primer especialista
                        </Link>
                    </Button>
                </div>
            )}
        </div>
    );
}