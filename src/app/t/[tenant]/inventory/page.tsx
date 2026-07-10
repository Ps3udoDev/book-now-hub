"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Plus,
  Search,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BulkImportButton } from "@/components/bulk-import";
import {
  ExportProductsDialog,
  ProductCard,
  ProductFormModal,
} from "@/components/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranches } from "@/hooks/supabase/use-branches";
import { useProductCategories } from "@/hooks/supabase/use-product-categories";
import {
  type ProductApiItem,
  useProducts,
} from "@/hooks/supabase/use-products";
import { useAuthStore } from "@/lib/stores/auth-store";

const PAGE_SIZE = 20;

export default function InventoryPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { tenant } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { products, pagination, isLoading, error, mutate } = useProducts(
    tenant?.id || null,
    {
      page,
      pageSize: PAGE_SIZE,
      search: searchDebounced || undefined,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      isActive: statusFilter === "all" ? undefined : statusFilter === "active",
    },
  );

  const { categories } = useProductCategories(tenant?.id || null);
  const { branches } = useBranches(tenant?.id || null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductApiItem | null>(
    null,
  );

  const openCreate = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const openEdit = (product: ProductApiItem) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

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
            {pagination?.total ?? products.length} productos registrados
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/t/${tenantSlug}/inventory/categories`}>
              <Tag className="mr-2 h-4 w-4" />
              Categorías
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/t/${tenantSlug}/inventory/movements`}>
              Ver movimientos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          {tenant?.id && (
            <>
              <BulkImportButton
                entity="products"
                tenantId={tenant.id}
                onImportComplete={refresh}
              />
              <ExportProductsDialog
                tenantId={tenant.id}
                tenantSlug={tenantSlug}
                categories={categories.map((category) => category.name)}
                branches={branches}
              />
            </>
          )}
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo producto
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
          <Select
            value={categoryFilter}
            onValueChange={(value) => {
              setCategoryFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => {
              setStatusFilter("all");
              setPage(1);
            }}
          >
            Todos
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            onClick={() => {
              setStatusFilter("active");
              setPage(1);
            }}
          >
            Activos
          </Button>
          <Button
            variant={statusFilter === "inactive" ? "default" : "outline"}
            onClick={() => {
              setStatusFilter("inactive");
              setPage(1);
            }}
          >
            Inactivos
          </Button>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={openEdit}
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
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Crear producto
          </Button>
        </div>
      )}

      {pagination && pagination.total_pages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.total_pages}
            onClick={() => setPage((current) => current + 1)}
          >
            Siguiente
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {tenant?.id && (
        <ProductFormModal
          open={formOpen}
          onOpenChange={setFormOpen}
          tenantId={tenant.id}
          branches={branches}
          categories={categories.map((category) => category.name)}
          product={editingProduct}
          onSaved={() => {
            refresh();
          }}
        />
      )}
    </div>
  );
}
