-- OM Herramental · OM Construcciones y Acabados SAS (ejecutar en Supabase > SQL Editor)
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

create or replace function public.validar_movimiento_activo_fijo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text;
  v_stock_actual integer;
  v_prestadas bigint;
begin
  if new.tipo = 'ENTRADA' and new.observacion = 'Stock inicial' then
    if new.cantidad <> 1 then
      raise exception 'El alta inicial debe corresponder a un activo individual';
    end if;
    return new;
  end if;

  if new.cantidad <> 1 then
    raise exception 'Cada movimiento debe corresponder a un solo activo';
  end if;
  if nullif(btrim(new.destino), '') is null then
    raise exception 'Indica la nueva ubicación del activo';
  end if;

  select estado, stock_actual
    into v_estado, v_stock_actual
    from public.herramientas
   where id = new.herramienta_id
   for update;

  if not found then
    raise exception 'La herramienta seleccionada ya no existe';
  end if;

  select coalesce(sum(case
    when tipo = 'SALIDA' then cantidad
    when tipo = 'ENTRADA' and coalesce(observacion, '') <> 'Stock inicial' then -cantidad
    else 0
  end), 0)
    into v_prestadas
    from public.movimientos
   where herramienta_id = new.herramienta_id;

  if new.tipo = 'SALIDA' then
    if v_estado <> 'DISPONIBLE' then
      raise exception 'Solo se pueden entregar activos disponibles';
    end if;
    if v_stock_actual <> 1 or v_prestadas <> 0 then
      raise exception 'El activo no está disponible para salida';
    end if;
  elsif v_stock_actual <> 0 or v_prestadas < 1 then
    raise exception 'El activo no tiene una salida pendiente de devolución';
  end if;

  return new;
end $$;

create trigger trg_validar_movimiento_activo_fijo
before insert on public.movimientos
for each row execute function public.validar_movimiento_activo_fijo();

create or replace function public.sincronizar_activo_fijo_desde_movimiento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tipo = 'ENTRADA' and new.observacion = 'Stock inicial' then
    return new;
  end if;

  update public.herramientas
     set ubicacion = btrim(new.destino),
         estado = case
           when new.tipo = 'SALIDA' then 'EN_USO'
           when estado = 'EN_USO' then 'DISPONIBLE'
           else estado
         end
   where id = new.herramienta_id;

  return new;
end $$;

create trigger trg_sincronizar_activo_fijo_desde_movimiento
after insert on public.movimientos
for each row execute function public.sincronizar_activo_fijo_desde_movimiento();

create or replace function public.registrar_movimientos_lote(
  p_movimientos jsonb,
  p_responsable text,
  p_destino text default null,
  p_observacion text default null
)
returns setof public.movimientos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_tool public.herramientas%rowtype;
  v_movement public.movimientos%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión para registrar movimientos';
  end if;
  if jsonb_typeof(p_movimientos) is distinct from 'array' then
    raise exception 'La lista de herramientas no es válida';
  end if;
  if jsonb_array_length(p_movimientos) = 0 then
    raise exception 'Agrega al menos una herramienta a la salida';
  end if;
  if nullif(btrim(p_responsable), '') is null then
    raise exception 'Indica quién recibe las herramientas';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_movimientos) as item(value)
    where jsonb_typeof(value) is distinct from 'object'
      or coalesce(value->>'herramienta_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(value->>'cantidad', '') !~ '^[1-9][0-9]{0,8}$'
  ) then
    raise exception 'Verifica la herramienta y la cantidad de cada fila';
  end if;
  if (
    select count(*) <> count(distinct value->>'herramienta_id')
    from jsonb_array_elements(p_movimientos) as item(value)
  ) then
    raise exception 'No repitas la misma herramienta en una salida';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_movimientos) as item(value)
    order by (value->>'herramienta_id')::uuid
  loop
    select * into v_tool
    from public.herramientas
    where id = (v_item->>'herramienta_id')::uuid
    for update;

    if not found then
      raise exception 'Una de las herramientas seleccionadas ya no existe';
    end if;
    if v_tool.estado = 'BAJA' then
      raise exception 'La herramienta % está dada de baja', v_tool.codigo;
    end if;
    if v_tool.stock_actual < (v_item->>'cantidad')::integer then
      raise exception 'Stock insuficiente para % (disponible: %)', v_tool.codigo, v_tool.stock_actual;
    end if;

    insert into public.movimientos
      (herramienta_id, tipo, cantidad, responsable, destino, observacion, created_by)
    values (
      v_tool.id,
      'SALIDA',
      (v_item->>'cantidad')::integer,
      btrim(p_responsable),
      nullif(btrim(p_destino), ''),
      nullif(btrim(p_observacion), ''),
      (select auth.uid())
    )
    returning * into v_movement;

    return next v_movement;
  end loop;
  return;
end $$;

revoke all on function public.registrar_movimientos_lote(jsonb, text, text, text) from public;
grant execute on function public.registrar_movimientos_lote(jsonb, text, text, text) to authenticated;

create or replace function public.registrar_devoluciones_lote(
  p_movimientos jsonb,
  p_responsable text,
  p_destino text default null,
  p_observacion text default null
)
returns setof public.movimientos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_tool public.herramientas%rowtype;
  v_movement public.movimientos%rowtype;
  v_prestadas bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión para registrar devoluciones';
  end if;
  if jsonb_typeof(p_movimientos) is distinct from 'array' then
    raise exception 'La lista de herramientas no es válida';
  end if;
  if jsonb_array_length(p_movimientos) = 0 then
    raise exception 'Agrega al menos una herramienta a la devolución';
  end if;
  if nullif(btrim(p_responsable), '') is null then
    raise exception 'Indica quién devuelve las herramientas';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_movimientos) as item(value)
    where jsonb_typeof(value) is distinct from 'object'
      or coalesce(value->>'herramienta_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(value->>'cantidad', '') !~ '^[1-9][0-9]{0,8}$'
  ) then
    raise exception 'Verifica la herramienta y la cantidad de cada fila';
  end if;
  if (
    select count(*) <> count(distinct value->>'herramienta_id')
    from jsonb_array_elements(p_movimientos) as item(value)
  ) then
    raise exception 'No repitas la misma herramienta en una devolución';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_movimientos) as item(value)
    order by (value->>'herramienta_id')::uuid
  loop
    select * into v_tool
    from public.herramientas
    where id = (v_item->>'herramienta_id')::uuid
    for update;

    if not found then
      raise exception 'Una de las herramientas seleccionadas ya no existe';
    end if;

    select coalesce(sum(case
      when tipo = 'SALIDA' then cantidad
      when tipo = 'ENTRADA' and coalesce(observacion, '') <> 'Stock inicial' then -cantidad
      else 0
    end), 0)
    into v_prestadas
    from public.movimientos
    where herramienta_id = v_tool.id;

    if v_prestadas < (v_item->>'cantidad')::integer then
      raise exception 'La cantidad a devolver de % supera las unidades prestadas (%)', v_tool.codigo, greatest(v_prestadas, 0);
    end if;

    insert into public.movimientos
      (herramienta_id, tipo, cantidad, responsable, destino, observacion, created_by)
    values (
      v_tool.id,
      'ENTRADA',
      (v_item->>'cantidad')::integer,
      btrim(p_responsable),
      nullif(btrim(p_destino), ''),
      nullif(btrim(p_observacion), ''),
      (select auth.uid())
    )
    returning * into v_movement;

    return next v_movement;
  end loop;
  return;
end $$;

revoke all on function public.registrar_devoluciones_lote(jsonb, text, text, text) from public;
grant execute on function public.registrar_devoluciones_lote(jsonb, text, text, text) to authenticated;

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
