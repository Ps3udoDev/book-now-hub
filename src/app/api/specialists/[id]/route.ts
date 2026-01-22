// src/app/api/specialists/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSB } from "@/lib/supabase/server";
import {
    supabaseAdmin,
    updateAuthUser,
    deleteAuthUser,
} from "@/lib/supabase/admin";

interface UpdateSpecialistBody {
    branch_id?: string | null;
    full_name?: string;
    email?: string;
    phone?: string | null;
    password?: string;
    avatar_url?: string | null;
    role?: "owner" | "admin" | "manager" | "employee";
    specialties?: string[];
    bio?: string | null;
    commission_type?: "percentage" | "fixed" | "mixed" | null;
    commission_percentage?: number;
    commission_fixed?: number;
    rating?: number;
    total_ratings?: number;
    is_active?: boolean;
}

/**
 * GET /api/specialists/[id]
 * Obtener un especialista por ID
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerSB();
        const {
            data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { id: specialistId } = await params;

        const { data: specialist, error } = await supabaseAdmin
            .from("profiles")
            .select(
                `
        *,
        specialist_services(
          *,
          service:services(*)
        )
      `
            )
            .eq("id", specialistId)
            .eq("is_specialist", true)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Especialista no encontrado" },
                    { status: 404 }
                );
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ specialist });
    } catch (error) {
        console.error("Error in GET /api/specialists/[id]:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/specialists/[id]
 * Actualizar especialista (incluye email/password si se proporcionan)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerSB();
        const {
            data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { id: specialistId } = await params;
        const body: UpdateSpecialistBody = await request.json();

        // 1. Obtener especialista actual
        const { data: existingSpecialist, error: fetchError } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("id", specialistId)
            .eq("is_specialist", true)
            .single();

        console.log("existingSpecialist:", existingSpecialist);

        if (fetchError || !existingSpecialist) {
            return NextResponse.json(
                { error: "Especialista no encontrado" },
                { status: 404 }
            );
        }

        const { data: membership, error: mErr } = await supabaseAdmin
            .from("tenant_users")
            .select("role")
            .eq("auth_user_id", currentUser.id)
            .eq("tenant_id", existingSpecialist.tenant_id)
            .single();

        const canEdit =
            currentUser.id === specialistId ||
            (!!membership && ["owner", "admin"].includes(membership.role));


        if (!canEdit) {
            return NextResponse.json(
                { error: "No tienes permisos para editar este especialista" },
                { status: 403 }
            );
        }

        // 3. Si hay cambio de email o password, actualizar en auth.users
        if (body.email !== undefined || body.password !== undefined) {
            try {
                const authUpdates: { email?: string; password?: string } = {};
                if (body.email) authUpdates.email = body.email.toLowerCase();
                if (body.password) authUpdates.password = body.password;

                await updateAuthUser(specialistId, authUpdates);
            } catch (error) {
                console.error("Error updating auth user:", error);
                return NextResponse.json(
                    {
                        error: `Error al actualizar credenciales: ${(error as Error).message}`,
                    },
                    { status: 500 }
                );
            }
        }

        // 4. Actualizar perfil en profiles
        const updateData: Record<string, unknown> = {};

        const normalizeUuid = (v: unknown) => {
            if (v === undefined) return undefined;
            if (v === null) return null;
            if (typeof v === "string") {
                const t = v.trim();
                if (t === "") return null;
                return t;
            }
            return v;
        };

        if (body.branch_id !== undefined) updateData.branch_id = normalizeUuid(body.branch_id);

        if (body.full_name !== undefined)
            updateData.full_name = body.full_name.trim();
        if (body.email !== undefined)
            updateData.email = body.email.toLowerCase().trim();
        if (body.phone !== undefined) updateData.phone = body.phone;
        if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;
        if (body.role !== undefined) updateData.role = body.role;
        if (body.specialties !== undefined)
            updateData.specialties = body.specialties;
        if (body.bio !== undefined) updateData.bio = body.bio;
        if (body.commission_type !== undefined)
            updateData.commission_type = body.commission_type;
        if (body.commission_percentage !== undefined)
            updateData.commission_percentage = body.commission_percentage;
        if (body.commission_fixed !== undefined)
            updateData.commission_fixed = body.commission_fixed;
        if (body.rating !== undefined) updateData.rating = body.rating;
        if (body.total_ratings !== undefined)
            updateData.total_ratings = body.total_ratings;
        if (body.is_active !== undefined) updateData.is_active = body.is_active;

        const { data: updatedProfile, error: updateError } = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("id", specialistId)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json(
                { error: `Error al actualizar perfil: ${updateError.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            specialist: updatedProfile,
        });
    } catch (error) {
        console.error("Error in PATCH /api/specialists/[id]:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/specialists/[id]
 * Eliminar especialista (soft delete por defecto, hard delete con ?hard=true)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerSB();
        const {
            data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { id: specialistId } = await params;
        const { searchParams } = new URL(request.url);
        const hardDelete = searchParams.get("hard") === "true";

        // 1. Obtener especialista
        const { data: specialist, error: fetchError } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("id", specialistId)
            .eq("is_specialist", true)
            .single();

        if (fetchError || !specialist) {
            return NextResponse.json(
                { error: "Especialista no encontrado" },
                { status: 404 }
            );
        }

        // 2. Verificar permisos (solo owner puede eliminar)
        const { data: membership, error: mErr } = await supabaseAdmin
            .from("tenant_users")
            .select("role")
            .eq("auth_user_id", currentUser.id)
            .eq("tenant_id", specialist.tenant_id)
            .single();

        if (mErr || !membership || membership.role !== "owner") {
            return NextResponse.json(
                { error: "Solo el propietario puede eliminar especialistas" },
                { status: 403 }
            );
        }

        if (hardDelete) {
            // Hard delete: eliminar de profiles y auth.users
            const { error: deleteProfileError } = await supabaseAdmin
                .from("profiles")
                .delete()
                .eq("id", specialistId);

            if (deleteProfileError) {
                return NextResponse.json(
                    { error: `Error al eliminar perfil: ${deleteProfileError.message}` },
                    { status: 500 }
                );
            }

            try {
                await deleteAuthUser(specialistId);
            } catch (error) {
                console.warn("Could not delete auth user:", error);
                // No es crítico si falla, el perfil ya fue eliminado
            }

            return NextResponse.json({
                success: true,
                message: "Especialista eliminado permanentemente",
            });
        } else {
            // Soft delete: solo desactivar
            const { error: updateError } = await supabaseAdmin
                .from("profiles")
                .update({ is_active: false })
                .eq("id", specialistId);

            if (updateError) {
                return NextResponse.json(
                    { error: `Error al desactivar: ${updateError.message}` },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                message: "Especialista desactivado",
            });
        }
    } catch (error) {
        console.error("Error in DELETE /api/specialists/[id]:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
