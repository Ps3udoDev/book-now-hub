"use client";

import {
  Beef,
  Coffee,
  CupSoda,
  Dessert,
  Drumstick,
  GripVertical,
  IceCreamBowl,
  Leaf,
  Pencil,
  Pizza,
  Plus,
  RefreshCw,
  Soup,
  Trash2,
  type LucideIcon,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MenuItemDialog } from "@/components/cafeteria";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useActiveBranches } from "@/hooks/supabase/use-branches";
import { useFullMenu, useMenuCategories } from "@/hooks/supabase/use-menu";
import type { MenuCategory } from "@/types";
import { menuService, type MenuItemWithImages } from "@/lib/services/menu";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  getMenuItemImageUrl,
  parseCategoryAppearance,
  serializeCategoryAppearance,
} from "@/lib/utils/cafeteria";

type CategoryFormState = {
  id: string | null;
  name: string;
  icon: string;
  color: string;
  is_active: boolean;
};

type IconOption = {
  name: string;
  label: string;
  color: string;
  icon: LucideIcon;
};

const CATEGORY_ICON_OPTIONS: IconOption[] = [
  { name: "Coffee", label: "Café", color: "#8B5E3C", icon: Coffee },
  { name: "CupSoda", label: "Bebidas frías", color: "#1D9BF0", icon: CupSoda },
  { name: "Wine", label: "Bebidas premium", color: "#9B3D5A", icon: Wine },
  { name: "Dessert", label: "Postres", color: "#E86A92", icon: Dessert },
  { name: "IceCreamBowl", label: "Helados", color: "#7C5CFC", icon: IceCreamBowl },
  { name: "Pizza", label: "Snacks", color: "#F97316", icon: Pizza },
  { name: "Soup", label: "Sopas", color: "#F59E0B", icon: Soup },
  { name: "Drumstick", label: "Proteínas", color: "#C2410C", icon: Drumstick },
  { name: "Beef", label: "Platos fuertes", color: "#B45309", icon: Beef },
  { name: "Leaf", label: "Saludable", color: "#22A06B", icon: Leaf },
  { name: "UtensilsCrossed", label: "General", color: "#334155", icon: UtensilsCrossed },
];

const EMPTY_CATEGORY_FORM: CategoryFormState = {
  id: null,
  name: "",
  icon: "",
  color: "#8B5E3C",
  is_active: true,
};

export default function CafeteriaMenuManagementPage() {
  const { tenant, tenantUser } = useAuthStore();
  const { branches, isLoading: loadingBranches } = useActiveBranches(
    tenant?.id ?? null,
  );
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemWithImages | null>(null);
  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(EMPTY_CATEGORY_FORM);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  useEffect(() => {
    if (!selectedBranchId && branches[0]?.id) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  const { categories, isLoading: loadingCategories, mutate: mutateCategories } =
    useMenuCategories(tenant?.id ?? null, selectedBranchId);
  const { items, isLoading: loadingItems, mutate: mutateItems } = useFullMenu(
    tenant?.id ?? null,
    selectedBranchId,
  );

  const canManageMenu = ["owner", "admin", "manager"].includes(
    tenantUser?.role ?? "",
  );

  const groupedItems = useMemo(() => {
    const orderedCategories = categories
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

    const sections = orderedCategories.map((category) => ({
      category,
      items: items.filter((item) => item.category_id === category.id),
    }));

    const uncategorized = items.filter((item) => !item.category_id);
    if (uncategorized.length > 0) {
      sections.push({
        category: {
          id: "uncategorized",
          tenant_id: tenant?.id || "",
          branch_id: selectedBranchId,
          name: "Sin categoría",
          icon: "Coffee",
          sort_order: 9999,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        items: uncategorized,
      });
    }

    return sections.filter((section) => section.items.length > 0);
  }, [categories, items, selectedBranchId, tenant?.id]);

  async function refreshAll() {
    await Promise.all([mutateCategories(), mutateItems()]);
  }

  async function handleToggleAvailability(item: MenuItemWithImages) {
    try {
      await menuService.toggleAvailability(item.id, !item.is_available);
      toast.success(
        item.is_available ? "Item ocultado del menú" : "Item habilitado",
      );
      await mutateItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo actualizar",
      );
    }
  }

  async function handleDeleteItem(item: MenuItemWithImages) {
    if (!confirm(`¿Desactivar "${item.name}" del menú?`)) return;
    try {
      await menuService.deleteItem(item.id);
      toast.success("Item desactivado");
      await mutateItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo desactivar",
      );
    }
  }

  async function handleSaveCategory() {
    if (!tenant?.id || !selectedBranchId || !categoryForm.name.trim()) {
      toast.error("La categoría requiere nombre");
      return;
    }

    setIsSavingCategory(true);
    try {
      if (categoryForm.id) {
        await menuService.updateCategory(categoryForm.id, {
          name: categoryForm.name.trim(),
          icon: serializeCategoryAppearance(categoryForm.icon, categoryForm.color),
          is_active: categoryForm.is_active,
        });
        toast.success("Categoría actualizada");
      } else {
        await menuService.createCategory({
          tenant_id: tenant.id,
          branch_id: selectedBranchId,
          name: categoryForm.name.trim(),
          icon: serializeCategoryAppearance(categoryForm.icon, categoryForm.color),
          sort_order: categories.length,
          is_active: categoryForm.is_active,
        });
        toast.success("Categoría creada");
      }
      setCategoryForm(EMPTY_CATEGORY_FORM);
      await mutateCategories();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar la categoría",
      );
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function handleDeleteCategory(category: MenuCategory) {
    if (!confirm(`¿Eliminar la categoría "${category.name}"?`)) return;
    try {
      await menuService.deleteCategory(category.id);
      toast.success("Categoría eliminada");
      setCategoryForm(EMPTY_CATEGORY_FORM);
      await refreshAll();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar",
      );
    }
  }

  async function handleDropCategory(targetCategoryId: string) {
    if (!draggedCategoryId || draggedCategoryId === targetCategoryId) return;

    const sorted = categories
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    const fromIndex = sorted.findIndex((item) => item.id === draggedCategoryId);
    const toIndex = sorted.findIndex((item) => item.id === targetCategoryId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = sorted.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    try {
      await Promise.all(
        next.map((category, index) =>
          menuService.updateCategory(category.id, { sort_order: index }),
        ),
      );
      toast.success("Orden de categorías actualizado");
      await mutateCategories();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo reordenar",
      );
    } finally {
      setDraggedCategoryId(null);
    }
  }

  if (!canManageMenu) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 p-10 text-center">
        <Coffee className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Gestión de menú restringida</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Solo `owner`, `admin` o `manager` pueden editar el menú de cafetería.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menú de cafetería</h1>
          <p className="text-muted-foreground">
            Gestiona categorías, disponibilidad y presentación del menú.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedBranchId ?? undefined}
            onValueChange={setSelectedBranchId}
            disabled={loadingBranches}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecciona sucursal" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => {
              setEditingItem(null);
              setDialogOpen(true);
            }}
            disabled={!selectedBranchId}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo item
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categorías</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              {categories
                .slice()
                .sort(
                  (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
                )
                .map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    draggable
                    onDragStart={() => setDraggedCategoryId(category.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDropCategory(category.id)}
                    onClick={() => {
                      const appearance = parseCategoryAppearance(category.icon);
                      setCategoryForm({
                        id: category.id,
                        name: category.name,
                        icon: appearance.iconName || "",
                        color: appearance.colorHex || "#8B5E3C",
                        is_active: category.is_active,
                      });
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition hover:border-primary/40 hover:bg-muted/40"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        #{category.sort_order} {category.branch_id ? "Sucursal" : "Tenant"}
                      </p>
                    </div>
                    {(() => {
                      const appearance = parseCategoryAppearance(category.icon);
                      const iconOption = CATEGORY_ICON_OPTIONS.find(
                        (option) => option.name === appearance.iconName,
                      );

                      if (!iconOption) return null;

                      const Icon = iconOption.icon;
                      return (
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full border"
                          style={{
                            backgroundColor: `${appearance.colorHex || iconOption.color}20`,
                            color: appearance.colorHex || iconOption.color,
                          }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                      );
                    })()}
                    <Badge variant={category.is_active ? "default" : "secondary"}>
                      {category.is_active ? "Activa" : "Oculta"}
                    </Badge>
                  </button>
                ))}
            </div>

            <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  {categoryForm.id ? "Editar categoría" : "Nueva categoría"}
                </h3>
                {categoryForm.id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCategoryForm(EMPTY_CATEGORY_FORM)}
                  >
                    Limpiar
                  </Button>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-name">Nombre</Label>
                <Input
                  id="category-name"
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Bebidas calientes"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Icono</Label>
                  <Badge variant="outline">
                    {categoryForm.icon || "Sin icono"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CATEGORY_ICON_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isActive = categoryForm.icon === option.name;

                    return (
                      <button
                        key={option.name}
                        type="button"
                        onClick={() =>
                          setCategoryForm((current) => ({
                            ...current,
                            icon: option.name,
                            color:
                              current.color === "#8B5E3C" || !current.color
                                ? option.color
                                : current.color,
                          }))
                        }
                        className={`rounded-xl border p-3 text-left transition ${
                          isActive ? "border-primary bg-primary/5" : "hover:border-primary/40"
                        }`}
                      >
                        <div
                          className="mb-2 flex h-9 w-9 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${option.color}20`, color: option.color }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-medium">{option.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-color">Color (hex)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="category-color"
                    value={categoryForm.color}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        color: event.target.value,
                      }))
                    }
                    placeholder="#8B5E3C"
                  />
                  <div
                    className="h-11 w-11 rounded-xl border"
                    style={{ backgroundColor: categoryForm.color || "#8B5E3C" }}
                  />
                </div>
                <div
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{
                    borderColor: `${categoryForm.color || "#8B5E3C"}55`,
                    backgroundColor: `${categoryForm.color || "#8B5E3C"}12`,
                    color: categoryForm.color || "#8B5E3C",
                  }}
                >
                  Hex activo para esta categoría: {categoryForm.color || "#8B5E3C"}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border bg-background px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Visible en el menú</p>
                  <p className="text-xs text-muted-foreground">
                    Permite ocultar toda la categoría sin borrarla.
                  </p>
                </div>
                <Switch
                  checked={categoryForm.is_active}
                  onCheckedChange={(checked) =>
                    setCategoryForm((current) => ({
                      ...current,
                      is_active: checked,
                    }))
                  }
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleSaveCategory}
                  disabled={isSavingCategory}
                >
                  {categoryForm.id ? "Guardar" : "Crear"}
                </Button>
                {categoryForm.id ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      const category = categories.find(
                        (item) => item.id === categoryForm.id,
                      );
                      if (category) void handleDeleteCategory(category);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {loadingCategories || loadingItems ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Cargando menú...
              </CardContent>
            </Card>
          ) : groupedItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Coffee className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Sin items en esta sucursal</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crea categorías e items para empezar a publicar el menú.
                </p>
              </CardContent>
            </Card>
          ) : (
            groupedItems.map((section) => (
              <section key={section.category.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{section.category.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {section.items.length} item(s)
                    </p>
                  </div>
                  <Badge variant={section.category.is_active ? "default" : "secondary"}>
                    {section.category.is_active ? "Visible" : "Oculta"}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {section.items.map((item) => {
                    const imageUrl = getMenuItemImageUrl(item);
                    return (
                      <Card key={item.id} className="overflow-hidden">
                        <div className="aspect-[16/10] bg-muted">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                              Sin foto
                            </div>
                          )}
                        </div>
                        <CardContent className="space-y-4 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold">{item.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                ${Number(item.price).toFixed(2)} · {item.preparation_time_minutes} min
                              </p>
                            </div>
                            <Badge variant={item.is_available ? "default" : "secondary"}>
                              {item.is_available ? "Disponible" : "Agotado"}
                            </Badge>
                          </div>

                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {item.description || "Sin descripción cargada."}
                          </p>

                          <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium">Disponibilidad rápida</p>
                              <p className="text-xs text-muted-foreground">
                                Toggle sin abrir el modal
                              </p>
                            </div>
                            <Switch
                              checked={item.is_available}
                              onCheckedChange={() => handleToggleAvailability(item)}
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setEditingItem(item);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => handleDeleteItem(item)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Desactivar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      {tenant?.id && selectedBranchId ? (
        <MenuItemDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          tenantId={tenant.id}
          branchId={selectedBranchId}
          categories={categories.filter((category) => category.is_active)}
          item={editingItem}
          onSaved={refreshAll}
        />
      ) : null}
    </div>
  );
}
