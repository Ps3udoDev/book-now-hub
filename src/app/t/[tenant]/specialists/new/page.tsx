// src/app/t/[tenant]/specialists/new/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SpecialistForm } from "@/components/specialists";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  specialistsService,
  type CreateSpecialistData,
  type CreateSpecialistResult,
} from "@/lib/services/specialists";
import { storageService } from "@/lib/services/storage";
import { useBranches } from "@/hooks/supabase/use-branches";

export default function NewSpecialistPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;
  const { tenant } = useAuthStore();

  // Estado para el diálogo de credenciales
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Estado para contraseña manual
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [customPassword, setCustomPassword] = useState("");

  // Obtener sucursales del tenant con hook
  const { branches } = useBranches(tenant?.id || null);

  const handleSubmit = async (
    data: Omit<CreateSpecialistData, "tenant_id" | "password"> & {
      specialties: string[];
      avatarFile?: File | null;
      avatar_url?: string | null;
    }
  ) => {
    if (!tenant?.id) {
      toast.error("Error: No se pudo identificar el tenant");
      return;
    }

    // Validar contraseña personalizada si se usa
    if (useCustomPassword && customPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    try {
      // Subir avatar si se seleccionó uno
      let avatar_url: string | undefined;
      if (data.avatarFile) {
        const path = storageService.buildPath("specialists", tenant.id, data.avatarFile.name);
        avatar_url = await storageService.uploadImage(data.avatarFile, path);
      }

      const { avatarFile: _af, avatar_url: _au, ...rest } = data;
      const result: CreateSpecialistResult =
        await specialistsService.createSpecialist({
          ...rest,
          tenant_id: tenant.id,
          password: useCustomPassword ? customPassword : undefined,
          ...(avatar_url && { avatar_url }),
        });

      toast.success("Especialista creado exitosamente");

      // Si se generó una contraseña, mostrar el diálogo
      if (result.credentials) {
        setCredentials({
          email: result.credentials.email,
          password: result.credentials.password,
        });
        setShowCredentialsDialog(true);
      } else {
        // Si el usuario proporcionó su propia contraseña, ir directo a la lista
        router.push(`/t/${tenantSlug}/specialists`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al crear el especialista"
      );
      throw error;
    }
  };

  const handleCopyCredentials = () => {
    if (!credentials) return;

    const text = `Email: ${credentials.email}\nContraseña: ${credentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credenciales copiadas al portapapeles");

    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseDialog = () => {
    setShowCredentialsDialog(false);
    setCredentials(null);
    router.push(`/t/${tenantSlug}/specialists`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/t/${tenantSlug}/specialists`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Especialista</h1>
          <p className="text-muted-foreground">
            Registra un nuevo profesional en el equipo
          </p>
        </div>
      </div>

      {/* Opción de contraseña */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credenciales de acceso</CardTitle>
          <CardDescription>
            El especialista usará estas credenciales para iniciar sesión en el
            sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="cursor-pointer">
                Generar contraseña automáticamente
              </Label>
              <p className="text-sm text-muted-foreground">
                {useCustomPassword
                  ? "Proporcionarás una contraseña personalizada"
                  : "Se generará una contraseña segura que deberás compartir"}
              </p>
            </div>
            <Switch
              checked={!useCustomPassword}
              onCheckedChange={(checked) => setUseCustomPassword(!checked)}
            />
          </div>

          {useCustomPassword && (
            <div className="space-y-2">
              <Label htmlFor="customPassword">Contraseña personalizada</Label>
              <div className="relative">
                <Input
                  id="customPassword"
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
              {customPassword && customPassword.length < 8 && (
                <p className="text-sm text-destructive">
                  La contraseña debe tener al menos 8 caracteres
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Información del especialista</CardTitle>
          <CardDescription>Completa los datos del profesional</CardDescription>
        </CardHeader>
        <CardContent>
          <SpecialistForm
            branches={branches}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/t/${tenantSlug}/specialists`)}
          />
        </CardContent>
      </Card>

      {/* Tips */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Importante</AlertTitle>
        <AlertDescription>
          Al crear el especialista, se creará una cuenta de usuario. El
          especialista podrá iniciar sesión en{" "}
          <code className="text-xs bg-muted px-1 rounded">
            /t/{tenantSlug}/login
          </code>{" "}
          con las credenciales proporcionadas.
        </AlertDescription>
      </Alert>

      {/* Diálogo de credenciales */}
      <Dialog
        open={showCredentialsDialog}
        onOpenChange={setShowCredentialsDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🎉 Especialista creado</DialogTitle>
            <DialogDescription>
              Guarda estas credenciales de forma segura. El especialista las
              necesitará para iniciar sesión.
            </DialogDescription>
          </DialogHeader>

          {credentials && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-mono text-sm">{credentials.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Contraseña temporal
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

              <Alert variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Se recomienda que el especialista cambie esta contraseña la
                  primera vez que inicie sesión.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCopyCredentials}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar credenciales
                </>
              )}
            </Button>
            <Button onClick={handleCloseDialog}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}