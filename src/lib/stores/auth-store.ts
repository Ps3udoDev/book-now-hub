import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Session, User } from "@supabase/supabase-js";
import type { GlobalUser, TenantUser, Tenant } from "@/types";
import {
    authService,
    type GlobalAuthContext,
    type TenantAuthContext,
} from "@/lib/services/auth";


type AuthMode = "global" | "tenant" | null;

interface AuthState {
    mode: AuthMode;
    session: Session | null;
    user: User | null;
    loading: boolean;
    error: string | null;
    initialized: boolean;

    globalUser: GlobalUser | null;

    tenantUser: TenantUser | null;
    tenant: Tenant | null;

    isAuthenticated: boolean;
    isGlobalAdmin: boolean;
    isTenantUser: boolean;
}

interface AuthActions {
    hydrateGlobal: () => Promise<boolean>;
    hydrateTenant: (tenantSlug: string) => Promise<boolean>;
    loginGlobal: (email: string, password: string) => Promise<void>;
    loginTenant: (
        email: string,
        password: string,
        tenantSlug: string
    ) => Promise<void>;
    logout: () => Promise<void>;

    setError: (error: string | null) => void;
    clearError: () => void;
    reset: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
    mode: null,
    session: null,
    user: null,
    loading: false,
    error: null,
    initialized: false,

    globalUser: null,
    tenantUser: null,
    tenant: null,

    isAuthenticated: false,
    isGlobalAdmin: false,
    isTenantUser: false,
};

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            ...initialState,

            hydrateGlobal: async () => {
                set({ loading: true, error: null });
                try {
                    const ctx = await authService.loadGlobalAuthContext();

                    if (!ctx) {
                        set({
                            ...initialState,
                            initialized: true,
                        });
                        return false;
                    }

                    set({
                        mode: "global",
                        session: ctx.session,
                        user: ctx.user,
                        globalUser: ctx.globalUser,
                        tenantUser: null,
                        tenant: null,
                        isAuthenticated: true,
                        isGlobalAdmin: true,
                        isTenantUser: false,
                        initialized: true,
                        loading: false,
                    });
                    return true;
                } catch (error) {
                    const message =
                        error instanceof Error ? error.message : "Error al cargar sesión";
                    set({ error: message, loading: false, initialized: true });
                    return false;
                }
            },

            hydrateTenant: async (tenantSlug: string) => {
                set({ loading: true, error: null });
                try {
                    const ctx = await authService.loadTenantAuthContext(tenantSlug);

                    if (!ctx) {
                        set({
                            ...initialState,
                            initialized: true,
                        });
                        return false;
                    }

                    set({
                        mode: "tenant",
                        session: ctx.session,
                        user: ctx.user,
                        globalUser: null,
                        tenantUser: ctx.tenantUser,
                        tenant: ctx.tenant,
                        isAuthenticated: true,
                        isGlobalAdmin: false,
                        isTenantUser: true,
                        initialized: true,
                        loading: false,
                    });
                    return true;
                } catch (error) {
                    const message =
                        error instanceof Error ? error.message : "Error al cargar sesión";
                    set({ error: message, loading: false, initialized: true });
                    return false;
                }
            },

            loginGlobal: async (email: string, password: string) => {
                set({ loading: true, error: null });
                try {
                    await authService.signInWithPassword(email, password);
                    const ctx = await authService.loadGlobalAuthContext();

                    if (!ctx) {
                        await authService.signOut();
                        throw new Error(
                            "No tienes permisos para acceder al panel de administración"
                        );
                    }

                    set({
                        mode: "global",
                        session: ctx.session,
                        user: ctx.user,
                        globalUser: ctx.globalUser,
                        tenantUser: null,
                        tenant: null,
                        isAuthenticated: true,
                        isGlobalAdmin: true,
                        isTenantUser: false,
                        loading: false,
                    });
                } catch (error) {
                    const message =
                        error instanceof Error ? error.message : "Credenciales inválidas";
                    set({ error: message, loading: false });
                    throw error;
                }
            },

            loginTenant: async (
                email: string,
                password: string,
                tenantSlug: string
            ) => {
                set({ loading: true, error: null });
                try {
                    await authService.signInWithPassword(email, password);
                    const ctx = await authService.loadTenantAuthContext(tenantSlug);

                    if (!ctx) {
                        await authService.signOut();
                        throw new Error("No tienes acceso a esta empresa");
                    }

                    set({
                        mode: "tenant",
                        session: ctx.session,
                        user: ctx.user,
                        globalUser: null,
                        tenantUser: ctx.tenantUser,
                        tenant: ctx.tenant,
                        isAuthenticated: true,
                        isGlobalAdmin: false,
                        isTenantUser: true,
                        loading: false,
                    });
                } catch (error) {
                    const message =
                        error instanceof Error ? error.message : "Credenciales inválidas";
                    set({ error: message, loading: false });
                    throw error;
                }
            },

            logout: async () => {
                set({ loading: true, error: null });
                try {
                    await authService.signOut();
                    set({
                        ...initialState,
                        initialized: true,
                    });
                } catch (error) {
                    const message =
                        error instanceof Error ? error.message : "Error al cerrar sesión";
                    set({ error: message, loading: false });
                }
            },

            setError: (error: string | null) => set({ error }),
            clearError: () => set({ error: null }),
            reset: () => set(initialState),
        }),
        {
            name: "auth-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                mode: state.mode,
                globalUser: state.globalUser
                    ? {
                        id: state.globalUser.id,
                        email: state.globalUser.email,
                        full_name: state.globalUser.full_name,
                        role: state.globalUser.role,
                    }
                    : null,
                tenantUser: state.tenantUser
                    ? {
                        id: state.tenantUser.id,
                        email: state.tenantUser.email,
                        full_name: state.tenantUser.full_name,
                        role: state.tenantUser.role,
                    }
                    : null,
                tenant: state.tenant
                    ? {
                        id: state.tenant.id,
                        slug: state.tenant.slug,
                        name: state.tenant.name,
                    }
                    : null,
            }),
        }
    )
);

export const getAuthState = () => useAuthStore.getState();
export const getIsAuthenticated = () => useAuthStore.getState().isAuthenticated;
export const getIsGlobalAdmin = () => useAuthStore.getState().isGlobalAdmin;