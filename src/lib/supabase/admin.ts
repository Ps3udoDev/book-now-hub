import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. " +
    "This is required for admin operations."
  );
}

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Crear usuario en auth.users
 */
export async function createAuthUser(
  email: string,
  password: string,
  metadata?: Record<string, unknown>
) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error) {
    throw new Error(`Error creating auth user: ${error.message}`);
  }

  return data.user;
}

/**
 * Actualizar usuario en auth.users
 */
export async function updateAuthUser(
  userId: string,
  updates: {
    email?: string;
    password?: string;
    user_metadata?: Record<string, unknown>;
  }
) {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    updates
  );

  if (error) {
    throw new Error(`Error updating auth user: ${error.message}`);
  }

  return data.user;
}

/**
 * Eliminar usuario de auth.users
 */
export async function deleteAuthUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(`Error deleting auth user: ${error.message}`);
  }

  return true;
}

/**
 * Obtener usuario por ID
 */
export async function getAuthUser(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (error) {
    return null;
  }

  return data.user;
}

/**
 * Obtener usuario por email
 */
export async function getAuthUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    throw new Error(`Error listing users: ${error.message}`);
  }

  return data.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );
}

/**
 * Enviar email de invitación (el usuario establece su contraseña)
 */
export async function inviteUserByEmail(
  email: string,
  metadata?: Record<string, unknown>
) {
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    {
      data: metadata,
    }
  );

  if (error) {
    throw new Error(`Error inviting user: ${error.message}`);
  }

  return data.user;
}

/**
 * Generar contraseña temporal segura
 */
export function generateTempPassword(length: number = 12): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";

  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  password += "0123456789"[Math.floor(Math.random() * 10)];
  password += "!@#$%"[Math.floor(Math.random() * 5)];

  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}