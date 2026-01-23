// src/app/t/[tenant]/settings/branches/page.tsx
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BranchCard } from "@/components/branches";
import { useBranches } from "@/hooks/supabase/use-branches";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function BranchesPage() {
    const params = useParams();
    const tenantSlug = params.tenant as string;
    const { tenant } = useAuthStore();
    const { branches, isLoading, mutate } = useBranches(tenant?.id || null);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Sucursales</h1>
                    <p className="text-muted-foreground">
                        Gestiona las ubicaciones de tu negocio
                    </p>
                </div>
                <Button asChild>
                    <Link href={`/t/${tenantSlug}/settings/branches/new`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Sucursal
                    </Link>
                </Button>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[200px] rounded-lg" />
                    ))}
                </div>
            )}

            {/* Lista vacía */}
            {!isLoading && branches.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 rounded-full bg-muted mb-4">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">No hay sucursales</h3>
                    <p className="text-muted-foreground mb-4 max-w-sm">
                        Crea tu primera sucursal para empezar a gestionar tu negocio.
                    </p>
                    <Button asChild>
                        <Link href={`/t/${tenantSlug}/settings/branches/new`}>
                            <Plus className="h-4 w-4 mr-2" />
                            Crear primera sucursal
                        </Link>
                    </Button>
                </div>
            )}

            {/* Grid de sucursales */}
            {!isLoading && branches.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {branches.map((branch) => (
                        <BranchCard
                            key={branch.id}
                            branch={branch}
                            onDeleted={() => mutate()}
                            onUpdated={() => mutate()}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
