# Recovery de contraseña + Magic Link — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar recovery de contraseña y magic link (login sin contraseña) en las tres superficies de auth: admin global, tenant (staff/admin/especialista) y cliente final.

**Architecture:** Todo se apoya en Supabase Auth nativo (`resetPasswordForEmail`, `signInWithOtp`, `updateUser`) sin cambios de esquema. Se extienden los servicios existentes (`authService`, `clientAuthService`), se agregan páginas forgot/reset para admin y tenant (el cliente ya las tiene), y un toggle "Contraseña ⇄ Enlace mágico" en los tres logins. Los emails de admin/tenant pasan por el callback server-side existente (`/auth/callback?next=...`).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Supabase Auth (`@supabase/ssr`), shadcn/Radix (admin/tenant UI), componentes `Client*` themed (cliente), Zod, Sonner, Biome.

## Global Constraints

- No hay test runner en el repo. La verificación de cada task es: `npx tsc --noEmit` (tipos), `npx biome check --write <archivos>` (lint/format) y verificación manual del flujo en navegador. `npm run build` es el check autoritativo al final.
- Comentarios de código en español.
- No cambios de esquema en la base de datos.
- Toasts vía Sonner: `import { toast } from "sonner"`.
- Magic link SIEMPRE con `shouldCreateUser: false` (no crear cuentas nuevas).
- Mensaje neutro tras enviar recovery/magic link: "Si la cuenta existe, recibirás un correo en breve." (no revelar existencia de cuenta).
- Longitud mínima de contraseña nueva: 8 caracteres.
- **Commits:** el usuario suele hacer los commits de implementación. Los pasos "Commit" del plan quedan como referencia; al ejecutar, dejar los cambios staged y confirmar con el usuario si commitea él o lo hace el ejecutor.
- Proyecto Supabase remoto linkeado: ref `rrnysepngbycvuciodoj`. Dominio prod: `https://book-now-hub.vercel.app`.

---

## Estructura de archivos

**Modificar:**
- `src/lib/services/auth.ts` — agregar `requestPasswordReset`, `updatePassword`, `sendMagicLink`.
- `src/lib/services/client-auth.ts` — agregar `sendMagicLink`.
- `src/lib/validations/auth.ts` — agregar `resetPasswordSchema` + `ResetPasswordFormData`.
- `src/middleware.ts` — agregar `/reset-password` a rutas públicas de admin y tenant.
- `src/app/(root)/login/page.tsx` — toggle magic link.
- `src/app/t/[tenant]/login/page.tsx` — toggle magic link.
- `src/app/c/[tenant]/login/page.tsx` — toggle magic link.
- `supabase/config.toml` — allowlist local (paridad dev).

**Crear:**
- `src/app/(root)/forgot-password/page.tsx`
- `src/app/(root)/reset-password/page.tsx`
- `src/app/t/[tenant]/forgot-password/page.tsx`
- `src/app/t/[tenant]/reset-password/page.tsx`
- `docs/superpowers/context/2026-07-12-recovery-magic-link.md` (handoff final)

---

## Task 1: Capa de servicios + validación

**Files:**
- Modify: `src/lib/services/auth.ts`
- Modify: `src/lib/services/client-auth.ts`
- Modify: `src/lib/validations/auth.ts`

**Interfaces:**
- Produces:
  - `authService.requestPasswordReset(email: string, redirectTo: string): Promise<void>`
  - `authService.updatePassword(newPassword: string): Promise<void>`
  - `authService.sendMagicLink(email: string, emailRedirectTo: string): Promise<void>`
  - `clientAuthService.sendMagicLink(email: string, emailRedirectTo: string): Promise<void>`
  - `resetPasswordSchema` (Zod) y `ResetPasswordFormData` en `@/lib/validations/auth`

- [ ] **Step 1: Agregar métodos a `authService`**

En `src/lib/services/auth.ts`, dentro de la clase `AuthService` (después del método `signOut()`, antes de `getSession()`), agregar:

```ts
    /**
     * Envia email de recovery de contraseña. `redirectTo` define a dónde
     * aterriza el usuario tras clickear el enlace (pasa por /auth/callback).
     */
    async requestPasswordReset(email: string, redirectTo: string) {
        const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
            redirectTo,
        });
        if (error) throw error;
    }

    /**
     * Actualiza la contraseña del usuario autenticado (sesión de recovery activa).
     */
    async updatePassword(newPassword: string) {
        const { error } = await this.supabase.auth.updateUser({
            password: newPassword,
        });
        if (error) throw error;
    }

    /**
     * Envia un magic link (login sin contraseña). Restringido a cuentas
     * existentes: no crea usuarios nuevos.
     */
    async sendMagicLink(email: string, emailRedirectTo: string) {
        const { error } = await this.supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo, shouldCreateUser: false },
        });
        if (error) throw error;
    }
```

- [ ] **Step 2: Agregar `sendMagicLink` a `clientAuthService`**

En `src/lib/services/client-auth.ts`, dentro de la clase `ClientAuthService`, después del método `updatePassword(...)`, agregar:

```ts
  /**
   * Envia un magic link al cliente (login sin contraseña). El callback
   * (/auth/callback?tenant=<slug>) vincula el customer si hace falta.
   * Restringido a cuentas existentes.
   */
  async sendMagicLink(email: string, emailRedirectTo: string) {
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo, shouldCreateUser: false },
    });
    if (error) throw error;
  }
```

- [ ] **Step 3: Agregar `resetPasswordSchema` a validaciones**

En `src/lib/validations/auth.ts`, al final del archivo (después de `ForgotPasswordFormData`), agregar:

```ts
export const resetPasswordSchema = z
    .object({
        password: z
            .string()
            .min(1, "La contraseña es requerida")
            .min(8, "La contraseña debe tener al menos 8 caracteres"),
        confirmPassword: z.string().min(1, "Confirma tu contraseña"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Las contraseñas no coinciden",
        path: ["confirmPassword"],
    });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
```

- [ ] **Step 4: Verificar tipos y lint**

Run:
```bash
npx tsc --noEmit
npx biome check --write src/lib/services/auth.ts src/lib/services/client-auth.ts src/lib/validations/auth.ts
```
Expected: `tsc` sin errores; biome sin errores (auto-formatea).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/auth.ts src/lib/services/client-auth.ts src/lib/validations/auth.ts
git commit -m "feat(auth): servicios de recovery y magic link + resetPasswordSchema"
```

---

## Task 2: Middleware — rutas públicas `/reset-password`

**Files:**
- Modify: `src/middleware.ts`

**Interfaces:**
- Produces: rutas `/reset-password` (admin) y `/t/<slug>/reset-password` (tenant) accesibles sin sesión previa.

- [ ] **Step 1: Agregar `/reset-password` a `ADMIN_ROUTES`**

En `src/middleware.ts`, en el array `ADMIN_ROUTES`, agregar `"/reset-password"` justo después de `"/forgot-password"`:

```ts
const ADMIN_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/tenants",
  "/modules",
  "/templates",
  "/themes",
  "/users",
  "/settings",
];
```

- [ ] **Step 2: Agregar `/reset-password` a `adminAuthPaths`**

En la sección "3. RUTAS DE ADMIN", cambiar:

```ts
    const adminAuthPaths = ["/login", "/register", "/forgot-password"];
```
por:
```ts
    const adminAuthPaths = [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
    ];
```

- [ ] **Step 3: Agregar `/reset-password` a `tenantPublicPaths`**

En la sección "2. RUTAS DE TENANT", cambiar:

```ts
    const tenantPublicPaths = [
      "/login",
      "/register",
      "/forgot-password",
      "/productos",
    ];
```
por:
```ts
    const tenantPublicPaths = [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/productos",
    ];
```

- [ ] **Step 4: Verificar tipos y lint**

Run:
```bash
npx tsc --noEmit
npx biome check --write src/middleware.ts
```
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(auth): rutas publicas /reset-password para admin y tenant"
```

---

## Task 3: Páginas de recovery del admin global

**Files:**
- Create: `src/app/(root)/forgot-password/page.tsx`
- Create: `src/app/(root)/reset-password/page.tsx`

**Interfaces:**
- Consumes: `authService.requestPasswordReset`, `authService.updatePassword` (Task 1); `resetPasswordSchema` (Task 1).

- [ ] **Step 1: Crear `src/app/(root)/forgot-password/page.tsx`**

```tsx
// src/app/(root)/forgot-password/page.tsx
"use client";

import { Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/services/auth";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      await authService.requestPasswordReset(email, redirectTo);
      setSent(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo enviar el correo",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="fixed top-4 right-4">
        <ThemeToggle variant="dropdown" />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                BN
              </span>
            </div>
            <span className="font-bold text-xl">Book Now Hub</span>
          </Link>
          <p className="text-muted-foreground mt-2">Panel de administración</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              Recuperar contraseña
            </CardTitle>
            <CardDescription className="text-center">
              Te enviaremos un enlace para restablecerla.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {sent ? (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                Si la cuenta existe, recibirás un correo en breve.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@tudominio.com"
                    autoComplete="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Enviar enlace
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              <Link
                href="/login"
                className="hover:text-primary transition-colors"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear `src/app/(root)/reset-password/page.tsx`**

```tsx
// src/app/(root)/reset-password/page.tsx
// El usuario llega aquí desde el email de recovery con una sesión activa.
"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/shared";
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
import { authService } from "@/lib/services/auth";
import { resetPasswordSchema } from "@/lib/validations/auth";

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    setSaving(true);
    try {
      await authService.updatePassword(password);
      toast.success("Contraseña actualizada");
      router.replace("/tenants");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar la contraseña",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="fixed top-4 right-4">
        <ThemeToggle variant="dropdown" />
      </div>

      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              Nueva contraseña
            </CardTitle>
            <CardDescription className="text-center">
              Define una contraseña segura (mínimo 8 caracteres).
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  disabled={saving}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  disabled={saving}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Cambiar contraseña"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar tipos y lint**

Run:
```bash
npx tsc --noEmit
npx biome check --write "src/app/(root)/forgot-password/page.tsx" "src/app/(root)/reset-password/page.tsx"
```
Expected: sin errores.

- [ ] **Step 4: Verificación manual (navegador)**

Con `npm run dev`, ir a `/login` → clic en "¿Olvidaste tu contraseña?" → carga `/forgot-password`. Enviar un email → aparece el mensaje neutro. (El flujo completo del email se prueba en la QA final, tras configurar redirect URLs en Task 8.)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(root)/forgot-password/page.tsx" "src/app/(root)/reset-password/page.tsx"
git commit -m "feat(auth): paginas de recovery de contraseña del admin global"
```

---

## Task 4: Páginas de recovery del tenant

**Files:**
- Create: `src/app/t/[tenant]/forgot-password/page.tsx`
- Create: `src/app/t/[tenant]/reset-password/page.tsx`

**Interfaces:**
- Consumes: `authService.requestPasswordReset`, `authService.updatePassword`, `resetPasswordSchema` (Task 1).

- [ ] **Step 1: Crear `src/app/t/[tenant]/forgot-password/page.tsx`**

```tsx
// src/app/t/[tenant]/forgot-password/page.tsx
"use client";

import { Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/services/auth";

export default function TenantForgotPasswordPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/t/${tenantSlug}/reset-password`;
      await authService.requestPasswordReset(email, redirectTo);
      setSent(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo enviar el correo",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md p-8">
        <div className="bg-card rounded-lg border shadow-sm p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
            <p className="text-muted-foreground mt-1">
              Te enviaremos un enlace para restablecerla.
            </p>
          </div>

          {sent ? (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              Si la cuenta existe, recibirás un correo en breve.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar enlace
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <Link
              href={`/t/${tenantSlug}/login`}
              className="text-muted-foreground hover:text-foreground"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear `src/app/t/[tenant]/reset-password/page.tsx`**

```tsx
// src/app/t/[tenant]/reset-password/page.tsx
// El staff llega aquí desde el email de recovery con una sesión activa.
"use client";

import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/services/auth";
import { resetPasswordSchema } from "@/lib/validations/auth";

export default function TenantResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    setSaving(true);
    try {
      await authService.updatePassword(password);
      toast.success("Contraseña actualizada");
      router.replace(`/t/${tenantSlug}/login`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar la contraseña",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md p-8">
        <div className="bg-card rounded-lg border shadow-sm p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Nueva contraseña</h1>
            <p className="text-muted-foreground mt-1">
              Define una contraseña segura (mínimo 8 caracteres).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                disabled={saving}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                disabled={saving}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Cambiar contraseña"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar tipos y lint**

Run:
```bash
npx tsc --noEmit
npx biome check --write "src/app/t/[tenant]/forgot-password/page.tsx" "src/app/t/[tenant]/reset-password/page.tsx"
```
Expected: sin errores.

- [ ] **Step 4: Verificación manual (navegador)**

Con `npm run dev`, ir a `/t/<slug>/login` → clic en "¿Olvidaste tu contraseña?" → carga `/t/<slug>/forgot-password`. Enviar email → mensaje neutro.

- [ ] **Step 5: Commit**

```bash
git add "src/app/t/[tenant]/forgot-password/page.tsx" "src/app/t/[tenant]/reset-password/page.tsx"
git commit -m "feat(auth): paginas de recovery de contraseña del tenant"
```

---

## Task 5: Toggle magic link en login del admin global

**Files:**
- Modify: `src/app/(root)/login/page.tsx`

**Interfaces:**
- Consumes: `authService.sendMagicLink` (Task 1).

- [ ] **Step 1: Importar `authService` y `Mail`**

En `src/app/(root)/login/page.tsx`, en el import de lucide agregar `Mail`:

```tsx
import { Loader2, LogOut, AlertCircle, Mail } from "lucide-react";
```
Y agregar el import del servicio (junto a los demás imports de `@/lib`):

```tsx
import { authService } from "@/lib/services/auth";
```

- [ ] **Step 2: Agregar estado del modo + handler de magic link**

Dentro del componente `LoginPage`, después de la declaración de `form` (`const form = useForm...`), agregar:

```tsx
  const [authMode, setAuthMode] = useState<"password" | "magic">("password");
  const [magicEmail, setMagicEmail] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setMagicLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/tenants`;
      await authService.sendMagicLink(magicEmail, redirectTo);
      setMagicSent(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo enviar el enlace",
      );
    } finally {
      setMagicLoading(false);
    }
  };
```

- [ ] **Step 3: Insertar el toggle segmentado antes del `<form ...>` de password**

Dentro de `<CardContent>`, justo antes de `<form onSubmit={form.handleSubmit(onSubmit)} ...>`, insertar el selector de modo:

```tsx
              <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setAuthMode("password")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    authMode === "password"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Contraseña
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("magic")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    authMode === "magic"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Enlace mágico
                </button>
              </div>
```

- [ ] **Step 4: Envolver el form de password y agregar el form de magic link**

Cambiar la apertura del form de password para que solo se muestre en modo password. Reemplazar:

```tsx
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
```
por:
```tsx
            {authMode === "password" && (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
```

Y localizar el cierre de ese form (la línea `</form>` que va justo antes de `</CardContent>`) y reemplazarla por el cierre del form + el bloque condicional del magic link:

```tsx
            </form>
            )}

            {authMode === "magic" && (
              magicSent ? (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                  Si la cuenta existe, recibirás un correo en breve.
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="magic-email">Email</Label>
                    <Input
                      id="magic-email"
                      type="email"
                      placeholder="admin@tudominio.com"
                      autoComplete="email"
                      required
                      disabled={magicLoading}
                      value={magicEmail}
                      onChange={(event) => setMagicEmail(event.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={magicLoading}
                  >
                    {magicLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Enviar enlace mágico
                      </>
                    )}
                  </Button>
                </form>
              )
            )}
```

- [ ] **Step 5: Verificar tipos y lint**

Run:
```bash
npx tsc --noEmit
npx biome check --write "src/app/(root)/login/page.tsx"
```
Expected: sin errores.

- [ ] **Step 6: Verificación manual (navegador)**

`/login` → alternar a "Enlace mágico" → el form muestra solo email → enviar → mensaje neutro. Alternar de vuelta a "Contraseña" → reaparece el form normal.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(root)/login/page.tsx"
git commit -m "feat(auth): toggle de magic link en login del admin global"
```

---

## Task 6: Toggle magic link en login del tenant

**Files:**
- Modify: `src/app/t/[tenant]/login/page.tsx`

**Interfaces:**
- Consumes: `authService.sendMagicLink` (Task 1).

- [ ] **Step 1: Importar `authService`, `toast` y `Mail`**

En `src/app/t/[tenant]/login/page.tsx`:
- En el import de lucide agregar `Mail`:
```tsx
import { Loader2, LogOut, AlertCircle, Mail } from "lucide-react";
```
- Agregar imports:
```tsx
import { toast } from "sonner";
import { authService } from "@/lib/services/auth";
```

- [ ] **Step 2: Agregar estado del modo + handler**

Después de `const [hasAccessToTenant, setHasAccessToTenant] = useState(false);`, agregar:

```tsx
  const [authMode, setAuthMode] = useState<"password" | "magic">("password");
  const [magicEmail, setMagicEmail] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setMagicLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/t/${tenantSlug}/dashboard`;
      await authService.sendMagicLink(magicEmail, redirectTo);
      setMagicSent(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo enviar el enlace",
      );
    } finally {
      setMagicLoading(false);
    }
  };
```

- [ ] **Step 3: Insertar el toggle antes del `<form onSubmit={handleSubmit} ...>`**

Justo antes de `{/* Formulario */}` / `<form onSubmit={handleSubmit} className="space-y-4">`, insertar:

```tsx
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setAuthMode("password")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                authMode === "password"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Contraseña
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("magic")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                authMode === "magic"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Enlace mágico
            </button>
          </div>
```

- [ ] **Step 4: Condicionar el form de password y agregar el de magic link**

Reemplazar la apertura `<form onSubmit={handleSubmit} className="space-y-4">` por:

```tsx
          {authMode === "password" && (
          <form onSubmit={handleSubmit} className="space-y-4">
```

Localizar el `</form>` de ese formulario (el que está antes del bloque `{/* Links adicionales */}`) y reemplazarlo por:

```tsx
          </form>
          )}

          {authMode === "magic" && (
            magicSent ? (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                Si la cuenta existe, recibirás un correo en breve.
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="magic-email">Correo electrónico</Label>
                  <Input
                    id="magic-email"
                    type="email"
                    placeholder="tu@email.com"
                    autoComplete="email"
                    required
                    disabled={magicLoading}
                    value={magicEmail}
                    onChange={(event) => setMagicEmail(event.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={magicLoading}>
                  {magicLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar enlace mágico
                    </>
                  )}
                </Button>
              </form>
            )
          )}
```

- [ ] **Step 5: Verificar tipos y lint**

Run:
```bash
npx tsc --noEmit
npx biome check --write "src/app/t/[tenant]/login/page.tsx"
```
Expected: sin errores.

- [ ] **Step 6: Verificación manual (navegador)**

`/t/<slug>/login` → alternar a "Enlace mágico" → form de email → enviar → mensaje neutro. Volver a "Contraseña" → form normal.

- [ ] **Step 7: Commit**

```bash
git add "src/app/t/[tenant]/login/page.tsx"
git commit -m "feat(auth): toggle de magic link en login del tenant"
```

---

## Task 7: Toggle magic link en login del cliente

**Files:**
- Modify: `src/app/c/[tenant]/login/page.tsx`

**Interfaces:**
- Consumes: `clientAuthService.sendMagicLink` (Task 1).

- [ ] **Step 1: Agregar estado del modo + handler**

En `src/app/c/[tenant]/login/page.tsx`, después de `const [googleLoading, setGoogleLoading] = useState(false);`, agregar:

```tsx
  const [authMode, setAuthMode] = useState<"password" | "magic">("password");
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  const handleMagicLink = async (event: FormEvent) => {
    event.preventDefault();
    setMagicLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?tenant=${tenantSlug}&next=/c/${tenantSlug}`;
      await clientAuthService.sendMagicLink(email, redirectTo);
      setMagicSent(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo enviar el enlace",
      );
    } finally {
      setMagicLoading(false);
    }
  };
```

- [ ] **Step 2: Insertar el toggle dentro del `<form>`, antes del campo email**

Justo después de la apertura `<form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3.5 px-6 pb-8 pt-6">`, insertar el toggle themed:

```tsx
        <div
          className="grid grid-cols-2 gap-1 border border-[var(--client-border)] bg-[var(--client-surface)] p-1"
          style={{ borderRadius: "var(--client-rad-md)" }}
        >
          <button
            type="button"
            onClick={() => setAuthMode("password")}
            className={`py-2 text-[13px] font-semibold transition ${
              authMode === "password"
                ? "bg-[var(--client-primary)] text-[var(--client-primary-fg)]"
                : "text-[var(--client-fg-muted)]"
            }`}
            style={{ borderRadius: "var(--client-rad-sm)" }}
          >
            Contraseña
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("magic")}
            className={`py-2 text-[13px] font-semibold transition ${
              authMode === "magic"
                ? "bg-[var(--client-primary)] text-[var(--client-primary-fg)]"
                : "text-[var(--client-fg-muted)]"
            }`}
            style={{ borderRadius: "var(--client-rad-sm)" }}
          >
            Enlace mágico
          </button>
        </div>
```

- [ ] **Step 3: Condicionar el campo de contraseña y el enlace "¿Olvidaste...?"**

Envolver el `<ClientField>` de la contraseña (el bloque completo `<ClientField icon={<Lock .../>}> ... </ClientField>`) y el `<Link ...>¿Olvidaste tu contraseña?</Link>` con `{authMode === "password" && ( ... )}`. Concretamente, poner justo antes del `<ClientField icon={<Lock ...>`:

```tsx
        {authMode === "password" && (
          <>
```
y justo después del cierre del `<Link ...>¿Olvidaste tu contraseña?</Link>`:

```tsx
          </>
        )}
```

- [ ] **Step 4: Reemplazar el botón submit para que dependa del modo**

Reemplazar el bloque del `<ClientButton type="submit" ...>Iniciar sesión</ClientButton>` por uno que cambie según el modo:

```tsx
        {authMode === "magic" && magicSent ? (
          <div
            className="border border-[var(--client-border)] bg-[var(--client-surface)] p-4 text-sm text-[var(--client-fg)]"
            style={{ borderRadius: "var(--client-rad-md)" }}
          >
            Si la cuenta existe, recibirás un correo en breve.
          </div>
        ) : authMode === "magic" ? (
          <ClientButton
            type="button"
            onClick={handleMagicLink}
            disabled={magicLoading}
            className="h-[52px]"
          >
            {magicLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando…
              </>
            ) : (
              "Enviar enlace mágico"
            )}
          </ClientButton>
        ) : (
          <ClientButton type="submit" disabled={loading} className="h-[52px]">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Iniciando sesión…
              </>
            ) : (
              "Iniciar sesión"
            )}
          </ClientButton>
        )}
```

Nota: `ClientButton` con `type="submit"` no dispara submit del form porque el componente fija `type="button"` por defecto salvo que se pase `type`. En modo magic usamos `onClick={handleMagicLink}` para no depender del submit del form (que llama a `handleSubmit` de password). El campo email requerido `required` solo se valida en submit; en modo magic validar que `email` no esté vacío dentro de `handleMagicLink` si se desea (opcional; el input email ya es `required` y comparte estado).

- [ ] **Step 5: Verificar tipos y lint**

Run:
```bash
npx tsc --noEmit
npx biome check --write "src/app/c/[tenant]/login/page.tsx"
```
Expected: sin errores.

- [ ] **Step 6: Verificación manual (navegador)**

`/c/<slug>/login` → alternar a "Enlace mágico": desaparece el campo contraseña y el enlace de "¿Olvidaste...?"; el botón cambia a "Enviar enlace mágico". Enviar → mensaje neutro. Volver a "Contraseña" → login normal intacto.

- [ ] **Step 7: Commit**

```bash
git add "src/app/c/[tenant]/login/page.tsx"
git commit -m "feat(auth): toggle de magic link en login del cliente"
```

---

## Task 8: Configurar Redirect URLs en Supabase (remoto)

**Files:**
- Modify: `supabase/config.toml` (paridad para dev local)

**Interfaces:**
- Produces: allowlist de Redirect URLs que permite los `redirectTo`/`emailRedirectTo` usados por las tasks 3–7.

> ⚠️ Cambio de configuración remota (outward-facing). Confirmar con el usuario antes de aplicar el PATCH remoto. NO usar `supabase config push` a ciegas: pisaría `site_url` y otros settings del remoto con los valores locales.

- [ ] **Step 1: Actualizar `supabase/config.toml` (dev local)**

En `supabase/config.toml`, sección `[auth]`, reemplazar la línea de `additional_redirect_urls` por:

```toml
additional_redirect_urls = ["http://localhost:3000/**", "https://book-now-hub.vercel.app/**"]
```

- [ ] **Step 2: Leer el allowlist remoto actual (no destructivo)**

Obtener el token de acceso del CLI (ya autenticado). En PowerShell:

```powershell
$token = (Get-Content "$env:USERPROFILE\.supabase\access-token" -ErrorAction SilentlyContinue)
if (-not $token) { $token = $env:SUPABASE_ACCESS_TOKEN }
Invoke-RestMethod -Method Get `
  -Uri "https://api.supabase.com/v1/projects/rrnysepngbycvuciodoj/config/auth" `
  -Headers @{ Authorization = "Bearer $token" } |
  Select-Object site_url, uri_allow_list
```
Expected: imprime `site_url` (debe ser el dominio prod) y `uri_allow_list` actual. Anotar el valor de `uri_allow_list` para fusionar sin perder entradas.

- [ ] **Step 3: Confirmar con el usuario y aplicar el PATCH (merge)**

Mostrar al usuario el `uri_allow_list` actual y el propuesto (actual + las dos wildcards, separadas por coma, sin duplicar). Tras confirmación, aplicar:

```powershell
# Reemplazar <LISTA_FUSIONADA> por el valor acordado (coma-separado, sin duplicados)
$body = @{ uri_allow_list = "<LISTA_FUSIONADA>" } | ConvertTo-Json
Invoke-RestMethod -Method Patch `
  -Uri "https://api.supabase.com/v1/projects/rrnysepngbycvuciodoj/config/auth" `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body $body
```
Expected: respuesta 200 con la config de auth actualizada; `uri_allow_list` incluye ambas wildcards.

- [ ] **Step 4: Verificar**

Repetir el GET del Step 2 y confirmar que `uri_allow_list` contiene `http://localhost:3000/**` y `https://book-now-hub.vercel.app/**`, y que `site_url` sigue siendo el dominio prod (no se tocó).

- [ ] **Step 5: Commit**

```bash
git add supabase/config.toml
git commit -m "chore(auth): redirect URLs para recovery y magic link (dev + prod)"
```

---

## Task 9: QA end-to-end + handoff

**Files:**
- Create: `docs/superpowers/context/2026-07-12-recovery-magic-link.md`

- [ ] **Step 1: Build completo**

Run:
```bash
npm run build
```
Expected: build exitoso sin errores de tipos ni de lint.

- [ ] **Step 2: QA manual de los 6 flujos (con `npm run dev`)**

Verificar y anotar resultado de cada uno:
1. Admin recovery: `/login` → forgot → email → enlace → `/reset-password` → nueva contraseña → `/tenants`.
2. Admin magic link: `/login` → "Enlace mágico" → email → enlace → `/tenants`.
3. Tenant recovery: `/t/<slug>/login` → forgot → email → enlace → `/t/<slug>/reset-password` → nueva contraseña → login → dashboard.
4. Tenant magic link: `/t/<slug>/login` → "Enlace mágico" → email → enlace → `/t/<slug>/dashboard`.
5. Cliente recovery (regresión): `/c/<slug>/forgot-password` → email → `/c/<slug>/reset-password` → nueva contraseña. (Debe seguir funcionando.)
6. Cliente magic link: `/c/<slug>/login` → "Enlace mágico" → email → enlace → `/c/<slug>`.

Verificación negativa: pedir magic link con un email inexistente NO crea cuenta (no llega correo de signup; el usuario ve el mensaje neutro).

- [ ] **Step 3: Escribir el handoff fechado**

Crear `docs/superpowers/context/2026-07-12-recovery-magic-link.md` con la estructura:

```markdown
# Contexto Actual - 2026-07-12

## Estado del Proyecto
Recovery de contraseña + magic link implementados en las 3 superficies (admin, tenant, cliente).

## Tareas Completadas
- Servicios: authService.{requestPasswordReset, updatePassword, sendMagicLink}; clientAuthService.sendMagicLink; resetPasswordSchema.
- Middleware: /reset-password público en admin y tenant.
- Páginas nuevas: (root) forgot/reset; t/[tenant] forgot/reset.
- Toggle magic link en los 3 logins.
- Redirect URLs Supabase: localhost + book-now-hub.vercel.app.

## Decisiones Tomadas
- Especialistas = staff → usan el flujo del tenant (sin ruta propia).
- Emails admin/tenant pasan por /auth/callback?next=...; cliente conserva su patrón directo.
- Magic link con shouldCreateUser:false (no crea cuentas).

## Próximos Pasos
- [Resultado real de la QA de los 6 flujos]
- Confirmar plantillas de email (por ahora las de Supabase por defecto).

## Notas Importantes
- Config remota de Supabase: solo se tocó uri_allow_list (merge), site_url intacto.
```
Rellenar "Próximos Pasos" con el resultado real de la QA del Step 2.

- [ ] **Step 4: Actualizar memoria de sesión**

Agregar una entrada en `~/.claude/projects/.../memory/` sobre esta feature (archivo nuevo `recovery-magic-link.md` + línea en `MEMORY.md`), siguiendo las convenciones del repo.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/context/2026-07-12-recovery-magic-link.md
git commit -m "docs: handoff de recovery + magic link"
```

---

## Self-Review (cobertura vs spec)

- Recovery admin → Task 3 ✓
- Recovery tenant → Task 4 ✓
- Recovery cliente (ya existía) → regresión en Task 9 Step 2.5 ✓
- Magic link admin/tenant/cliente → Tasks 5/6/7 ✓
- Servicios + validación → Task 1 ✓
- Middleware /reset-password → Task 2 ✓
- Flujos de redirección (/auth/callback?next=...) → Tasks 3–7 (redirectTo) ✓
- Config Supabase (localhost + prod, quirúrgico) → Task 8 ✓
- Handoff fechado → Task 9 ✓
- Sin cambios de esquema, magic link shouldCreateUser:false, mensaje neutro, min 8 → Global Constraints + código ✓
