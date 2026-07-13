// src/app/t/[tenant]/cash-register/open/page.tsx
"use client";

import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  Loader2,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useActiveBranches } from "@/hooks/supabase/use-branches";
import { useCashRegistersByBranch } from "@/hooks/supabase/use-cash-registers";
import { useActiveSession } from "@/hooks/supabase/use-cash-sessions";
import { cashSessionsService } from "@/lib/services/cash-sessions";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function AperturaCajaPage() {
  const router = useRouter();
  const { tenant } = useAuthStore();
  const { branches, isLoading: loadingBranches } = useActiveBranches(
    tenant?.id ?? null,
  );

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedRegisterId, setSelectedRegisterId] = useState("");
  const [openingAmount, setOpeningAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [opening, setOpening] = useState(false);
  const [opened, setOpened] = useState(false);

  const { cashRegisters, isLoading: loadingRegisters } =
    useCashRegistersByBranch(selectedBranchId || null);

  const {
    activeSession,
    isLoading: loadingSession,
    mutate,
  } = useActiveSession(selectedBranchId || null);

  // Pre-seleccionar primera sucursal
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Pre-seleccionar primera caja cuando cambia sucursal
  useEffect(() => {
    if (cashRegisters.length > 0) {
      setSelectedRegisterId(cashRegisters[0].id);
    } else {
      setSelectedRegisterId("");
    }
  }, [cashRegisters]);

  async function handleOpen() {
    if (!selectedBranchId || !selectedRegisterId) {
      toast.error("Selecciona una sucursal y una caja registradora");
      return;
    }

    setOpening(true);
    try {
      await cashSessionsService.openSession({
        branch_id: selectedBranchId,
        cash_register_id: selectedRegisterId,
        opening_amount: Number(openingAmount) || 0,
        notes: notes || null,
      });

      await mutate();
      setOpened(true);
      toast.success("Caja abierta exitosamente");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al abrir la caja",
      );
    } finally {
      setOpening(false);
    }
  }

  const selectedRegister = cashRegisters.find(
    (cr) => cr.id === selectedRegisterId,
  );

  if (opened || (!loadingSession && activeSession)) {
    return (
      <div className="container max-w-lg py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Caja abierta
            </CardTitle>
            <CardDescription>
              La sesión de caja está activa. Puedes comenzar a registrar cobros.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSession && (
              <div className="rounded-md border p-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Abierta el</span>
                  <span>
                    {new Date(activeSession.opened_at).toLocaleString("es-VE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fondo inicial</span>
                  <span>{Number(activeSession.opening_amount).toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  const slug = tenant?.slug;
                  router.push(`/t/${slug}/cash-register`);
                }}
              >
                Ir a Caja
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-lg py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Apertura de Caja
          </CardTitle>
          <CardDescription>
            Registra el fondo inicial para comenzar el turno.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Sucursal */}
          <div className="space-y-1.5">
            <Label>Sucursal</Label>
            {loadingBranches ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                value={selectedBranchId}
                onValueChange={setSelectedBranchId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Caja registradora */}
          <div className="space-y-1.5">
            <Label>Caja registradora</Label>
            {loadingRegisters ? (
              <Skeleton className="h-9 w-full" />
            ) : cashRegisters.length === 0 && selectedBranchId ? (
              <p className="text-sm text-destructive">
                No hay cajas activas para esta sucursal.
              </p>
            ) : (
              <Select
                value={selectedRegisterId}
                onValueChange={setSelectedRegisterId}
                disabled={!selectedBranchId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona caja" />
                </SelectTrigger>
                <SelectContent>
                  {cashRegisters.map((cr) => (
                    <SelectItem key={cr.id} value={cr.id}>
                      {cr.name} ({cr.currency_iso})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator />

          {/* Monto inicial */}
          <div className="space-y-1.5">
            <Label>
              Fondo inicial
              {selectedRegister && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({selectedRegister.currency_iso})
                </span>
              )}
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-9"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Efectivo disponible al iniciar el turno (puede ser 0).
            </p>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label>
              Observaciones{" "}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <Textarea
              placeholder="Notas del turno..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Alerta si ya hay sesión abierta (estado intermedio mientras carga) */}
          {loadingSession && (
            <div className="h-9 rounded-md border bg-muted animate-pulse" />
          )}

          {!loadingSession && activeSession && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ya existe una sesión de caja abierta para esta sucursal.
              </AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full gap-2"
            onClick={handleOpen}
            disabled={
              opening ||
              loadingSession ||
              !!activeSession ||
              !selectedBranchId ||
              !selectedRegisterId
            }
          >
            {opening && <Loader2 className="h-4 w-4 animate-spin" />}
            Abrir caja
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
