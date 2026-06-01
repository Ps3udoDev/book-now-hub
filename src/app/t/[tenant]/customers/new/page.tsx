// src/app/t/[tenant]/customers/new/page.tsx
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CustomerForm } from "@/components/customers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type CreateCustomerData,
  customersService,
} from "@/lib/services/customers";
import { storageService } from "@/lib/services/storage";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function NewCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;
  const { tenant } = useAuthStore();

  const handleSubmit = async (
    data: Omit<CreateCustomerData, "tenant_id"> & {
      tags: string[];
      avatarFile?: File | null;
      avatar_url?: string | null;
    },
  ) => {
    if (!tenant?.id) {
      toast.error("Error: No se pudo identificar el tenant");
      return;
    }

    try {
      // Subir avatar si se seleccionó uno
      let avatar_url: string | null | undefined;
      if (data.avatarFile) {
        const path = storageService.buildPath(
          "customers",
          tenant.id,
          data.avatarFile.name,
        );
        avatar_url = await storageService.uploadImage(data.avatarFile, path);
      }

      const { avatarFile: _af, avatar_url: _au, ...rest } = data;

      await customersService.createCustomer({
        ...rest,
        tenant_id: tenant.id,
        ...(avatar_url && { avatar_url }),
      });

      toast.success("Cliente creado exitosamente");
      router.push(`/t/${tenantSlug}/customers`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al crear el cliente",
      );
      throw error;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/t/${tenantSlug}/customers`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Cliente</h1>
          <p className="text-muted-foreground">
            Registra un nuevo cliente en el sistema
          </p>
        </div>
      </div>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Información del cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/t/${tenantSlug}/customers`)}
          />
        </CardContent>
      </Card>

      {/* Tips */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>💡 Tips:</strong>
        </p>
        <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
          <li>
            • El <strong>teléfono con WhatsApp</strong> permite enviar
            recordatorios automáticos
          </li>
          <li>
            • La <strong>fecha de nacimiento</strong> activa ofertas especiales
            de cumpleaños
          </li>
          <li>
            • Las <strong>etiquetas</strong> ayudan a segmentar clientes para
            campañas
          </li>
        </ul>
      </div>
    </div>
  );
}
