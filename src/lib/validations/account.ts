import { z } from "zod";

// Perfil editable del usuario del panel del tenant ("Mi Cuenta").
// Solo campos que el propio usuario puede modificar. El email (identidad de
// login), el rol y los permisos NO se editan desde aquí.
export const accountProfileSchema = z.object({
  full_name: z
    .string()
    .min(1, "El nombre es requerido")
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().max(40, "Teléfono demasiado largo").optional(),
  city: z.string().max(120, "Ciudad demasiado larga").optional(),
  address: z.string().max(255, "Dirección demasiado larga").optional(),
  position: z.string().max(120, "Cargo demasiado largo").optional(),
});

export type AccountProfileFormData = z.infer<typeof accountProfileSchema>;
