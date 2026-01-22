// src/app/api/customers/[id]/reset-password/route.ts
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
 * POST /api/customers/[id]/reset-password
 * Resetear la contraseña de un customer (solo si tiene cuenta vinculada)
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

        const { id: customerId } = await params;
        const body: ResetPasswordBody = await request.json().catch(() => ({}));

        // 1. Obtener customer
        const { data: customer, error: fetchError } = await supabaseAdmin
            .from("customers")
            .select("*")
            .eq("id", customerId)
            .single();

        if (fetchError || !customer) {
            return NextResponse.json(
                { error: "Cliente no encontrado" },
                { status: 404 }
            );
        }

        // 2. Verificar que tenga cuenta vinculada
        if (!customer.user_id) {
            return NextResponse.json(
                { error: "Este cliente no tiene cuenta vinculada. Use 'Crear cuenta' primero." },
                { status: 400 }
            );
        }

        // 3. Verificar permisos (owner, admin, o el propio cliente)
        const { data: currentProfile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", currentUser.id)
            .eq("tenant_id", customer.tenant_id)
            .single();

        const canReset =
            currentUser.id === customer.user_id ||
            (currentProfile && ["owner", "admin"].includes(currentProfile.role));

        if (!canReset) {
            return NextResponse.json(
                { error: "No tienes permisos para cambiar esta contraseña" },
                { status: 403 }
            );
        }

        // 4. Generar o usar contraseña proporcionada
        const password = body.password || generateTempPassword();
        const isGenerated = !body.password;

        // 5. Validar longitud mínima
        if (password.length < 8) {
            return NextResponse.json(
                { error: "La contraseña debe tener al menos 8 caracteres" },
                { status: 400 }
            );
        }

        // 6. Actualizar en auth.users usando el user_id del customer
        try {
            await updateAuthUser(customer.user_id, { password });
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
                email: customer.email,
                password: password,
                isGenerated: isGenerated,
            },
        });
    } catch (error) {
        console.error("Error in POST /api/customers/[id]/reset-password:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
