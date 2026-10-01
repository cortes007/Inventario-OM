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

-- El stock se actualiza solo: nadie edita el número a mano.
create or replace function public.aplicar_movimiento() returns trigger language plpgsql as $$
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

alter table public.herramientas enable row level security;
alter table public.movimientos enable row level security;
create policy "herramientas_auth" on public.herramientas for all to authenticated using (true) with check (true);
-- Movimientos: solo leer e insertar (historial inmutable, sirve de auditoría)
create policy "mov_select" on public.movimientos for select to authenticated using (true);
create policy "mov_insert" on public.movimientos for insert to authenticated with check (true);
