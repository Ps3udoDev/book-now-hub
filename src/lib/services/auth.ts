import { createBrowserSB } from "@/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { GlobalUser, TenantUser, Tenant } from "@/types";

export interface GlobalAuthContext {
    type: "global";
    session: Session;
    user: User;
    globalUser: GlobalUser;
}

export interface TenantAuthContext {
    type: "tenant";
    session: Session;
    user: User;
    tenantUser: TenantUser;
    tenant: Tenant;
}

export type AuthContext = GlobalAuthContext | TenantAuthContext | null;

class AuthService {
    private supabase = createBrowserSB();

    async signInWithPassword(email: string, password: string) {
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return data;
    }

    async signOut() {
        const { error } = await this.supabase.auth.signOut();
        if (error) throw error;
    }

    async getSession() {
        const { data, error } = await this.supabase.auth.getSession();
        if (error) throw error;
        return data.session;
    }

    async getUser() {
        const { data, error } = await this.supabase.auth.getUser();
        if (error) throw error;
        return data.user;
    }

    async loadGlobalAuthContext(): Promise<GlobalAuthContext | null> {
        try {
            const session = await this.getSession();
            if (!session) return null;

            const user = session.user;

            const { data: globalUser, error } = await this.supabase
                .from("global_users")
                .select("*")
                .eq("auth_user_id", user.id)
                .single();

            if (error || !globalUser) {
                console.warn("Usuario no es global admin:", error?.message);
                return null;
            }

            return {
                type: "global",
                session,
                user,
                globalUser,
            };
        } catch (error) {
            console.error("Error loading global auth context:", error);
            return null;
        }
    }

    async loadTenantAuthContext(
        tenantSlug: string
    ): Promise<TenantAuthContext | null> {
        try {
            const session = await this.getSession();
            if (!session) return null;

            const user = session.user;

            const { data: tenant, error: tenantError } = await this.supabase
                .from("tenants")
                .select("*")
                .eq("slug", tenantSlug)
                .single();

            if (tenantError || !tenant) {
                console.warn("Tenant no encontrado:", tenantSlug);
                return null;
            }

            const { data: tenantUser, error: userError } = await this.supabase
                .from("tenant_users")
                .select("*")
                .eq("auth_user_id", user.id)
                .eq("tenant_id", tenant.id)
                .single();

            if (userError || !tenantUser) {
                console.warn("Usuario no pertenece a este tenant:", userError?.message);
                return null;
            }

            return {
                type: "tenant",
                session,
                user,
                tenantUser,
                tenant,
            };
        } catch (error) {
            console.error("Error loading tenant auth context:", error);
            return null;
        }
    }

    async isGlobalAdmin(): Promise<boolean> {
        const ctx = await this.loadGlobalAuthContext();
        return ctx !== null;
    }

    async belongsToTenant(tenantSlug: string): Promise<boolean> {
        const ctx = await this.loadTenantAuthContext(tenantSlug);
        return ctx !== null;
    }

    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
        return this.supabase.auth.onAuthStateChange(callback);
    }
}

export const authService = new AuthService();