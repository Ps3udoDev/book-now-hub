-- ==============================================================================
-- Migración: BookNow Business MCP
-- Fecha: 2026-09-10
-- Descripción: Tablas, funciones de membresía, RLS, RPC transaccional de confirmación
--              y registro del módulo 'business-mcp' para BookNow Hub.
-- ==============================================================================

-- 1. Función canónica de membresía y rol multi-tenant
create or replace function public.current_user_has_tenant_role(
  target_tenant_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.tenant_users tu
    where tu.tenant_id = target_tenant_id
      and tu.auth_user_id = auth.uid()
      and coalesce(tu.is_active, true) = true
      and tu.role::text = any(allowed_roles)
  );
$$;

comment on function public.current_user_has_tenant_role(uuid, text[]) is
  'Comprueba si el usuario autenticado actual tiene membresía activa en el tenant con uno de los roles autorizados (owner, admin, manager, employee).';

-- 2. Registro del addon 'business-mcp' en public.modules
insert into public.modules (
  slug,
  name,
  description,
  icon,
  category,
  is_core,
  status,
  sort_order,
  version,
  default_config,
  config_schema
)
values (
  'business-mcp',
  'BookNow Business MCP',
  'Expone agenda, clientes y análisis del tenant a agentes de IA mediante el protocolo estándar MCP con OAuth 2.1.',
  'bot',
  'addon',
  false,
  'beta',
  95,
  '1.0.0',
  '{"audit_retention_days": 90}'::jsonb,
  '{"type": "object", "properties": {"audit_retention_days": {"type": "integer", "minimum": 7, "maximum": 90, "default": 90}}, "required": ["audit_retention_days"]}'::jsonb
)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    category = excluded.category,
    status = excluded.status,
    version = excluded.version,
    default_config = excluded.default_config,
    config_schema = excluded.config_schema;

-- 3. Tabla de conexiones MCP autorizadas por usuario y tenant
create table if not exists public.mcp_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  auth_user_id uuid not null,
  oauth_client_id text not null,
  client_name text,
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  unique (tenant_id, auth_user_id, oauth_client_id)
);

create index if not exists mcp_connections_actor_idx
  on public.mcp_connections (auth_user_id, status);

create index if not exists mcp_connections_tenant_idx
  on public.mcp_connections (tenant_id, status);

comment on table public.mcp_connections is
  'Registra los clientes OAuth autorizados por cada usuario para operar sobre un tenant específico.';

-- 4. Tabla de borradores de citas creados por MCP (dos pasos)
create table if not exists public.mcp_appointment_drafts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  connection_id uuid not null references public.mcp_connections(id) on delete cascade,
  actor_auth_user_id uuid not null,
  customer_id uuid not null references public.customers(id),
  service_id uuid not null references public.services(id),
  service_variant_id uuid references public.service_variants(id),
  branch_id uuid not null references public.branches(id),
  specialist_id uuid references public.profiles(id),
  scheduled_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  estimated_price numeric(12,2),
  currency_code text,
  customer_notes text,
  status text not null default 'draft'
    check (status in ('draft', 'confirmed', 'expired', 'cancelled')),
  idempotency_key text not null,
  expires_at timestamptz not null,
  confirmed_appointment_id uuid references public.appointments(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, idempotency_key)
);

create index if not exists mcp_appointment_drafts_active_idx
  on public.mcp_appointment_drafts (tenant_id, status, expires_at);

create index if not exists mcp_appointment_drafts_actor_idx
  on public.mcp_appointment_drafts (actor_auth_user_id, created_at desc);

comment on table public.mcp_appointment_drafts is
  'Borradores de citas con TTL de 10 minutos para aprobación explícita antes de inserción en appointments.';

-- 5. Tabla de auditoría de llamadas a herramientas MCP
create table if not exists public.mcp_tool_calls (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  connection_id uuid references public.mcp_connections(id) on delete set null,
  actor_auth_user_id uuid not null,
  oauth_client_id text not null,
  request_id text not null,
  tool_name text not null,
  risk_level text not null default 'read'
    check (risk_level in ('read', 'write', 'sensitive', 'destructive')),
  arguments_hash text,
  safe_summary jsonb not null default '{}'::jsonb,
  status text not null
    check (status in ('started', 'succeeded', 'failed', 'denied')),
  error_code text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create unique index if not exists mcp_tool_calls_request_idx
  on public.mcp_tool_calls (connection_id, request_id, tool_name);

create index if not exists mcp_tool_calls_tenant_created_idx
  on public.mcp_tool_calls (tenant_id, created_at desc);

comment on table public.mcp_tool_calls is
  'Auditoría sanitizada sin PII de las ejecuciones de herramientas MCP por tenant.';

-- 6. Políticas de Row Level Security (RLS)
alter table public.mcp_connections enable row level security;
alter table public.mcp_appointment_drafts enable row level security;
alter table public.mcp_tool_calls enable row level security;

-- mcp_connections
drop policy if exists mcp_connections_select_policy on public.mcp_connections;
create policy mcp_connections_select_policy
  on public.mcp_connections
  for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or public.current_user_has_tenant_role(tenant_id, array['owner', 'admin'])
  );

drop policy if exists mcp_connections_update_policy on public.mcp_connections;
create policy mcp_connections_update_policy
  on public.mcp_connections
  for update
  to authenticated
  using (
    auth_user_id = auth.uid()
    or public.current_user_has_tenant_role(tenant_id, array['owner', 'admin'])
  )
  with check (
    auth_user_id = auth.uid()
    or public.current_user_has_tenant_role(tenant_id, array['owner', 'admin'])
  );

-- mcp_appointment_drafts
drop policy if exists mcp_drafts_select_policy on public.mcp_appointment_drafts;
create policy mcp_drafts_select_policy
  on public.mcp_appointment_drafts
  for select
  to authenticated
  using (
    actor_auth_user_id = auth.uid()
    or public.current_user_has_tenant_role(tenant_id, array['owner', 'admin', 'manager'])
  );

-- mcp_tool_calls
drop policy if exists mcp_tool_calls_select_policy on public.mcp_tool_calls;
create policy mcp_tool_calls_select_policy
  on public.mcp_tool_calls
  for select
  to authenticated
  using (
    actor_auth_user_id = auth.uid()
    or public.current_user_has_tenant_role(tenant_id, array['owner', 'admin'])
  );

-- 7. Función RPC transaccional: confirm_mcp_appointment_draft
create or replace function public.confirm_mcp_appointment_draft(
  p_draft_id uuid,
  p_actor_auth_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.mcp_appointment_drafts%rowtype;
  v_appointment_id uuid;
  v_result jsonb;
begin
  -- 1. Bloquear el draft para evitar doble confirmación concurrente
  select *
  into v_draft
  from public.mcp_appointment_drafts
  where id = p_draft_id
  for update;

  if not found then
    raise exception 'DRAFT_NOT_FOUND: El borrador de cita no existe.';
  end if;

  -- 2. Idempotencia: si ya fue confirmado, retornar la cita asociada
  if v_draft.status = 'confirmed' and v_draft.confirmed_appointment_id is not null then
    select to_jsonb(a.*)
    into v_result
    from public.appointments a
    where a.id = v_draft.confirmed_appointment_id;

    return jsonb_build_object(
      'success', true,
      'idempotent', true,
      'appointment', v_result
    );
  end if;

  -- 3. Validar estado válido
  if v_draft.status != 'draft' then
    raise exception 'INVALID_DRAFT_STATUS: El borrador no está en estado draft (estado actual: %).', v_draft.status;
  end if;

  -- 4. Validar expiración (TTL)
  if v_draft.expires_at < now() then
    update public.mcp_appointment_drafts
    set status = 'expired',
        updated_at = now()
    where id = p_draft_id;

    raise exception 'DRAFT_EXPIRED: El borrador de cita ha expirado.';
  end if;

  -- 5. Validar autorización del actor
  if v_draft.actor_auth_user_id != p_actor_auth_user_id then
    if not exists (
      select 1
      from public.tenant_users tu
      where tu.tenant_id = v_draft.tenant_id
        and tu.auth_user_id = p_actor_auth_user_id
        and coalesce(tu.is_active, true) = true
        and tu.role in ('owner', 'admin', 'manager')
    ) then
      raise exception 'UNAUTHORIZED: No tienes permisos para confirmar este borrador.';
    end if;
  end if;

  -- 6. Validar que el especialista no tenga otra cita solapada activa
  if v_draft.specialist_id is not null then
    if exists (
      select 1
      from public.appointments a
      where a.tenant_id = v_draft.tenant_id
        and a.specialist_id = v_draft.specialist_id
        and a.status in ('pending', 'confirmed', 'in_progress')
        and tstzrange(a.scheduled_at, a.ends_at, '[)') && tstzrange(v_draft.scheduled_at, v_draft.ends_at, '[)')
    ) then
      raise exception 'SPECIALIST_UNAVAILABLE: El especialista ya no está disponible en este horario.';
    end if;
  end if;

  -- 7. Crear la cita en estado 'pending' con source = 'mcp'
  insert into public.appointments (
    tenant_id,
    branch_id,
    customer_id,
    specialist_id,
    service_id,
    service_variant_id,
    scheduled_at,
    ends_at,
    duration_minutes,
    status,
    customer_notes,
    estimated_price,
    currency_code,
    source
  )
  values (
    v_draft.tenant_id,
    v_draft.branch_id,
    v_draft.customer_id,
    v_draft.specialist_id,
    v_draft.service_id,
    v_draft.service_variant_id,
    v_draft.scheduled_at,
    v_draft.ends_at,
    v_draft.duration_minutes,
    'pending'::public.appointment_status,
    v_draft.customer_notes,
    v_draft.estimated_price,
    v_draft.currency_code,
    'mcp'
  )
  returning id into v_appointment_id;

  -- 8. Insertar en appointment_services para consistencia del modelo
  insert into public.appointment_services (
    appointment_id,
    service_id,
    service_variant_id,
    specialist_id,
    duration_minutes,
    price
  )
  values (
    v_appointment_id,
    v_draft.service_id,
    v_draft.service_variant_id,
    v_draft.specialist_id,
    v_draft.duration_minutes,
    v_draft.estimated_price
  );

  -- 9. Marcar el draft como confirmado
  update public.mcp_appointment_drafts
  set status = 'confirmed',
      confirmed_appointment_id = v_appointment_id,
      confirmed_at = now(),
      updated_at = now()
  where id = p_draft_id;

  -- 10. Retornar la cita creada
  select to_jsonb(a.*)
  into v_result
  from public.appointments a
  where a.id = v_appointment_id;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'appointment', v_result
  );
end;
$$;

comment on function public.confirm_mcp_appointment_draft(uuid, uuid) is
  'Confirma atómicamente un borrador de cita MCP, valida disponibilidad, crea la cita en estado pending con source=mcp y consume el draft de forma idempotente.';

-- 8. Activar el módulo 'business-mcp' para el tenant piloto Elvis Studio
insert into public.tenant_modules (
  tenant_id,
  module_id,
  is_enabled,
  enabled_at,
  config
)
select
  t.id,
  m.id,
  true,
  now(),
  '{"audit_retention_days": 90}'::jsonb
from public.tenants t
cross join public.modules m
where m.slug = 'business-mcp'
  and t.slug in ('elvis-studio', 'elvis', 'elviz-studio')
on conflict (tenant_id, module_id) do update
set is_enabled = true,
    enabled_at = now(),
    config = '{"audit_retention_days": 90}'::jsonb;
