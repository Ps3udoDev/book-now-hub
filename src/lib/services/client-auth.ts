// src/lib/services/client-auth.ts
// Helpers de autenticacion para la app del cliente final (no staff del tenant).
// Cubre: registro con email/password (server-side via /api/client/auth/register),
// login con password, OAuth Google, password reset y signOut.
import { createBrowserSB } from "@/lib/supabase/client";
import type { Customer } from "@/types";

export interface RegisterPayload {
  tenant_slug: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  phone_country_code?: string | null;
  preferred_language?: string | null;
  preferred_currency?: string | null;
  marketing_consent?: boolean;
}

export interface RegisterResponse {
  success: boolean;
  user_id: string;
  customer_id: string;
  already_existed: boolean;
  verification_required: boolean;
}

export interface OnboardingPayload {
  tenant_slug: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string | null;
  phone_country_code?: string | null;
  preferred_language?: string | null;
  preferred_currency?: string | null;
  marketing_consent?: boolean;
  preferred_branch_id?: string | null;
}

class ClientAuthService {
  private supabase = createBrowserSB();

  /**
   * Registra al cliente: crea auth.user + customer en el tenant indicado.
   * Supabase enviara email de verificacion automaticamente.
   */
  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    const response = await fetch("/api/client/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Error al registrarse");
    }
    return data as RegisterResponse;
  }

  /**
   * Login con email + password. Funciona para clientes ya registrados.
   */
  async signInWithPassword(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  /**
   * Inicia el flujo OAuth con Google. Supabase redirige a Google y
   * vuelve al callback indicado. El callback intercambia el code y
   * crea/vincula el customer si trae `?tenant=<slug>`.
   */
  async signInWithGoogle(tenantSlug: string, nextPath?: string) {
    const origin = window.location.origin;
    const params = new URLSearchParams({ tenant: tenantSlug });
    if (nextPath) params.set("next", nextPath);

    const redirectTo = `${origin}/auth/callback?${params.toString()}`;

    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) throw error;
  }

  /**
   * Envia email de reset de password. La URL de redireccion final
   * la define el frontend cuando el cliente clickea el enlace.
   */
  async requestPasswordReset(email: string, redirectTo: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  }

  /**
   * Actualiza la password tras llegar desde el email de reset
   * (la sesion ya esta activa cuando se llama).
   */
  async updatePassword(newPassword: string) {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  }

  /**
   * Reenvia el correo de verificacion de email.
   */
  async resendVerification(email: string) {
    const { error } = await this.supabase.auth.resend({
      type: "signup",
      email,
    });
    if (error) throw error;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * Completa el onboarding del cliente (3.2: pantalla post-registro).
   */
  async completeOnboarding(payload: OnboardingPayload): Promise<Customer> {
    const { tenant_slug, ...rest } = payload;
    const response = await fetch(
      `/api/client/auth/onboarding?tenant=${encodeURIComponent(tenant_slug)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Error al completar onboarding");
    }
    return data.customer as Customer;
  }
}

export const clientAuthService = new ClientAuthService();
