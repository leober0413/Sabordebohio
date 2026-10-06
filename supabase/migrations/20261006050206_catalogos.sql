-- Fase 1 · Catálogos con escritura directa (CRUD simple): sabores, clientes
-- y categorías de gasto. Nada se borra: se desactiva (BR-011).

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- productos (sabores) · FR-001, FR-003, FR-065
-- ---------------------------------------------------------------------------
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) between 1 and 40),
  activo boolean not null default true,
  stock_minimo int check (stock_minimo >= 0),
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

create unique index productos_nombre_unico on public.productos (lower(trim(nombre)));

alter table public.productos enable row level security;

revoke all on table public.productos from anon, authenticated;
grant select on table public.productos to authenticated;
grant insert (nombre, activo, stock_minimo, orden) on table public.productos to authenticated;
grant update (nombre, activo, stock_minimo, orden) on table public.productos to authenticated;

create policy productos_select on public.productos
  for select to authenticated using (public.es_dueno());
create policy productos_insert on public.productos
  for insert to authenticated with check (public.es_dueno());
create policy productos_update on public.productos
  for update to authenticated using (public.es_dueno()) with check (public.es_dueno());

-- ---------------------------------------------------------------------------
-- clientes · FR-010, FR-011
-- ---------------------------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) between 1 and 80),
  telefono text check (telefono is null or length(trim(telefono)) between 1 and 30),
  notas text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create index clientes_nombre_trgm on public.clientes using gin (nombre extensions.gin_trgm_ops);
create index clientes_telefono_trgm on public.clientes using gin (telefono extensions.gin_trgm_ops);

alter table public.clientes enable row level security;

revoke all on table public.clientes from anon, authenticated;
grant select on table public.clientes to authenticated;
grant insert (nombre, telefono, notas, activo) on table public.clientes to authenticated;
grant update (nombre, telefono, notas, activo) on table public.clientes to authenticated;

create policy clientes_select on public.clientes
  for select to authenticated using (public.es_dueno());
create policy clientes_insert on public.clientes
  for insert to authenticated with check (public.es_dueno());
create policy clientes_update on public.clientes
  for update to authenticated using (public.es_dueno()) with check (public.es_dueno());

-- ---------------------------------------------------------------------------
-- categorias_gasto · "Ingredientes" es de sistema: no se renombra ni se
-- desactiva, porque las compras generan sus gastos ahí (BR-009).
-- ---------------------------------------------------------------------------
create table public.categorias_gasto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) between 1 and 40),
  activo boolean not null default true,
  es_sistema boolean not null default false,
  creado_en timestamptz not null default now()
);

create unique index categorias_gasto_nombre_unico on public.categorias_gasto (lower(trim(nombre)));

insert into public.categorias_gasto (nombre, es_sistema) values ('Ingredientes', true);

create function public.categorias_gasto_proteger_sistema()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.es_sistema and (new.nombre is distinct from old.nombre or not new.activo) then
    raise exception 'La categoría "%" es del sistema y no se puede renombrar ni desactivar.', old.nombre
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger categorias_gasto_proteger_sistema
  before update on public.categorias_gasto
  for each row execute function public.categorias_gasto_proteger_sistema();

alter table public.categorias_gasto enable row level security;

revoke all on table public.categorias_gasto from anon, authenticated;
grant select on table public.categorias_gasto to authenticated;
-- es_sistema no se concede: la app nunca crea ni cambia categorías de sistema.
grant insert (nombre, activo) on table public.categorias_gasto to authenticated;
grant update (nombre, activo) on table public.categorias_gasto to authenticated;

create policy categorias_gasto_select on public.categorias_gasto
  for select to authenticated using (public.es_dueno());
create policy categorias_gasto_insert on public.categorias_gasto
  for insert to authenticated with check (public.es_dueno());
create policy categorias_gasto_update on public.categorias_gasto
  for update to authenticated using (public.es_dueno()) with check (public.es_dueno());
