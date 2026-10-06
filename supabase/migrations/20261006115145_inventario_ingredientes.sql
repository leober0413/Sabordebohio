-- Fase 4 · Ingredientes, compras, gastos y alertas de stock.
-- docs/database.md, FR-052, FR-060 a FR-065, BR-007, BR-009.

-- ---------------------------------------------------------------------------
-- ingredientes (CRUD directo, como productos) · FR-060, FR-065
-- ---------------------------------------------------------------------------
create table public.ingredientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) between 1 and 40),
  unidad text not null check (length(trim(unidad)) between 1 and 15),
  stock_minimo numeric(12, 3) check (stock_minimo >= 0),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create unique index ingredientes_nombre_unico on public.ingredientes (lower(trim(nombre)));

alter table public.ingredientes enable row level security;

revoke all on table public.ingredientes from anon, authenticated;
grant select on table public.ingredientes to authenticated;
grant insert (nombre, unidad, stock_minimo, activo) on table public.ingredientes to authenticated;
grant update (nombre, unidad, stock_minimo, activo) on table public.ingredientes to authenticated;

create policy ingredientes_select on public.ingredientes
  for select to authenticated using (public.es_dueno());
create policy ingredientes_insert on public.ingredientes
  for insert to authenticated with check (public.es_dueno());
create policy ingredientes_update on public.ingredientes
  for update to authenticated using (public.es_dueno()) with check (public.es_dueno());

-- ---------------------------------------------------------------------------
-- compras y movimientos de ingredientes (solo por RPC) · FR-061, FR-062
-- ---------------------------------------------------------------------------
create table public.compras (
  id uuid primary key default gen_random_uuid(),
  ingrediente_id uuid not null references public.ingredientes (id) on delete restrict,
  cantidad numeric(12, 3) not null check (cantidad > 0),
  costo_total numeric(12, 2) not null check (costo_total >= 0),
  fecha date not null,
  anulado_en timestamptz,
  creado_en timestamptz not null default now(),
  creado_por uuid not null default auth.uid() references public.perfiles (id) on delete restrict
);

create index compras_ingrediente on public.compras (ingrediente_id);
create index compras_fecha on public.compras (fecha);

create table public.movimientos_ingrediente (
  id uuid primary key default gen_random_uuid(),
  ingrediente_id uuid not null references public.ingredientes (id) on delete restrict,
  cantidad numeric(12, 3) not null check (cantidad <> 0),
  tipo public.tipo_mov_ingrediente not null,
  motivo text,
  compra_id uuid references public.compras (id) on delete restrict,
  creado_en timestamptz not null default now(),
  creado_por uuid not null default auth.uid() references public.perfiles (id) on delete restrict,
  constraint mov_ing_compra check (tipo <> 'compra' or compra_id is not null),
  constraint mov_ing_ajuste_motivo check (tipo <> 'ajuste' or length(trim(coalesce(motivo, ''))) > 0)
);

create index movimientos_ingrediente_ingrediente on public.movimientos_ingrediente (ingrediente_id);

alter table public.compras enable row level security;
alter table public.movimientos_ingrediente enable row level security;

revoke all on table public.compras, public.movimientos_ingrediente from anon, authenticated;
grant select on table public.compras, public.movimientos_ingrediente to authenticated;

create policy compras_select on public.compras
  for select to authenticated using (public.es_dueno());
create policy movimientos_ingrediente_select on public.movimientos_ingrediente
  for select to authenticated using (public.es_dueno());

-- ---------------------------------------------------------------------------
-- gastos · BR-009, FR-064 (la pantalla de gastos llega en la Fase 5)
-- Los que vienen de una compra los crea registrar_compra y la app no los
-- toca; los demás son CRUD directo.
-- ---------------------------------------------------------------------------
create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias_gasto (id) on delete restrict,
  monto numeric(12, 2) not null check (monto > 0),
  fecha date not null,
  descripcion text,
  compra_id uuid unique references public.compras (id) on delete restrict,
  anulado_en timestamptz,
  creado_en timestamptz not null default now(),
  creado_por uuid not null default auth.uid() references public.perfiles (id) on delete restrict
);

create index gastos_fecha on public.gastos (fecha);

alter table public.gastos enable row level security;

revoke all on table public.gastos from anon, authenticated;
grant select on table public.gastos to authenticated;
-- compra_id no se concede: la app no puede crear ni cambiar gastos de compras.
grant insert (categoria_id, monto, fecha, descripcion) on table public.gastos to authenticated;
grant update (categoria_id, monto, fecha, descripcion, anulado_en) on table public.gastos to authenticated;

create policy gastos_select on public.gastos
  for select to authenticated using (public.es_dueno());
create policy gastos_insert on public.gastos
  for insert to authenticated with check (public.es_dueno() and compra_id is null);
create policy gastos_update on public.gastos
  for update to authenticated
  using (public.es_dueno() and compra_id is null)
  with check (public.es_dueno() and compra_id is null);

-- ---------------------------------------------------------------------------
-- Vistas de stock y alertas · FR-062, FR-063, FR-053, FR-054
-- ---------------------------------------------------------------------------
create view public.v_stock_ingredientes
with (security_invoker = true)
as
select
  i.id,
  i.nombre,
  i.unidad,
  i.activo,
  i.stock_minimo,
  coalesce(sum(m.cantidad), 0)::numeric(12, 3) as stock,
  (i.stock_minimo is not null and coalesce(sum(m.cantidad), 0) <= i.stock_minimo) as bajo_minimo
from public.ingredientes i
left join public.movimientos_ingrediente m on m.ingrediente_id = i.id
group by i.id;

-- Sabores e ingredientes activos en o bajo su mínimo, y sabores en negativo.
create view public.v_alertas_stock
with (security_invoker = true)
as
select
  'producto'::text as tipo,
  s.id,
  s.nombre,
  'uds'::text as unidad,
  s.stock::numeric(12, 3) as stock,
  s.stock_minimo::numeric(12, 3) as stock_minimo,
  s.negativo
from public.v_stock_productos s
where s.activo and (s.bajo_minimo or s.negativo)
union all
select
  'ingrediente',
  i.id,
  i.nombre,
  i.unidad,
  i.stock,
  i.stock_minimo,
  i.stock < 0
from public.v_stock_ingredientes i
where i.activo and i.bajo_minimo;

revoke all on table public.v_stock_ingredientes, public.v_alertas_stock from anon, authenticated;
grant select on table public.v_stock_ingredientes, public.v_alertas_stock to authenticated;

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------

-- Cantidad para textos: 1.5, 5, 0.375 (hasta 3 decimales, sin ceros de más).
create function privado.cant(p_cantidad numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select rtrim(to_char(p_cantidad, 'FM999999990.999'), '.');
$$;

-- FR-061, BR-009: compra + movimiento + gasto en "Ingredientes", todo junto.
create function public.registrar_compra(
  p_ingrediente_id uuid,
  p_cantidad numeric,
  p_costo_total numeric,
  p_fecha date default null
)
returns public.compras
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingrediente public.ingredientes;
  v_compra public.compras;
begin
  perform public.exigir_dueno();

  select * into v_ingrediente from public.ingredientes where id = p_ingrediente_id;
  if not found then
    raise exception 'El ingrediente no existe.' using errcode = '22023';
  end if;
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor que cero.' using errcode = '22023';
  end if;
  if p_costo_total is null or p_costo_total < 0 then
    raise exception 'Escribe cuánto costó la compra.' using errcode = '22023';
  end if;

  insert into public.compras (ingrediente_id, cantidad, costo_total, fecha)
  values (p_ingrediente_id, p_cantidad, p_costo_total, coalesce(p_fecha, public.hoy()))
  returning * into v_compra;

  insert into public.movimientos_ingrediente (ingrediente_id, cantidad, tipo, compra_id)
  values (p_ingrediente_id, p_cantidad, 'compra', v_compra.id);

  -- Una compra gratis (costo 0) no genera gasto.
  if p_costo_total > 0 then
    insert into public.gastos (categoria_id, monto, fecha, descripcion, compra_id)
    select c.id, p_costo_total, v_compra.fecha,
      'Compra: ' || privado.cant(p_cantidad) || ' ' || v_ingrediente.unidad
        || ' de ' || v_ingrediente.nombre,
      v_compra.id
    from public.categorias_gasto c
    where c.es_sistema and c.nombre = 'Ingredientes';
  end if;

  return v_compra;
end;
$$;

-- FR-062: deja el stock igual a lo contado con un movimiento por la diferencia.
-- Devuelve la diferencia (0 si ya coincidía; entonces no inserta nada).
create function public.registrar_conteo(p_ingrediente_id uuid, p_cantidad_contada numeric)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock numeric(12, 3);
  v_diferencia numeric(12, 3);
begin
  perform public.exigir_dueno();

  if not exists (select 1 from public.ingredientes where id = p_ingrediente_id) then
    raise exception 'El ingrediente no existe.' using errcode = '22023';
  end if;
  if p_cantidad_contada is null or p_cantidad_contada < 0 then
    raise exception 'Escribe cuánto hay (0 o más).' using errcode = '22023';
  end if;

  -- Bloquea el ingrediente para que dos conteos no se crucen.
  perform 1 from public.ingredientes where id = p_ingrediente_id for update;
  select coalesce(sum(cantidad), 0) into v_stock
  from public.movimientos_ingrediente where ingrediente_id = p_ingrediente_id;

  v_diferencia := p_cantidad_contada - v_stock;
  if v_diferencia <> 0 then
    insert into public.movimientos_ingrediente (ingrediente_id, cantidad, tipo, motivo)
    values (p_ingrediente_id, v_diferencia, 'conteo', 'Conteo: había ' || privado.cant(p_cantidad_contada));
  end if;
  return v_diferencia;
end;
$$;

-- FR-052: ajuste manual de catibías hechas con motivo.
create function public.ajustar_stock_producto(p_producto_id uuid, p_cantidad int, p_motivo text)
returns public.movimientos_producto
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mov public.movimientos_producto;
begin
  perform public.exigir_dueno();

  if not exists (select 1 from public.productos where id = p_producto_id) then
    raise exception 'El sabor no existe.' using errcode = '22023';
  end if;
  if p_cantidad is null or p_cantidad = 0 then
    raise exception 'El ajuste no puede ser 0.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'Elige el motivo del ajuste.' using errcode = '22023';
  end if;

  insert into public.movimientos_producto (producto_id, cantidad, tipo, motivo)
  values (p_producto_id, p_cantidad, 'ajuste', trim(p_motivo))
  returning * into v_mov;
  return v_mov;
end;
$$;

grant execute on function public.registrar_compra(uuid, numeric, numeric, date) to authenticated;
grant execute on function public.registrar_conteo(uuid, numeric) to authenticated;
grant execute on function public.ajustar_stock_producto(uuid, int, text) to authenticated;
