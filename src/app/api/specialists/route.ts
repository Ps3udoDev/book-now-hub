// src/app/api/specialists/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSB } from "@/lib/supabase/server";
import {
    supabaseAdmin,
    createAuthUser,
    generateTempPassword,
    getAuthUserByEmail,
} from "@/lib/supabase/admin";

interface CreateSpecialistBody {
    tenant_id: string;
    branch_id?: string | null;
    full_name: string;
    email: string;
    phone?: string | null;
    password?: string;
    avatar_url?: string | null;
    role?: "owner" | "admin" | "manager" | "employee";
    specialties?: string[];
    bio?: string | null;
    commission_type?: "percentage" | "fixed" | "mixed" | null;
    commission_percentage?: number;
    commission_fixed?: number;
    is_active?: boolean;
}

/**
 * POST /api/specialists
 * Crear un nuevo especialista con cuenta en auth.users
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Verificar autenticación
        const supabase = await createServerSB();
        const {
            data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // 2. Obtener datos del body
        const body: CreateSpecialistBody = await request.json();

        // 3. Validar campos requeridos
        if (!body.tenant_id || !body.email || !body.full_name) {
            return NextResponse.json(
                { error: "Faltan campos requeridos: tenant_id, email, full_name" },
                { status: 400 }
            );
        }

        // 4. Verificar permisos del usuario actual (debe ser owner o admin del tenant)

        const { data: currentProfile } = await supabaseAdmin
            .from("tenant_users")
            .select("role")
            .eq("auth_user_id", currentUser.id)
            .eq("tenant_id", body.tenant_id)
            .single();

        console.log("currentProfile", currentProfile);

        if (!currentProfile || !["owner", "admin"].includes(currentProfile.role)) {
            return NextResponse.json(
                { error: "No tienes permisos para crear especialistas en este tenant" },
                { status: 403 }
            );
        }

        // 5. Verificar si ya existe un usuario con ese email
        const existingAuthUser = await getAuthUserByEmail(body.email);

        if (existingAuthUser) {
            // Verificar si ya tiene perfil en este tenant
            const { data: existingProfile } = await supabaseAdmin
                .from("profiles")
                .select("id")
                .eq("id", existingAuthUser.id)
                .eq("tenant_id", body.tenant_id)
                .single();

            if (existingProfile) {
                return NextResponse.json(
                    { error: "Ya existe un especialista con este email en el tenant" },
                    { status: 409 }
                );
            }

            return NextResponse.json(
                {
                    error: "Este email ya está registrado en el sistema",
                    code: "EMAIL_EXISTS",
                },
                { status: 409 }
            );
        }

        // 6. Generar contraseña si no se proporciona
        const password = body.password || generateTempPassword();
        const isPasswordGenerated = !body.password;

        // 7. Crear usuario en auth.users
        let authUser;
        try {
            authUser = await createAuthUser(body.email.toLowerCase(), password, {
                full_name: body.full_name,
                tenant_id: body.tenant_id,
                user_type: "staff",
            });
        } catch (error) {
            console.error("Error creating auth user:", error);
            return NextResponse.json(
                { error: `Error al crear usuario: ${(error as Error).message}` },
                { status: 500 }
            );
        }

        // 8. Crear perfil en profiles
        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .insert({
                id: authUser.id,
                tenant_id: body.tenant_id,
                branch_id: body.branch_id || null,
                full_name: body.full_name.trim(),
                email: body.email.toLowerCase().trim(),
                phone: body.phone || null,
                avatar_url: body.avatar_url || null,
                role: body.role || "employee",
                is_specialist: true,
                specialties: body.specialties || [],
                bio: body.bio || null,
                commission_type: body.commission_type || "percentage",
                commission_percentage: body.commission_percentage ?? 0,
                commission_fixed: body.commission_fixed ?? 0,
                rating: 0,
                total_ratings: 0,
                is_active: body.is_active ?? true,
            })
            .select()
            .single();

        if (profileError) {
            console.error("Error creating profile:", profileError);
            // Rollback: eliminar auth.user
            await supabaseAdmin.auth.admin.deleteUser(authUser.id);
            return NextResponse.json(
                { error: `Error al crear perfil: ${profileError.message}` },
                { status: 500 }
            );
        }

        // 9. Crear relación en tenant_users (si existe la tabla)
        try {
            await supabaseAdmin.from("tenant_users").insert({
                tenant_id: body.tenant_id,
                auth_user_id: authUser.id,
                email: body.email.toLowerCase().trim(),
                full_name: body.full_name.trim(),
                role: body.role || "employee",
                is_active: true,
            });
        } catch {
            // Si falla, no es crítico - la tabla puede no existir
            console.warn("Could not insert into tenant_users");
        }

        // 10. Retornar respuesta exitosa
        return NextResponse.json({
            success: true,
            specialist: profile,
            credentials: isPasswordGenerated
                ? {
                    email: body.email.toLowerCase(),
                    password: password,
                    message:
                        "Contraseña temporal generada. El usuario debe cambiarla al iniciar sesión.",
                }
                : null,
        });
    } catch (error) {
        console.error("Unexpected error in POST /api/specialists:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/specialists
 * Listar especialistas de un tenant (opcional, puede usarse directo a Supabase)
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSB();
        const {
            data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get("tenant_id");

        if (!tenantId) {
            return NextResponse.json(
                { error: "tenant_id es requerido" },
                { status: 400 }
            );
        }

        const { data: specialists, error } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("is_specialist", true)
            .order("full_name", { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ specialists });
    } catch (error) {
        console.error("Error in GET /api/specialists:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
