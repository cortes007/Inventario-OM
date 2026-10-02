-- Dashboard y seguimiento de cambios de condición.
create table if not exists public.herramienta_estado_historial (
  id uuid primary key default gen_random_uuid(),
  herramienta_id uuid not null references public.herramientas(id) on delete restrict,
  estado_anterior text not null,
  estado_nuevo text not null,
  cambiado_por uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists herramienta_estado_historial_tool_created_idx
  on public.herramienta_estado_historial(herramienta_id, created_at desc);

alter table public.herramientas drop constraint if exists herramientas_estado_check;
alter table public.herramientas add constraint herramientas_estado_check
  check (estado in ('DISPONIBLE','EN_USO','EN_REPARACION','BAJA'));

alter table public.herramienta_estado_historial enable row level security;
drop policy if exists "herramienta_estado_historial_select" on public.herramienta_estado_historial;
create policy "herramienta_estado_historial_select" on public.herramienta_estado_historial
  for select to authenticated using (true);

create or replace function public.registrar_cambio_estado_herramienta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.herramienta_estado_historial
    (herramienta_id, estado_anterior, estado_nuevo, cambiado_por)
  values (new.id, old.estado, new.estado, (select auth.uid()));
  return new;
end $$;

drop trigger if exists trg_registrar_cambio_estado_herramienta on public.herramientas;
create trigger trg_registrar_cambio_estado_herramienta
after update of estado on public.herramientas
for each row
when (old.estado is distinct from new.estado)
execute function public.registrar_cambio_estado_herramienta();

-- El saldo de préstamos excluye las entradas usadas al crear el stock inicial.
create or replace view public.inventario_prestamos_resumen
with (security_invoker = true)
as
select herramienta_id,
       greatest(sum(case
         when tipo = 'SALIDA' then cantidad
         when tipo = 'ENTRADA' and coalesce(observacion, '') <> 'Stock inicial' then -cantidad
         else 0
       end), 0)::bigint as unidades_prestadas
from public.movimientos
group by herramienta_id;

grant select on public.inventario_prestamos_resumen to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'herramientas') then
      alter publication supabase_realtime add table public.herramientas;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'movimientos') then
      alter publication supabase_realtime add table public.movimientos;
    end if;
  end if;
end $$;
