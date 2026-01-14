// src/app/t/[tenant]/customers/page.tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Loader2,
  Users,
  Mail,
  Phone,
  UserPlus,
  Download,
} from "lucide-react";
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
import { CustomerCard } from "@/components/customers";
import {
  useCustomers,
  useCustomerStats,
  useCustomerTags,
} from "@/hooks/supabase/use-customers";
import { useAuthStore } from "@/lib/stores/auth-store";
import { customersService } from "@/lib/services/customers";
import type { Customer } from "@/types";

export default function CustomersPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { tenant } = useAuthStore();

  const { customers, isLoading, error, mutate } = useCustomers(
    tenant?.id || null
  );
  const { stats } = useCustomerStats(tenant?.id || null);
  const { tags } = useCustomerTags(tenant?.id || null);

  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filtrar clientes
  const filteredCustomers = customers.filter((customer) => {
    const fullName =
      `${customer.first_name} ${customer.last_name}`.toLowerCase();
    const matchesSearch =
      fullName.includes(search.toLowerCase()) ||
      customer.email?.toLowerCase().includes(search.toLowerCase()) ||
      customer.phone?.includes(search);

    const matchesTag =
      tagFilter === "all" || customer.tags?.includes(tagFilter);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && customer.is_active) ||
      (statusFilter === "inactive" && !customer.is_active);

    return matchesSearch && matchesTag && matchesStatus;
  });

  // Handlers
  const handleToggleActive = async (customer: Customer) => {
    try {
      if (customer.is_active) {
        await customersService.deactivateCustomer(customer.id);
        toast.success("Cliente desactivado");
      } else {
        await customersService.reactivateCustomer(customer.id);
        toast.success("Cliente activado");
      }
      mutate();
    } catch (error) {
      toast.error("Error al actualizar el cliente");
    }
  };

  const handleDelete = async (customer: Customer) => {
    const fullName = `${customer.first_name} ${customer.last_name}`;
    if (!confirm(`¿Estás seguro de eliminar a "${fullName}"?`)) return;

    try {
      await customersService.deleteCustomer(customer.id);
      toast.success("Cliente eliminado");
      mutate();
    } catch (error) {
      toast.error("Error al eliminar el cliente");
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
        Error cargando clientes: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            {stats.total} clientes · {stats.active} activos ·{" "}
            {stats.newThisMonth} nuevos este mes
          </p>
        </div>
        <Button asChild>
          <Link href={`/t/${tenantSlug}/customers/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo cliente
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-sm">Total</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Mail className="h-4 w-4" />
            <span className="text-sm">Con email</span>
          </div>
          <p className="text-2xl font-bold">{stats.withEmail}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Phone className="h-4 w-4" />
            <span className="text-sm">Con teléfono</span>
          </div>
          <p className="text-2xl font-bold">{stats.withPhone}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <UserPlus className="h-4 w-4" />
            <span className="text-sm">Nuevos (mes)</span>
          </div>
          <p className="text-2xl font-bold">{stats.newThisMonth}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {tags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Etiqueta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

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

      {/* Lista de clientes */}
      {filteredCustomers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              tenantSlug={tenantSlug}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : customers.length > 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">Sin resultados</h3>
          <p className="text-muted-foreground">
            No se encontraron clientes con los filtros seleccionados
          </p>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">Sin clientes</h3>
          <p className="text-muted-foreground mb-4">
            Aún no has registrado ningún cliente
          </p>
          <Button asChild>
            <Link href={`/t/${tenantSlug}/customers/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar primer cliente
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}