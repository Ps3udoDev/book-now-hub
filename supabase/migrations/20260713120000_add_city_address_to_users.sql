-- ═══════════════════════════════════════════════════════════════════════
-- MÓDULO SEGURIDAD — "Mi Cuenta": columnas city/address en el modelo de usuario
-- Fecha: 2026-07-13
--
-- Agrega `city` y `address` (nullable) a tenant_users y profiles para el perfil
-- editable del panel del tenant. `customers` ya las tiene y no se toca.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.tenant_users
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS address text;
