// src/components/specialists/reset-password-dialog.tsx
"use client";

import { useState } from "react";
import { Copy, Check, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { specialistsService } from "@/lib/services/specialists";

interface ResetPasswordDialogProps {
  specialistId: string;
  specialistName: string;
  specialistEmail: string;
  trigger?: React.ReactNode;
}

export function ResetPasswordDialog({
  specialistId,
  specialistName,
  specialistEmail,
  trigger,
}: ResetPasswordDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [customPassword, setCustomPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Estado para mostrar credenciales después de resetear
  const [newCredentials, setNewCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const handleReset = async () => {
    if (useCustomPassword && customPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setIsLoading(true);
    try {
      const result = await specialistsService.resetPassword(
        specialistId,
        useCustomPassword ? customPassword : undefined
      );

      setNewCredentials({
        email: result.email,
        password: result.password,
      });

      toast.success("Contraseña actualizada");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al resetear contraseña"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!newCredentials) return;

    const text = `Email: ${newCredentials.email}\nNueva contraseña: ${newCredentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credenciales copiadas");

    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setIsOpen(false);
    setNewCredentials(null);
    setCustomPassword("");
    setShowPassword(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <KeyRound className="h-4 w-4 mr-2" />
            Resetear contraseña
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {!newCredentials ? (
          <>
            <DialogHeader>
              <DialogTitle>Resetear contraseña</DialogTitle>
              <DialogDescription>
                Generar una nueva contraseña para{" "}
                <strong>{specialistName}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="cursor-pointer">Generar automáticamente</Label>
                  <p className="text-sm text-muted-foreground">
                    {useCustomPassword
                      ? "Proporcionarás una contraseña"
                      : "Se generará una contraseña segura"}
                  </p>
                </div>
                <Switch
                  checked={!useCustomPassword}
                  onCheckedChange={(checked) => setUseCustomPassword(!checked)}
                />
              </div>

              {useCustomPassword && (
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
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
                  El especialista deberá usar la nueva contraseña la próxima vez
                  que inicie sesión.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleReset} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Reseteando...
                  </>
                ) : (
                  "Resetear contraseña"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>✅ Contraseña actualizada</DialogTitle>
              <DialogDescription>
                Guarda estas credenciales de forma segura
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-mono text-sm">{newCredentials.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Nueva contraseña
                  </Label>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm flex-1">
                      {showPassword
                        ? newCredentials.password
                        : "••••••••••••"}
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