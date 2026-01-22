// src/app/api/specialists/[id]/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSB } from "@/lib/supabase/server";
import {
    supabaseAdmin,
    updateAuthUser,
    generateTempPassword,
} from "@/lib/supabase/admin";

interface ResetPasswordBody {
    password?: string; // Si no se proporciona, se genera una
}

/**
 * POST /api/specialists/[id]/reset-password
 * Resetear la contraseña de un especialista
 */
export async function POST(
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
        const body: ResetPasswordBody = await request.json().catch(() => ({}));

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

        // 2. Verificar permisos (owner, admin, o el propio especialista)
        const { data: membership, error: mErr } = await supabaseAdmin
            .from("tenant_users")
            .select("role")
            .eq("auth_user_id", currentUser.id)
            .eq("tenant_id", specialist.tenant_id)
            .single();

        const canReset =
            currentUser.id === specialistId ||
            (!!membership && ["owner", "admin"].includes(membership.role));

        if (!canReset) {
            return NextResponse.json(
                { error: "No tienes permisos para cambiar esta contraseña" },
                { status: 403 }
            );
        }

        // 3. Generar o usar contraseña proporcionada
        const password = body.password || generateTempPassword();
        const isGenerated = !body.password;

        // 4. Validar longitud mínima
        if (password.length < 8) {
            return NextResponse.json(
                { error: "La contraseña debe tener al menos 8 caracteres" },
                { status: 400 }
            );
        }

        // 5. Actualizar en auth.users
        try {
            await updateAuthUser(specialistId, { password });
        } catch (error) {
            console.error("Error updating password:", error);
            return NextResponse.json(
                {
                    error: `Error al cambiar contraseña: ${(error as Error).message}`,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: isGenerated
                ? "Contraseña temporal generada"
                : "Contraseña actualizada",
            credentials: {
                email: specialist.email,
                password: password,
                isGenerated: isGenerated,
            },
        });
    } catch (error) {
        console.error("Error in POST /api/specialists/[id]/reset-password:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
