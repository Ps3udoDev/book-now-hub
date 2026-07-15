-- Seed de demo para el Asistente IA: puebla el tenant Elvis con clientes con textura.
-- Idempotente: borra los clientes demo previos (marcados por tag 'demo-ai') y reinserta.
do $$
declare
  v_tenant uuid;
  v_service uuid;
  v_branch uuid;
  i int;
  v_first text;
  v_last text;
  v_full text;
  v_days int;
  v_month int;
begin
  select id into v_tenant from public.tenants
   where slug in ('elviz', 'elvis', 'elviz-studio', 'elvis-studio')
   order by created_at limit 1;
  if v_tenant is null then
    raise notice 'Tenant Elvis no encontrado; se omite el seed.';
    return;
  end if;

  -- Limpieza idempotente de clientes de demo previos.
  -- Borra primero las citas demo (FK a customers) para permitir la limpieza.
  delete from public.appointments
   where tenant_id = v_tenant
     and customer_id in (
       select id from public.customers
        where tenant_id = v_tenant and tags @> array['demo-ai']
     );

  delete from public.customers
   where tenant_id = v_tenant and tags @> array['demo-ai'];

  -- Un servicio y una sucursal existentes del tenant para poblar citas (si hay).
  select id into v_service from public.services where tenant_id = v_tenant limit 1;
  select id into v_branch from public.branches where tenant_id = v_tenant limit 1;

  for i in 1..40 loop
    v_first := (array['Ana','Luis','María','Carlos','Sofía','Diego','Valentina','Jorge','Camila','Andrés',
                      'Lucía','Pedro','Isabella','Miguel','Daniela','Fernando','Gabriela','Ricardo','Paula','Tomás'])[1 + (i % 20)];
    v_last := (array['Gómez','Pérez','Rojas','Díaz','Torres','Vargas','Castro','Ramírez','Flores','Herrera'])[1 + (i % 10)];
    v_full := v_first || ' ' || v_last;

    -- ~10 dormidos (>90d), ~10 medios (30-60d), resto recientes.
    v_days := case
      when i % 4 = 0 then 95 + i           -- dormidos
      when i % 4 = 1 then 35 + i           -- medios
      else 3 + (i % 20)                    -- recientes
    end;

    -- ~8 con cumpleaños en el mes actual, el resto repartido.
    v_month := case when i % 5 = 0 then extract(month from now())::int else 1 + (i % 12) end;

    insert into public.customers (
      tenant_id, first_name, last_name, full_name, gender, city, how_found_us,
      birth_date, last_visit_at, total_spent, total_visits, loyalty_points,
      accepts_marketing, tags, is_active, phone, email
    ) values (
      v_tenant, v_first, v_last, v_full,
      (array['female','male','other'])[1 + (i % 3)],
      (array['Quito','Guayaquil','Cuenca','Ambato'])[1 + (i % 4)],
      (array['referido','redes','google','walk-in'])[1 + (i % 4)],
      make_date(1985 + (i % 20), v_month, 1 + (i % 27)),
      now() - (v_days || ' days')::interval,
      (50 + i * 13)::numeric,
      1 + (i % 12),
      (i * 7) % 500,
      (i % 3 <> 0),                                   -- ~2/3 aceptan marketing
      case when i % 6 = 0 then array['demo-ai','vip'] else array['demo-ai'] end,
      true,
      '09' || lpad((10000000 + i)::text, 8, '0'),
      'demo' || i || '@example.com'
    );
  end loop;

  -- Poblar algunas citas para service_consumed / topServices (si hay servicio y sucursal).
  if v_service is not null and v_branch is not null then
    insert into public.appointments (tenant_id, customer_id, service_id, branch_id, duration_minutes, scheduled_at, status)
    select v_tenant, c.id, v_service, v_branch, 30, now() - interval '10 days', 'completed'
    from public.customers c
    where c.tenant_id = v_tenant and c.tags @> array['demo-ai']
    limit 15;
  end if;
end $$;
