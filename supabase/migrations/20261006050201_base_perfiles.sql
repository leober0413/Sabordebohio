-- Fase 1 · Base: tipos del dominio, perfiles de dueños y es_dueno().
-- docs/database.md (Tipos, Security), DEC-001, FR-080.

-- Tipos de todo el dominio (se usan a partir de la Fase 2).
create type public.estado_pedido as enum ('pendiente', 'listo', 'entregado', 'cancelado');
create type public.tipo_entrega as enum ('recoge', 'delivery');
create type public.metodo_pago as enum ('efectivo', 'transferencia');
create type public.tarifa_aplicada as enum ('suelta', 'docena');
create type public.tipo_mov_producto as enum ('tanda', 'entrega', 'reverso_entrega', 'hecho_al_momento', 'ajuste');
create type public.tipo_mov_ingrediente as enum ('compra', 'ajuste', 'conteo');

-- Las funciones nuevas no se ejecutan por defecto: cada una concede su permiso.
-- (El permiso a PUBLIC es global; revocarlo por esquema no tiene efecto.)
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- perfiles: un dueño = una fila (1:1 con auth.users). Los usuarios sin perfil
-- pueden autenticarse pero no ven ni escriben nada (RLS).
-- No hay registro público: los perfiles los crea el seed (local) o una
-- migración/operación de despliegue (producción), nunca la app.
-- ---------------------------------------------------------------------------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 60),
  creado_en timestamptz not null default now()
);

comment on table public.perfiles is 'Dueños autorizados. Sin fila aquí, un usuario autenticado no accede a nada.';

-- ¿El usuario de la sesión es dueño? security definer para poder leer
-- perfiles sin depender de su propia política (evita recursión).
create function public.es_dueno()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.perfiles p where p.id = auth.uid());
$$;

grant execute on function public.es_dueno() to authenticated;

-- Para las RPC: corta con un error claro si quien llama no es dueño.
create function public.exigir_dueno()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_dueno() then
    raise exception 'No tienes permiso para hacer esto.' using errcode = '42501';
  end if;
end;
$$;

grant execute on function public.exigir_dueno() to authenticated;

alter table public.perfiles enable row level security;

revoke all on table public.perfiles from anon, authenticated;
grant select on table public.perfiles to authenticated;
grant update (nombre) on table public.perfiles to authenticated;

create policy perfiles_select on public.perfiles
  for select to authenticated
  using (public.es_dueno());

create policy perfiles_update_propio on public.perfiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
