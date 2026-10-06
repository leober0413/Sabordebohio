-- Fase 2 · Pedidos, tandas y movimientos de stock de catibías.
-- docs/database.md. Estas tablas solo se escriben mediante RPC
-- (security definer); la app solo las lee (CLAUDE.md, regla 5).

-- "Hoy" del negocio (America/Santo_Domingo), no del servidor.
create function public.hoy()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Santo_Domingo')::date;
$$;

grant execute on function public.hoy() to authenticated;

-- ---------------------------------------------------------------------------
-- pedidos
-- ---------------------------------------------------------------------------
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  fecha_entrega date not null,
  hora_entrega time,
  tipo_entrega public.tipo_entrega not null default 'recoge',
  costo_envio numeric(12, 2) not null default 0 check (costo_envio >= 0),
  notas text,
  estado public.estado_pedido not null default 'pendiente',
  -- Precio aplicado al crear o editar (BR-001): no cambia si cambia la lista.
  unidades int not null check (unidades > 0),
  tarifa public.tarifa_aplicada not null,
  precio_suelta_aplicado numeric(12, 2),
  precio_docena_aplicado numeric(12, 2) not null,
  redondeo_aplicado int not null,
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  total numeric(12, 2) not null,
  entregado_en timestamptz,
  version int not null default 1,
  creado_en timestamptz not null default now(),
  creado_por uuid not null default auth.uid() references public.perfiles (id) on delete restrict,
  actualizado_en timestamptz not null default now(),
  constraint pedidos_envio_recoge check (tipo_entrega = 'delivery' or costo_envio = 0),
  constraint pedidos_total check (total = subtotal + costo_envio),
  constraint pedidos_entregado_en check ((entregado_en is not null) = (estado = 'entregado'))
);

create index pedidos_estado_fecha on public.pedidos (estado, fecha_entrega);
create index pedidos_fecha on public.pedidos (fecha_entrega);
create index pedidos_cliente on public.pedidos (cliente_id);

-- Cada cambio sube la versión (NFR-R-003) y la hora de actualización.
create function public.pedidos_versionar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger pedidos_versionar
  before update on public.pedidos
  for each row execute function public.pedidos_versionar();

create table public.pedido_lineas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete restrict,
  cantidad int not null check (cantidad > 0),
  creado_en timestamptz not null default now(),
  unique (pedido_id, producto_id)
);

create index pedido_lineas_producto on public.pedido_lineas (producto_id);

-- ---------------------------------------------------------------------------
-- tandas y movimientos de stock (BR-005 a BR-008)
-- ---------------------------------------------------------------------------
create table public.tandas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  notas text,
  creado_en timestamptz not null default now(),
  creado_por uuid not null default auth.uid() references public.perfiles (id) on delete restrict
);

create table public.movimientos_producto (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id) on delete restrict,
  cantidad int not null check (cantidad <> 0),
  tipo public.tipo_mov_producto not null,
  motivo text,
  pedido_id uuid references public.pedidos (id) on delete restrict,
  tanda_id uuid references public.tandas (id) on delete restrict,
  creado_en timestamptz not null default now(),
  creado_por uuid not null default auth.uid() references public.perfiles (id) on delete restrict,
  constraint mov_ajuste_motivo check (tipo <> 'ajuste' or length(trim(coalesce(motivo, ''))) > 0),
  constraint mov_tanda check (tipo <> 'tanda' or tanda_id is not null),
  constraint mov_pedido check (
    tipo not in ('entrega', 'reverso_entrega', 'hecho_al_momento') or pedido_id is not null
  )
);

create index movimientos_producto_producto on public.movimientos_producto (producto_id);
create index movimientos_producto_pedido on public.movimientos_producto (pedido_id);

-- ---------------------------------------------------------------------------
-- RLS: los dueños leen; nadie escribe directo (solo las RPC).
-- ---------------------------------------------------------------------------
alter table public.pedidos enable row level security;
alter table public.pedido_lineas enable row level security;
alter table public.tandas enable row level security;
alter table public.movimientos_producto enable row level security;

revoke all on table public.pedidos, public.pedido_lineas, public.tandas, public.movimientos_producto
  from anon, authenticated;
grant select on table public.pedidos, public.pedido_lineas, public.tandas, public.movimientos_producto
  to authenticated;

create policy pedidos_select on public.pedidos
  for select to authenticated using (public.es_dueno());
create policy pedido_lineas_select on public.pedido_lineas
  for select to authenticated using (public.es_dueno());
create policy tandas_select on public.tandas
  for select to authenticated using (public.es_dueno());
create policy movimientos_producto_select on public.movimientos_producto
  for select to authenticated using (public.es_dueno());

-- ---------------------------------------------------------------------------
-- Vistas (security_invoker: respetan RLS de quien consulta)
-- ---------------------------------------------------------------------------

-- FR-051, FR-053, FR-054
create view public.v_stock_productos
with (security_invoker = true)
as
select
  p.id,
  p.nombre,
  p.activo,
  p.orden,
  p.stock_minimo,
  coalesce(sum(m.cantidad), 0)::int as stock,
  (p.stock_minimo is not null and coalesce(sum(m.cantidad), 0) <= p.stock_minimo) as bajo_minimo,
  (coalesce(sum(m.cantidad), 0) < 0) as negativo
from public.productos p
left join public.movimientos_producto m on m.producto_id = p.id
group by p.id;

-- FR-030, FR-031. Las columnas de pagos (pagado, saldo, estado_pago) llegan en la Fase 3.
create view public.v_pedidos
with (security_invoker = true)
as
select
  pe.*,
  c.nombre as cliente_nombre,
  c.telefono as cliente_telefono,
  (pe.estado in ('pendiente', 'listo') and pe.fecha_entrega < public.hoy()) as atrasado,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'producto_id', l.producto_id,
          'nombre', pr.nombre,
          'cantidad', l.cantidad
        )
        order by pr.orden, pr.nombre
      )
      from public.pedido_lineas l
      join public.productos pr on pr.id = l.producto_id
      where l.pedido_id = pe.id
    ),
    '[]'::jsonb
  ) as lineas
from public.pedidos pe
join public.clientes c on c.id = pe.cliente_id;

revoke all on table public.v_stock_productos, public.v_pedidos from anon, authenticated;
grant select on table public.v_stock_productos, public.v_pedidos to authenticated;
