// src/app/api/customers/[id]/link-account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSB } from "@/lib/supabase/server";
import {
  supabaseAdmin,
  createAuthUser,
  generateTempPassword,
  getAuthUserByEmail,
} from "@/lib/supabase/admin";

interface LinkAccountBody {
  password?: string; // Si no se proporciona, se genera una
}

/**
 * POST /api/customers/[id]/link-account
 * 
 * Crea una cuenta de usuario para un customer existente (que no tiene user_id)
 * Útil cuando el staff quiere darle acceso al e-commerce/app a un cliente existente
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
    const body: LinkAccountBody = await request.json().catch(() => ({}));

    // 1. Obtener el customer
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

    // 2. Verificar que no tenga cuenta ya
    if (customer.user_id) {
      return NextResponse.json(
        { error: "Este cliente ya tiene una cuenta vinculada" },
        { status: 409 }
      );
    }

    // 3. Verificar que tenga email
    if (!customer.email) {
      return NextResponse.json(
        { error: "El cliente debe tener email para crear cuenta" },
        { status: 400 }
      );
    }

    // 4. Verificar permisos del usuario actual
    const { data: tenantUser } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("user_id", currentUser.id)
      .eq("tenant_id", customer.tenant_id)
      .eq("is_active", true)
      .single();

    if (!tenantUser) {
      return NextResponse.json(
        { error: "No tienes acceso a este tenant" },
        { status: 403 }
      );
    }

    // 5. Verificar que no exista otro auth.user con ese email
    const existingAuthUser = await getAuthUserByEmail(customer.email);
    
    if (existingAuthUser) {
      // Si existe, verificar si ya está vinculado a otro customer en este tenant
      const { data: otherCustomer } = await supabaseAdmin
        .from("customers")
        .select("id, full_name")
        .eq("tenant_id", customer.tenant_id)
        .eq("user_id", existingAuthUser.id)
        .single();

      if (otherCustomer) {
        return NextResponse.json(
          {
            error: `Este email ya está vinculado a otro cliente: ${otherCustomer.full_name}`,
          },
          { status: 409 }
        );
      }

      // Existe auth.user pero no está vinculado → vincular
      const { error: linkError } = await supabaseAdmin
        .from("customers")
        .update({ user_id: existingAuthUser.id })
        .eq("id", customerId);

      if (linkError) {
        return NextResponse.json(
          { error: `Error al vincular cuenta: ${linkError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Cliente vinculado a cuenta existente",
        auth_user_id: existingAuthUser.id,
        credentials: null, // Ya tiene cuenta, no generamos credenciales
      });
    }

    // 6. Crear nuevo auth.user
    const password = body.password || generateTempPassword();
    const isPasswordGenerated = !body.password;

    let authUser;
    try {
      authUser = await createAuthUser(customer.email.toLowerCase(), password, {
        full_name: customer.full_name,
        tenant_id: customer.tenant_id,
        user_type: "customer",
      });
    } catch (error) {
      console.error("Error creating auth user:", error);
      return NextResponse.json(
        { error: `Error al crear cuenta: ${(error as Error).message}` },
        { status: 500 }
      );
    }

    // 7. Vincular customer con auth.user
    const { error: linkError } = await supabaseAdmin
      .from("customers")
      .update({ user_id: authUser.id })
      .eq("id", customerId);

    if (linkError) {
      // Rollback: eliminar auth.user
      await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      return NextResponse.json(
        { error: `Error al vincular cuenta: ${linkError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Cuenta creada y vinculada exitosamente",
      auth_user_id: authUser.id,
      credentials: isPasswordGenerated
        ? {
            email: customer.email.toLowerCase(),
            password: password,
            message:
              "Contraseña temporal. El cliente debe cambiarla al iniciar sesión.",
          }
        : null,
    });
  } catch (error) {
    console.error("Error in POST /api/customers/[id]/link-account:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customers/[id]/link-account
 * 
 * Desvincula la cuenta de usuario de un customer (NO elimina el auth.user)
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

    const { id: customerId } = await params;

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

    if (!customer.user_id) {
      return NextResponse.json(
        { error: "Este cliente no tiene cuenta vinculada" },
        { status: 400 }
      );
    }

    // 2. Verificar permisos (solo admin/owner)
    const { data: tenantUser } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("user_id", currentUser.id)
      .eq("tenant_id", customer.tenant_id)
      .eq("is_active", true)
      .single();

    if (!tenantUser || !["owner", "admin"].includes(tenantUser.role)) {
      return NextResponse.json(
        { error: "No tienes permisos para desvincular cuentas" },
        { status: 403 }
      );
    }

    // 3. Desvincular (solo quita el user_id, no elimina el auth.user)
    const { error: unlinkError } = await supabaseAdmin
      .from("customers")
      .update({ user_id: null })
      .eq("id", customerId);

    if (unlinkError) {
      return NextResponse.json(
        { error: `Error al desvincular: ${unlinkError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Cuenta desvinculada. El cliente ya no podrá iniciar sesión.",
    });
  } catch (error) {
    console.error("Error in DELETE /api/customers/[id]/link-account:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}