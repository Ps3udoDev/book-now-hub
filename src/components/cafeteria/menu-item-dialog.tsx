"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { MenuCategory } from "@/types";
import type { MenuItemWithImages } from "@/lib/services/menu";
import { menuService } from "@/lib/services/menu";
import { getMenuItemImageUrl } from "@/lib/utils/cafeteria";
import type { MenuImageDraft } from "@/lib/utils/menu-image-upload";
import { uploadMenuItemImage } from "@/lib/utils/menu-image-upload";
import { MenuImageUploader } from "./menu-image-uploader";

interface MenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  branchId: string;
  categories: MenuCategory[];
  item?: MenuItemWithImages | null;
  onSaved: () => Promise<void> | void;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  category_id: "none",
  price: "0",
  preparation_time_minutes: "10",
  is_available: true,
};

export function MenuItemDialog({
  open,
  onOpenChange,
  tenantId,
  branchId,
  categories,
  item,
  onSaved,
}: MenuItemDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageDraft, setImageDraft] = useState<MenuImageDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const existingImageUrl = useMemo(
    () => (item ? getMenuItemImageUrl(item) : null),
    [item],
  );

  useEffect(() => {
    if (!open) return;

    setForm(
      item
        ? {
            name: item.name,
            description: item.description || "",
            category_id: item.category_id || "none",
            price: String(item.price),
            preparation_time_minutes: String(item.preparation_time_minutes || 0),
            is_available: item.is_available,
          }
        : EMPTY_FORM,
    );
    setImageDraft(null);
  }, [item, open]);

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        category_id: form.category_id === "none" ? null : form.category_id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        preparation_time_minutes: Number(form.preparation_time_minutes || 0),
        is_available: form.is_available,
      };

      let targetId = item?.id ?? null;

      if (item) {
        await menuService.updateItem(item.id, payload);
      } else {
        const created = await menuService.createItem({
          tenant_id: tenantId,
          branch_id: branchId,
          ...payload,
        });
        targetId = created.id;
      }

      if (targetId && imageDraft) {
        const uploadedImage = await uploadMenuItemImage({
          tenantId,
          menuItemId: targetId,
          draft: imageDraft,
        });
        await menuService.updateItem(targetId, { image: uploadedImage });
      }

      toast.success(item ? "Item actualizado" : "Item creado");
      await onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar el item",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? "Editar item" : "Nuevo item del menú"}</DialogTitle>
          <DialogDescription>
            Configura nombre, precio, tiempo de preparación e imagen principal.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="menu-item-name">Nombre</Label>
              <Input
                id="menu-item-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Ej: Latte vainilla"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-item-description">Descripción</Label>
              <Textarea
                id="menu-item-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Describe ingredientes o presentación"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, category_id: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="menu-item-price">Precio</Label>
                <Input
                  id="menu-item-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, price: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="menu-item-time">Tiempo de preparación (min)</Label>
                <Input
                  id="menu-item-time"
                  type="number"
                  min="0"
                  step="1"
                  value={form.preparation_time_minutes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      preparation_time_minutes: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex items-end">
                <div className="flex w-full items-center justify-between rounded-xl border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Disponible para venta</p>
                    <p className="text-xs text-muted-foreground">
                      Si se desactiva, no aparece en el menú del cliente.
                    </p>
                  </div>
                  <Switch
                    checked={form.is_available}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        is_available: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Foto principal</Label>
            <MenuImageUploader
              draft={imageDraft}
              existingUrl={existingImageUrl}
              onChange={setImageDraft}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {item ? "Guardar cambios" : "Crear item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
