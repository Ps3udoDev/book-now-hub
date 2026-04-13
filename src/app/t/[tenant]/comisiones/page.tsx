// src/app/t/[tenant]/comisiones/page.tsx
"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCircle2,
  DollarSign,
  Loader2,
  Pencil,
  PercentCircle,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CommissionRuleDialog } from "@/components/commissions/commission-rule-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCommissionRules,
  useCommissions,
} from "@/hooks/supabase/use-commissions";
import { useSpecialists } from "@/hooks/supabase/use-specialists";
import {
  type CommissionRuleWithRelations,
  commissionsService,
} from "@/lib/services/commissions";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { CommissionRule, CommissionStatus } from "@/types";

const STATUS_OPTIONS: { value: CommissionStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Aprobadas" },
  { value: "paid", label: "Liquidadas" },
  { value: "cancelled", label: "Canceladas" },
];

const SCOPE_LABELS: Record<string, string> = {
  all: "Global",
  item_type: "Por tipo",
  service: "Por servicio",
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  service: "Servicio",
  product: "Producto",
  cafeteria: "Cafetería",
};

export default function ComisionesPage() {
  const { tenant, tenantUser } = useAuthStore();
  const tenantId = tenant?.id ?? null;

  const isAdminOrOwner = ["owner", "admin"].includes(tenantUser?.role ?? "");

  // Filtros comisiones
  const [filterSpecialist, setFilterSpecialist] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<CommissionStatus | "all">(
    "all",
  );

  // Diálogo de reglas
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const { specialists } = useSpecialists(tenantId);
  const {
    rules,
    isLoading: loadingRules,
    mutate: mutateRules,
  } = useCommissionRules(tenantId);
  const {
    commissions,
    isLoading: loadingComm,
    mutate: mutateComm,
  } = useCommissions(tenantId, {
    specialistId: filterSpecialist !== "all" ? filterSpecialist : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
  });

  // KPIs de comisiones
  const totalPending = commissions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + c.commission_amount, 0);
  const totalApproved = commissions
    .filter((c) => c.status === "approved")
    .reduce((s, c) => s + c.commission_amount, 0);
  const totalPaid = commissions
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + c.commission_amount, 0);

  async function handleDeleteRule(id: string) {
    setDeletingId(id);
    try {
      await commissionsService.deleteRule(id);
      toast.success("Regla eliminada");
      mutateRules();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleApprove(id: string) {
    setActionId(id);
    try {
      await commissionsService.approveCommission(id);
      toast.success("Comisión aprobada");
      mutateComm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al aprobar");
    } finally {
      setActionId(null);
    }
  }

  async function handlePay(id: string) {
    setActionId(id);
    try {
      await commissionsService.payCommission(id);
      toast.success("Comisión liquidada");
      mutateComm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al liquidar");
    } finally {
      setActionId(null);
    }
  }

  // Agrupar reglas por especialista
  const rulesBySpecialist = rules.reduce<
    Record<string, CommissionRuleWithRelations[]>
  >((acc, rule) => {
    const key = rule.specialist_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(rule);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comisiones</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona las reglas y liquidaciones de comisiones de los especialistas
        </p>
      </div>

      <Tabs defaultValue="comisiones">
        <TabsList>
          <TabsTrigger value="comisiones">Comisiones</TabsTrigger>
          {isAdminOrOwner && <TabsTrigger value="reglas">Reglas</TabsTrigger>}
        </TabsList>

        {/* ── TAB COMISIONES ── */}
        <TabsContent value="comisiones" className="space-y-6 mt-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pendientes
                </CardTitle>
                <DollarSign className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">${totalPending.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {commissions.filter((c) => c.status === "pending").length}{" "}
                  comisiones
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Aprobadas
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  ${totalApproved.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {commissions.filter((c) => c.status === "approved").length}{" "}
                  comisiones
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Liquidadas
                </CardTitle>
                <Wallet className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {commissions.filter((c) => c.status === "paid").length}{" "}
                  comisiones
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <Select
              value={filterSpecialist}
              onValueChange={setFilterSpecialist}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todos los especialistas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los especialistas</SelectItem>
                {specialists.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterStatus}
              onValueChange={(v) =>
                setFilterStatus(v as CommissionStatus | "all")
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabla de comisiones */}
          <Card>
            <CardContent className="p-0">
              {loadingComm ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : commissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-sm">
                  No hay comisiones con los filtros seleccionados
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Especialista</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Base</TableHead>
                      <TableHead>Comisión</TableHead>
                      <TableHead>Moneda</TableHead>
                      <TableHead>Estado</TableHead>
                      {isAdminOrOwner && (
                        <TableHead className="text-right">Acciones</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.specialist?.full_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(c.created_at), "dd MMM yyyy", {
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell>{c.base_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            {c.commission_amount.toFixed(2)}
                          </span>
                          {c.commission_type === "percentage" &&
                            c.commission_rate !== null && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({c.commission_rate}%)
                              </span>
                            )}
                        </TableCell>
                        <TableCell>{c.currency_code}</TableCell>
                        <TableCell>
                          <Badge
                            className={commissionsService.getStatusColor(
                              c.status,
                            )}
                          >
                            {commissionsService.getStatusLabel(c.status)}
                          </Badge>
                        </TableCell>
                        {isAdminOrOwner && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {c.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApprove(c.id)}
                                  disabled={actionId === c.id}
                                >
                                  {actionId === c.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  )}
                                  <span className="ml-1">Aprobar</span>
                                </Button>
                              )}
                              {(c.status === "pending" ||
                                c.status === "approved") && (
                                <Button
                                  size="sm"
                                  onClick={() => handlePay(c.id)}
                                  disabled={actionId === c.id}
                                >
                                  {actionId === c.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Wallet className="h-3.5 w-3.5" />
                                  )}
                                  <span className="ml-1">Liquidar</span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB REGLAS ── */}
        {isAdminOrOwner && (
          <TabsContent value="reglas" className="space-y-6 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Define cuánto gana cada especialista por tipo de ítem o
                servicio. La regla más específica tiene prioridad (servicio{" "}
                {">"} tipo {">"} global).
              </p>
              <Button
                onClick={() => {
                  setEditingRule(null);
                  setRuleDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva regla
              </Button>
            </div>

            {loadingRules ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(rulesBySpecialist).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <PercentCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">
                    No hay reglas de comisión configuradas
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setEditingRule(null);
                      setRuleDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primera regla
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {Object.entries(rulesBySpecialist).map(
                  ([, specialistRules]) => {
                    const name =
                      specialistRules[0]?.specialist?.full_name ??
                      "Especialista";
                    return (
                      <Card key={specialistRules[0].specialist_id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Ámbito</TableHead>
                                <TableHead>Aplica a</TableHead>
                                <TableHead>Comisión</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">
                                  Acciones
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {specialistRules.map((rule) => (
                                <TableRow key={rule.id}>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {SCOPE_LABELS[rule.scope]}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {rule.scope === "all" && "Todos los ítems"}
                                    {rule.scope === "item_type" &&
                                      ITEM_TYPE_LABELS[rule.item_type ?? ""]}
                                    {rule.scope === "service" &&
                                      (rule.service?.name ?? "Servicio")}
                                  </TableCell>
                                  <TableCell className="font-semibold">
                                    {rule.commission_type === "percentage"
                                      ? `${rule.value}%`
                                      : `${rule.currency_code} ${rule.value.toFixed(2)}`}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        rule.is_active ? "default" : "secondary"
                                      }
                                    >
                                      {rule.is_active ? "Activa" : "Inactiva"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                          setEditingRule(rule);
                                          setRuleDialogOpen(true);
                                        }}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() =>
                                          handleDeleteRule(rule.id)
                                        }
                                        disabled={deletingId === rule.id}
                                      >
                                        {deletingId === rule.id ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    );
                  },
                )}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Diálogo crear/editar regla */}
      <CommissionRuleDialog
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
        tenantId={tenant?.id ?? ""}
        specialists={specialists.filter((s) => s.is_specialist)}
        editingRule={editingRule}
        onSaved={mutateRules}
      />
    </div>
  );
}
