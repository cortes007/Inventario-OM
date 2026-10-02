-- OM Herramental · AcabadosOM SAS  (ejecutar en Supabase > SQL Editor)
create sequence if not exists herramientas_seq;
create sequence if not exists movimientos_seq;

create table public.herramientas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null default 'HER-' || lpad(nextval('herramientas_seq')::text, 4, '0'),
  nombre text not null,
  categoria text not null default 'General',
  ubicacion text,
  stock_actual int not null default 0 check (stock_actual >= 0),
  stock_minimo int not null default 0 check (stock_minimo >= 0),
  estado text not null default 'DISPONIBLE' check (estado in ('DISPONIBLE','EN_REPARACION','BAJA')),
  created_at timestamptz not null default now()
);

create table public.movimientos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null default 'MOV-' || lpad(nextval('movimientos_seq')::text, 6, '0'),
  herramienta_id uuid not null references public.herramientas(id) on delete restrict,
  tipo text not null check (tipo in ('ENTRADA','SALIDA')),
  cantidad int not null check (cantidad > 0),
  responsable text not null,
  destino text,
  observacion text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.tool_documents (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.herramientas(id) on delete restrict,
  storage_path text not null unique,
  file_name text not null check (btrim(file_name) <> ''),
  content_type text,
  byte_size bigint not null check (byte_size >= 0),
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint tool_documents_storage_path_matches_tool
    check (storage_path like tool_id::text || '/%')
);

create index tool_documents_tool_id_idx on public.tool_documents(tool_id);

create table public.herramienta_estado_historial (
  id uuid primary key default gen_random_uuid(),
  herramienta_id uuid not null references public.herramientas(id) on delete restrict,
  estado_anterior text not null,
  estado_nuevo text not null,
  cambiado_por uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index herramienta_estado_historial_tool_created_idx
  on public.herramienta_estado_historial(herramienta_id, created_at desc);

alter table public.herramientas drop constraint herramientas_estado_check;
alter table public.herramientas add constraint herramientas_estado_check
  check (estado in ('DISPONIBLE','EN_USO','EN_REPARACION','BAJA'));

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

create trigger trg_registrar_cambio_estado_herramienta
after update of estado on public.herramientas
for each row
when (old.estado is distinct from new.estado)
execute function public.registrar_cambio_estado_herramienta();

-- El stock se actualiza solo: nadie edita el número a mano.
create or replace function public.aplicar_movimiento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.herramientas
     set stock_actual = stock_actual + case when new.tipo = 'ENTRADA' then new.cantidad else -new.cantidad end
   where id = new.herramienta_id;
  return new;
exception when check_violation then
  raise exception 'Stock insuficiente para esta salida';
end $$;

create trigger trg_aplicar_movimiento after insert on public.movimientos
for each row execute function public.aplicar_movimiento();

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

alter table public.herramientas enable row level security;
alter table public.movimientos enable row level security;
alter table public.tool_documents enable row level security;
alter table public.herramienta_estado_historial enable row level security;

create policy "herramientas_select" on public.herramientas
  for select to authenticated using (true);
create policy "herramientas_insert" on public.herramientas
  for insert to authenticated with check (true);
create policy "herramientas_update" on public.herramientas
  for update to authenticated using (true) with check (true);
create policy "herramientas_delete" on public.herramientas
  for delete to authenticated using (true);

-- Movimientos: solo leer e insertar (historial inmutable, sirve de auditoría)
create policy "mov_select" on public.movimientos for select to authenticated using (true);
create policy "mov_insert" on public.movimientos
  for insert to authenticated with check (created_by = (select auth.uid()));

create policy "tool_documents_select" on public.tool_documents
  for select to authenticated using (true);
create policy "tool_documents_insert" on public.tool_documents
  for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and storage_path like tool_id::text || '/%'
  );
create policy "tool_documents_delete" on public.tool_documents
  for delete to authenticated using (uploaded_by = (select auth.uid()));
create policy "herramienta_estado_historial_select" on public.herramienta_estado_historial
  for select to authenticated using (true);

-- El stock solo se puede cambiar por el trigger de movimientos, no desde el cliente.
revoke insert, update on public.herramientas from authenticated;
grant insert (codigo, nombre, categoria, ubicacion, stock_minimo, estado)
  on public.herramientas to authenticated;
grant update (codigo, nombre, categoria, ubicacion, stock_minimo, estado)
  on public.herramientas to authenticated;

insert into storage.buckets (id, name, public)
values ('tool-documents', 'tool-documents', false)
on conflict (id) do update set public = false;

create policy "tool_documents_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'tool-documents'
    and exists (
      select 1 from public.tool_documents d
      where d.storage_path = name
    )
  );
create policy "tool_documents_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'tool-documents'
    and exists (
      select 1 from public.herramientas h
      where h.id::text = (storage.foldername(name))[1]
    )
  );
create policy "tool_documents_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'tool-documents'
    and exists (
      select 1 from public.tool_documents d
      where d.storage_path = name
        and d.uploaded_by = (select auth.uid())
    )
  );

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
