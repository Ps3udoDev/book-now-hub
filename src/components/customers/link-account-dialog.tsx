// src/components/customers/link-account-dialog.tsx
"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
  Link,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Tables } from "@/types";

type Customer = Tables["customers"]["Row"];

interface LinkAccountDialogProps {
  customer: Customer;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function LinkAccountDialog({
  customer,
  onSuccess,
  trigger,
}: LinkAccountDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [customPassword, setCustomPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Estado para mostrar credenciales
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const hasAccount = !!customer.user_id;

  const handleCreateAccount = async () => {
    if (!customer.email) {
      toast.error("El cliente debe tener email para crear cuenta");
      return;
    }

    if (useCustomPassword && customPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/customers/${customer.id}/link-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: useCustomPassword ? customPassword : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al crear cuenta");
      }

      if (result.credentials) {
        setCredentials({
          email: result.credentials.email,
          password: result.credentials.password,
        });
      } else {
        toast.success(result.message || "Cuenta creada exitosamente");
        setIsOpen(false);
        onSuccess();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al crear cuenta"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!credentials) return;

    const text = `Email: ${credentials.email}\nContraseña: ${credentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credenciales copiadas");

    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setIsOpen(false);
    setCredentials(null);
    setCustomPassword("");
    setShowPassword(false);
    if (credentials) onSuccess();
  };

  // Si ya tiene cuenta, mostrar estado
  if (hasAccount) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Link className="h-3 w-3" />
          Cuenta vinculada
        </Badge>
        <UnlinkAccountDialog customer={customer} onSuccess={onSuccess} />
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Crear cuenta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {!credentials ? (
          <>
            <DialogHeader>
              <DialogTitle>Crear cuenta para cliente</DialogTitle>
              <DialogDescription>
                {customer.full_name} podrá iniciar sesión en la app/e-commerce
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm">
                  <strong>Email:</strong> {customer.email}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="cursor-pointer">Generar contraseña</Label>
                  <p className="text-sm text-muted-foreground">
                    {useCustomPassword
                      ? "Proporcionarás una contraseña"
                      : "Se generará automáticamente"}
                  </p>
                </div>
                <Switch
                  checked={!useCustomPassword}
                  onCheckedChange={(checked) => setUseCustomPassword(!checked)}
                />
              </div>

              {useCustomPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <Alert>
                <AlertDescription className="text-sm">
                  Con una cuenta, el cliente podrá ver su historial de citas,
                  hacer reservas online y acceder al e-commerce.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAccount} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear cuenta"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>✅ Cuenta creada</DialogTitle>
              <DialogDescription>
                Comparte estas credenciales con el cliente
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-mono text-sm">{credentials.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Contraseña
                  </Label>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm flex-1">
                      {showPassword ? credentials.password : "••••••••••••"}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleCopy} className="gap-2">
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </Button>
              <Button onClick={handleClose}>Cerrar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Componente para desvincular cuenta
interface UnlinkAccountDialogProps {
  customer: Customer;
  onSuccess: () => void;
}

function UnlinkAccountDialog({ customer, onSuccess }: UnlinkAccountDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlink = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/customers/${customer.id}/link-account`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al desvincular");
      }

      toast.success("Cuenta desvinculada");
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al desvincular"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">
          <Unlink className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desvincular cuenta?</AlertDialogTitle>
          <AlertDialogDescription>
            {customer.full_name} ya no podrá iniciar sesión en la app/e-commerce.
            El registro del cliente se mantendrá, solo se quita el acceso.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleUnlink}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Desvinculando..." : "Desvincular"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}