-- Least-privilege database role for booknow-mcp-service (Go, Cloud Run).
-- The password is managed outside migrations (set once in production, never versioned).
-- BYPASSRLS: RLS policies rely on auth.uid(), which is null for a service connection;
-- access is bounded by the explicit GRANTs below and the service always filters by the
-- tenant resolved from the caller's token and active mcp_connections row.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'booknow_mcp_service') then
    create role booknow_mcp_service with login bypassrls noinherit;
  end if;
end
$$;

-- Enforce attributes on an existing role without touching its password.
alter role booknow_mcp_service with login bypassrls noinherit;

grant usage on schema public to booknow_mcp_service;

-- Read-only access required to authorize MCP requests.
grant select on table
  public.mcp_connections,
  public.tenants,
  public.tenant_users,
  public.tenant_modules,
  public.modules
to booknow_mcp_service;
