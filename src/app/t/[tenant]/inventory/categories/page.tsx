"use client";

import { ArrowLeft, Loader2, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ProductCategoryApiItem,
  useProductCategories,
} from "@/hooks/supabase/use-product-categories";
import { useAuthStore } from "@/lib/stores/auth-store";

interface CategoryFormState {
  name: string;
  icon: string;
  sort_order: number;
}

const emptyForm: CategoryFormState = { name: "", icon: "", sort_order: 0 };

export default function InventoryCategoriesPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { tenant } = useAuthStore();
  const { categories, isLoading, error, mutate } = useProductCategories(
    tenant?.id || null,
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategoryApiItem | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (category: ProductCategoryApiItem) => {
    setEditing(category);
    setForm({
      name: category.name,
      icon: category.icon || "",
      sort_order: category.sort_order ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id) {
      toast.error("No se pudo identificar el tenant");
      return;
    }
    if (!form.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setSaving(true);
    try {
      const response = editing
        ? await fetch(`/api/product-categories/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: form.name,
              icon: form.icon,
              sort_order: form.sort_order,
            }),
          })
        : await fetch("/api/product-categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              tenant_id: tenant.id,
              name: form.name,
              icon: form.icon,
              sort_order: form.sort_order,
            }),
          });

      const json = await response.json();
      if (!response.ok) {
        toast.error(json.error || "No se pudo guardar la categoría");
        return;
      }

      toast.success(editing ? "Categoría actualizada" : "Categoría creada");
      setDialogOpen(false);
      await mutate();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: ProductCategoryApiItem) => {
    const warning =
      category.product_count > 0
        ? `\n\n${category.product_count} producto(s) la usan; conservarán su categoría como texto pero dejará de estar en el catálogo.`
        : "";
    if (!confirm(`¿Eliminar la categoría "${category.name}"?${warning}`))
      return;

    const response = await fetch(`/api/product-categories/${category.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await response.json();

    if (!response.ok) {
      toast.error(json.error || "No se pudo eliminar la categoría");
      return;
    }

    toast.success("Categoría eliminada");
    await mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/t/${tenantSlug}/inventory`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Categorías de producto</h1>
          <p className="text-muted-foreground">
            {categories.length} categorías registradas
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {categories.length > 0 ? (
        <div className="divide-y rounded-lg border">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-lg">
                  {category.icon || <Tag className="h-4 w-4" />}
                </span>
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {category.product_count} producto(s)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => openEdit(category)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(category)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/20 py-12 text-center">
          <Tag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-1 text-lg font-semibold">Sin categorías</h3>
          <p className="mb-4 text-muted-foreground">
            Crea categorías para organizar tus productos.
          </p>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Crear categoría
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar categoría" : "Nueva categoría"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Actualiza los datos de la categoría. El nuevo nombre se propaga a los productos que la usan."
                : "Crea una categoría para organizar tu inventario."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nombre</Label>
              <Input
                id="category-name"
                placeholder="Ej. Shampoos"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category-icon">Ícono (emoji, opcional)</Label>
                <Input
                  id="category-icon"
                  placeholder="🧴"
                  value={form.icon}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      icon: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-order">Orden</Label>
                <Input
                  id="category-order"
                  type="number"
                  value={form.sort_order}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sort_order: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
