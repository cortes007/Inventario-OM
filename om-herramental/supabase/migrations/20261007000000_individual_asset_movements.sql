-- Treat every tool movement as an event for one physical asset.
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

drop trigger if exists trg_validar_movimiento_activo_fijo on public.movimientos;
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

drop trigger if exists trg_sincronizar_activo_fijo_desde_movimiento on public.movimientos;
create trigger trg_sincronizar_activo_fijo_desde_movimiento
after insert on public.movimientos
for each row execute function public.sincronizar_activo_fijo_desde_movimiento();
