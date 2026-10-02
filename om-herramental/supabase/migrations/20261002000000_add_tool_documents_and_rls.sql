-- Ejecutar en proyectos existentes después de schema.sql.
-- codigo ya es único y autogenerado en la instalación original; al omitirlo
-- en INSERT se usa el valor predeterminado, y también se aceptan códigos manuales.

create table if not exists public.tool_documents (
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

create index if not exists tool_documents_tool_id_idx
  on public.tool_documents(tool_id);

alter table public.tool_documents enable row level security;

drop policy if exists "herramientas_auth" on public.herramientas;
drop policy if exists "herramientas_select" on public.herramientas;
drop policy if exists "herramientas_insert" on public.herramientas;
drop policy if exists "herramientas_update" on public.herramientas;
drop policy if exists "herramientas_delete" on public.herramientas;
create policy "herramientas_select" on public.herramientas
  for select to authenticated using (true);
create policy "herramientas_insert" on public.herramientas
  for insert to authenticated with check (true);
create policy "herramientas_update" on public.herramientas
  for update to authenticated using (true) with check (true);
create policy "herramientas_delete" on public.herramientas
  for delete to authenticated using (true);

drop policy if exists "mov_select" on public.movimientos;
drop policy if exists "mov_insert" on public.movimientos;
create policy "mov_select" on public.movimientos
  for select to authenticated using (true);
create policy "mov_insert" on public.movimientos
  for insert to authenticated with check (created_by = (select auth.uid()));

drop policy if exists "tool_documents_select" on public.tool_documents;
drop policy if exists "tool_documents_insert" on public.tool_documents;
drop policy if exists "tool_documents_delete" on public.tool_documents;
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

-- Mantener el stock como dato derivado; solo el trigger puede modificarlo.
revoke insert, update on public.herramientas from authenticated;
grant insert (codigo, nombre, categoria, ubicacion, stock_minimo, estado)
  on public.herramientas to authenticated;
grant update (codigo, nombre, categoria, ubicacion, stock_minimo, estado)
  on public.herramientas to authenticated;

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

insert into storage.buckets (id, name, public)
values ('tool-documents', 'tool-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "tool_documents_storage_select" on storage.objects;
drop policy if exists "tool_documents_storage_insert" on storage.objects;
drop policy if exists "tool_documents_storage_delete" on storage.objects;
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
