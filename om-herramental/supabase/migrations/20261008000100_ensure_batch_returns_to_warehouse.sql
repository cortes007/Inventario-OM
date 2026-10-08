-- Ensure every asset in a batch return is explicitly returned to the warehouse.
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
      'Bodega',
      nullif(btrim(p_observacion), ''),
      (select auth.uid())
    )
    returning * into v_movement;

    update public.herramientas
       set ubicacion = 'Bodega',
           estado = case when estado = 'EN_USO' then 'DISPONIBLE' else estado end
     where id = v_tool.id;

    return next v_movement;
  end loop;
  return;
end $$;

revoke all on function public.registrar_devoluciones_lote(jsonb, text, text, text) from public;
grant execute on function public.registrar_devoluciones_lote(jsonb, text, text, text) to authenticated;
