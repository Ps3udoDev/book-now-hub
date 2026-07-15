-- Módulo de IA (addon): sugerencia de campañas segmentadas.
-- Alta del módulo + activación en el tenant demo (Elvis).

insert into public.modules (slug, name, description, icon, category, is_core, status, sort_order, version)
values (
  'ai-assistant',
  'Asistente IA',
  'Propone campañas segmentadas a partir del comportamiento de los clientes.',
  'sparkles',
  'addon',
  false,
  'beta',
  90,
  '1.0.0'
)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      icon = excluded.icon,
      category = excluded.category,
      status = excluded.status;

-- Activar para el tenant demo Elvis (resuelve por variantes de slug conocidas).
insert into public.tenant_modules (tenant_id, module_id, is_enabled, enabled_at)
select t.id, m.id, true, now()
from public.tenants t
cross join public.modules m
where m.slug = 'ai-assistant'
  and t.slug in ('elviz', 'elvis', 'elviz-studio', 'elvis-studio')
on conflict (tenant_id, module_id) do update
  set is_enabled = true, enabled_at = now();
