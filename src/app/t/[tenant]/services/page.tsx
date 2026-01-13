// src/app/t/[tenant]/services/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Filter, Loader2, Scissors } from "lucide-react";
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
import { ServiceCard, SERVICE_CATEGORIES } from "@/components/services";
import { useServices, useServicesStats } from "@/hooks/supabase/use-services";
import { useAuthStore } from "@/lib/stores/auth-store";
import { servicesService } from "@/lib/services/services";
import type { Service } from "@/types";

export default function ServicesPage() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = params.tenant as string;
    const { tenant } = useAuthStore();

    const { services, isLoading, error, mutate } = useServices(tenant?.id || null);
    const { stats } = useServicesStats(tenant?.id || null);

    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Filtrar servicios
    const filteredServices = services.filter((service) => {
        const matchesSearch =
            service.name.toLowerCase().includes(search.toLowerCase()) ||
            service.description?.toLowerCase().includes(search.toLowerCase());

        const matchesCategory =
            categoryFilter === "all" || service.category === categoryFilter;

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && service.is_active) ||
            (statusFilter === "inactive" && !service.is_active);

        return matchesSearch && matchesCategory && matchesStatus;
    });

    // Handlers
    const handleDuplicate = async (service: Service) => {
        try {
            await servicesService.duplicateService(service.id);
            toast.success("Servicio duplicado exitosamente");
            mutate();
        } catch (error) {
            toast.error("Error al duplicar el servicio");
        }
    };

    const handleDelete = async (service: Service) => {
        if (!confirm(`¿Estás seguro de eliminar "${service.name}"?`)) return;

        try {
            await servicesService.deleteService(service.id);
            toast.success("Servicio eliminado");
            mutate();
        } catch (error) {
            toast.error("Error al eliminar el servicio");
        }
    };

    const handleToggleActive = async (service: Service) => {
        try {
            await servicesService.updateService(service.id, {
                is_active: !service.is_active,
            });
            toast.success(
                service.is_active ? "Servicio desactivado" : "Servicio activado"
            );
            mutate();
        } catch (error) {
            toast.error("Error al actualizar el servicio");
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
                Error cargando servicios: {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Servicios</h1>
                    <p className="text-muted-foreground">
                        {stats.total} servicios · {stats.active} activos
                    </p>
                </div>
                <Button asChild>
                    <Link href={`/t/${tenantSlug}/services/new`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo servicio
                    </Link>
                </Button>
            </div>

            {/* Filtros */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar servicios..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[160px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {SERVICE_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                    {cat.emoji} {cat.label}
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

            {/* Lista de servicios */}
            {filteredServices.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredServices.map((service) => (
                        <ServiceCard
                            key={service.id}
                            service={service}
                            tenantSlug={tenantSlug}
                            onDuplicate={handleDuplicate}
                            onDelete={handleDelete}
                            onToggleActive={handleToggleActive}
                        />
                    ))}
                </div>
            ) : services.length > 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-1">Sin resultados</h3>
                    <p className="text-muted-foreground">
                        No se encontraron servicios con los filtros seleccionados
                    </p>
                </div>
            ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <Scissors className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-1">Sin servicios</h3>
                    <p className="text-muted-foreground mb-4">
                        Aún no has creado ningún servicio para tu negocio
                    </p>
                    <Button asChild>
                        <Link href={`/t/${tenantSlug}/services/new`}>
                            <Plus className="h-4 w-4 mr-2" />
                            Crear primer servicio
                        </Link>
                    </Button>
                </div>
            )}
        </div>
    );
}