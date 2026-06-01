// src/components/customers/customer-picker-dialog.tsx
"use client";

import { Loader2, Search, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCustomers } from "@/hooks/supabase/use-customers";
import type { Customer } from "@/types";

export type CustomerFilterField =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "document";

const FILTER_FIELDS: {
  key: CustomerFilterField;
  label: string;
}[] = [
  { key: "first_name", label: "Nombre" },
  { key: "last_name", label: "Apellido" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Teléfono" },
  { key: "document", label: "Documento" },
];

interface CustomerPickerDialogProps {
  tenantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customer: Customer) => void;
  selectedId?: string | null;
  title?: string;
  description?: string;
}

export function CustomerPickerDialog({
  tenantId,
  open,
  onOpenChange,
  onSelect,
  selectedId,
  title = "Seleccionar cliente",
  description = "Busca y selecciona el cliente asociado a esta factura",
}: CustomerPickerDialogProps) {
  const { customers, isLoading } = useCustomers(tenantId);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<CustomerFilterField[]>([
    "first_name",
    "last_name",
    "email",
  ]);

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!customers.length) return [];

    // Solo clientes activos
    const active = customers.filter((c) => c.is_active !== false);

    if (!normalizedSearch) return active;
    if (activeFilters.length === 0) return active;

    return active.filter((c) => {
      return activeFilters.some((field) => {
        switch (field) {
          case "first_name":
            return c.first_name?.toLowerCase().includes(normalizedSearch);
          case "last_name":
            return c.last_name?.toLowerCase().includes(normalizedSearch);
          case "email":
            return c.email?.toLowerCase().includes(normalizedSearch);
          case "phone": {
            const digits = normalizedSearch.replace(/\D/g, "");
            return (
              (c.phone && digits && c.phone.includes(digits)) ||
              c.phone_country_code?.includes(normalizedSearch)
            );
          }
          case "document":
            return c.document_number?.toLowerCase().includes(normalizedSearch);
          default:
            return false;
        }
      });
    });
  }, [customers, normalizedSearch, activeFilters]);

  const toggleFilter = (field: CustomerFilterField) => {
    setActiveFilters((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  };

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    onOpenChange(false);
  };

  const clearSearch = () => setSearch("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Buscador */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Buscar por:
            </span>
            {FILTER_FIELDS.map((f) => {
              const checked = activeFilters.includes(f.key);
              const id = `customer-filter-${f.key}`;
              return (
                <div
                  key={f.key}
                  className="flex items-center gap-2 text-sm select-none"
                >
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={() => toggleFilter(f.key)}
                  />
                  <label
                    htmlFor={id}
                    className={`cursor-pointer ${checked ? "" : "text-muted-foreground"}`}
                  >
                    {f.label}
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resultados */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <UserPlus className="h-10 w-10 mb-3 opacity-50" />
              <p className="font-medium">
                {normalizedSearch ? "Sin resultados" : "No hay clientes"}
              </p>
              <p className="text-sm">
                {normalizedSearch
                  ? "Prueba con otros términos o activa más filtros"
                  : "Crea un cliente desde el módulo Clientes"}
              </p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 py-2">
              {filtered.map((customer) => (
                <CustomerPickCard
                  key={customer.id}
                  customer={customer}
                  selected={customer.id === selectedId}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>
            {filtered.length} de {customers.length} clientes
          </span>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CustomerPickCardProps {
  customer: Customer;
  selected: boolean;
  onSelect: (customer: Customer) => void;
}

function CustomerPickCard({
  customer,
  selected,
  onSelect,
}: CustomerPickCardProps) {
  const fullName = `${customer.first_name} ${customer.last_name}`.trim();
  const initials =
    (customer.first_name?.charAt(0) || "") +
    (customer.last_name?.charAt(0) || "");

  const subtitle =
    customer.document_number ||
    customer.email ||
    (customer.phone
      ? `${customer.phone_country_code ?? ""} ${customer.phone}`.trim()
      : "Sin contacto");

  return (
    <button
      type="button"
      onClick={() => onSelect(customer)}
      className={`group flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-accent"
      }`}
    >
      <Avatar className="h-12 w-12 shrink-0">
        {customer.avatar_url ? (
          <AvatarImage src={customer.avatar_url} alt={fullName} />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {initials.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{fullName}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        {customer.tags && customer.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {customer.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="h-6 w-6 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
          ✓
        </div>
      )}
    </button>
  );
}
