-- Habilita notificaciones Realtime para cambios de herramientas y movimientos.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'No existe la publicación supabase_realtime. Habilita Realtime en el proyecto Supabase antes de aplicar esta migración.';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'herramientas'
  ) then
    alter publication supabase_realtime add table public.herramientas;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'movimientos'
  ) then
    alter publication supabase_realtime add table public.movimientos;
  end if;
end $$;
