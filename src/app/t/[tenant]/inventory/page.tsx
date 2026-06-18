"use client";

import { ArrowRight, Loader2, Package, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductCard } from "@/components/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ProductApiItem,
  useProducts,
} from "@/hooks/supabase/use-products";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function InventoryPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { tenant } = useAuthStore();
  const { products, isLoading, error, mutate } = useProducts(
    tenant?.id || null,
  );
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.category)
            .filter((category): category is string => Boolean(category)),
        ),
      ).sort(),
    [products],
  );

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch =
          product.name.toLowerCase().includes(search.toLowerCase()) ||
          product.sku?.toLowerCase().includes(search.toLowerCase()) ||
          product.category?.toLowerCase().includes(search.toLowerCase());

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && product.is_active) ||
          (statusFilter === "inactive" && !product.is_active);

        const matchesCategory =
          categoryFilter === "all" || product.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
      }),
    [categoryFilter, products, search, statusFilter],
  );

  const refresh = async () => {
    await mutate();
  };

  const handleDelete = async (product: ProductApiItem) => {
    if (
      !confirm(
        `¿Eliminar permanentemente "${product.name}"?\n\nSe borrarán también sus imágenes y su historial de movimientos de inventario. Esta acción no se puede deshacer.`,
      )
    )
      return;

    const response = await fetch(`/api/products/${product.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await response.json();

    if (!response.ok) {
      toast.error(json.error || "No se pudo eliminar el producto");
      return;
    }

    toast.success("Producto eliminado");
    refresh();
  };

  const handleToggleActive = async (product: ProductApiItem) => {
    const response = await fetch(`/api/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_active: !product.is_active }),
    });
    const json = await response.json();

    if (!response.ok) {
      toast.error(json.error || "No se pudo actualizar el producto");
      return;
    }

    toast.success(
      product.is_active ? "Producto desactivado" : "Producto activado",
    );
    refresh();
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
      <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
        Error cargando inventario: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="text-muted-foreground">
            {products.length} productos registrados
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/t/${tenantSlug}/inventory/movements`}>
              Ver movimientos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/t/${tenantSlug}/inventory/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo producto
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, SKU o categoría"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
          >
            Todos
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            onClick={() => setStatusFilter("active")}
          >
            Activos
          </Button>
          <Button
            variant={statusFilter === "inactive" ? "default" : "outline"}
            onClick={() => setStatusFilter("inactive")}
          >
            Inactivos
          </Button>
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              tenantSlug={tenantSlug}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/20 py-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-1 text-lg font-semibold">Sin productos</h3>
          <p className="mb-4 text-muted-foreground">
            Crea tu primer producto para empezar a trabajar el inventario.
          </p>
          <Button asChild>
            <Link href={`/t/${tenantSlug}/inventory/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Crear producto
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
