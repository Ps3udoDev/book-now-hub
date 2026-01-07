import { z } from "zod";

export const loginSchema = z.object({
    email: z
        .string()
        .min(1, "El email es requerido")
        .email("Email inválido"),
    password: z
        .string()
        .min(1, "La contraseña es requerida")
        .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
    .object({
        full_name: z
            .string()
            .min(1, "El nombre es requerido")
            .min(2, "El nombre debe tener al menos 2 caracteres"),
        email: z
            .string()
            .min(1, "El email es requerido")
            .email("Email inválido"),
        password: z
            .string()
            .min(1, "La contraseña es requerida")
            .min(6, "La contraseña debe tener al menos 6 caracteres"),
        confirmPassword: z
            .string()
            .min(1, "Confirma tu contraseña"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Las contraseñas no coinciden",
        path: ["confirmPassword"],
    });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
    email: z
        .string()
        .min(1, "El email es requerido")
        .email("Email inválido"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;