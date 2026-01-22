// src/app/t/[tenant]/customers/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Clock,
  Phone,
  Mail,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerForm, LinkAccountDialog } from "@/components/customers";
import { useCustomer } from "@/hooks/supabase/use-customers";
import {
  customersService,
  type UpdateCustomerData,
} from "@/lib/services/customers";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;
  const customerId = params.id as string;

  const { customer, isLoading, error, mutate } = useCustomer(customerId);

  const handleSubmit = async (
    data: UpdateCustomerData & { tags: string[] }
  ) => {
    try {
      await customersService.updateCustomer(customerId, data);
      toast.success("Cliente actualizado");
      mutate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar"
      );
      throw error;
    }
  };

  // Formatear teléfono para WhatsApp
  const getWhatsAppLink = () => {
    if (!customer?.phone) return null;
    const code = customer.phone_country_code?.replace("+", "") || "58";
    return `https://wa.me/${code}${customer.phone}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/t/${tenantSlug}/customers`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Cliente no encontrado</h1>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          {error || "El cliente solicitado no existe"}
        </div>
      </div>
    );
  }

  const fullName = `${customer.first_name} ${customer.last_name}`.trim();
  const whatsappLink = getWhatsAppLink();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/t/${tenantSlug}/customers`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{fullName}</h1>
          <div className="flex items-center gap-2 mt-1">
            {customer.tags?.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            {!customer.is_active && (
              <Badge variant="outline">Inactivo</Badge>
            )}
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-2">
          {/* Link Account Dialog */}
          <LinkAccountDialog customer={customer} onSuccess={() => mutate()} />

          {whatsappLink && (
            <Button variant="outline" size="sm" asChild>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="h-4 w-4 mr-2" />
                WhatsApp
              </a>
            </Button>
          )}
          {customer.email && (
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:${customer.email}`}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Tab: Información */}
        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Editar información</CardTitle>
              <CardDescription>
                Actualiza los datos del cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerForm
                customer={customer}
                onSubmit={handleSubmit}
                onCancel={() => router.push(`/t/${tenantSlug}/customers`)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="history" className="space-y-6">
          {/* Resumen */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de visitas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">
                  Próximamente
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Última visita
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">-</p>
                <p className="text-xs text-muted-foreground">
                  Sin visitas registradas
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total gastado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">$0</p>
                <p className="text-xs text-muted-foreground">
                  Próximamente
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Historial de citas (placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de citas</CardTitle>
              <CardDescription>
                Citas pasadas y servicios recibidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Sin historial de citas</p>
                <p className="text-sm mt-1">
                  El historial se mostrará aquí cuando el módulo de
                  agendamiento esté activo
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notas y comentarios */}
          {customer.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notas internas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {customer.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Información de registro */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Información del registro
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  Registrado el{" "}
                  {customer.created_at
                    ? new Date(customer.created_at).toLocaleDateString("es", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                    : "Fecha no disponible"
                  }
                </span>
              </div>
              {customer.updated_at && customer.updated_at !== customer.created_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    Última actualización{" "}
                    {new Date(customer.updated_at).toLocaleDateString("es", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}