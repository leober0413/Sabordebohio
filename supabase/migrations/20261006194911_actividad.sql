-- Actividad (FR-083): registro de lo que hacen los dueños. Quién, qué y
-- cuándo; en las ediciones, antes → después.
--
-- Solo lo escriben triggers (no se tocan las RPC). Cada acción guarda una
-- "foto" en jsonb con los nombres ya resueltos (cliente, sabor, categoría),
-- así se lee igual aunque luego cambien. La app arma el texto (src/features/
-- actividad/describir.ts).
--
-- Una acción = una fila por (transacción, entidad, registro): crear un pedido
-- con sus líneas o editarlo queda en una sola entrada. Lo que es consecuencia
-- de otra acción no se anota aparte (movimientos de una entrega o de una tanda,
-- pagos repartidos por un abono, el gasto y el movimiento de una compra).

create table public.actividad (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  creado_por uuid references public.perfiles (id) on delete set null,
  transaccion bigint not null default txid_current(),
  entidad text not null,
  entidad_id text not null,
  accion text not null check (accion in ('crear', 'editar', 'anular', 'restaurar')),
  antes jsonb,
  despues jsonb,
  constraint actividad_una_por_accion unique (transaccion, entidad, entidad_id)
);

comment on table public.actividad is
  'FR-083: registro de acciones de los dueños. Solo lo escriben triggers; nadie lo edita ni lo borra.';

create index actividad_creado_en on public.actividad (creado_en desc);
create index actividad_entidad_creado_en on public.actividad (entidad, creado_en desc);
create index actividad_creado_por on public.actividad (creado_por);

alter table public.actividad enable row level security;

revoke all on table public.actividad from anon, authenticated;
grant select on table public.actividad to authenticated;

create policy actividad_select on public.actividad
  for select to authenticated using (public.es_dueno());

-- ---------------------------------------------------------------------------
-- Ayudantes
-- ---------------------------------------------------------------------------

-- El dueño que actúa; null si no es un dueño (seed, migraciones, service role).
create function privado.actor()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.perfiles p where p.id = auth.uid();
$$;

-- Anota una acción. Si ya hay una del mismo registro en esta transacción, se
-- conserva el primer "antes" y se toma el último "después".
create function privado.anotar(
  p_entidad text,
  p_id text,
  p_accion text,
  p_antes jsonb,
  p_despues jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.actividad (creado_por, entidad, entidad_id, accion, antes, despues)
  values (privado.actor(), p_entidad, p_id, p_accion, p_antes, p_despues)
  on conflict on constraint actividad_una_por_accion do update
    set despues = excluded.despues,
        accion = case when public.actividad.accion = 'crear' then 'crear' else excluded.accion end;
end;
$$;

-- crear / editar / anular / restaurar según cambie anulado_en.
create function privado.accion_anulable(p_op text, p_antes timestamptz, p_despues timestamptz)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_op = 'INSERT' then 'crear'
    when p_antes is null and p_despues is not null then 'anular'
    when p_antes is not null and p_despues is null then 'restaurar'
    else 'editar'
  end;
$$;

create function privado.cantidades_pedido(p_pedido_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(pr.nombre, l.cantidad), '{}'::jsonb)
  from public.pedido_lineas l
  join public.productos pr on pr.id = l.producto_id
  where l.pedido_id = p_pedido_id;
$$;

create function privado.foto_pedido(p public.pedidos)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'cliente', (select c.nombre from public.clientes c where c.id = p.cliente_id),
    'fecha_entrega', p.fecha_entrega,
    'hora_entrega', p.hora_entrega,
    'tipo_entrega', p.tipo_entrega,
    'costo_envio', p.costo_envio,
    'total', p.total,
    'estado', p.estado,
    'notas', p.notas,
    'cantidades', privado.cantidades_pedido(p.id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Catálogos y precios: clientes, sabores, ingredientes, categorías, precios.
-- Se guardan las columnas editables; un cambio que no altera ninguna (por
-- ejemplo, reordenar sabores) no se anota.
-- ---------------------------------------------------------------------------
create function privado.actividad_catalogo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fuera text[] := array[
    'id', 'creado_en', 'creado_por', 'orden', 'es_sistema', 'actualizado_en', 'actualizado_por'
  ];
  v_despues jsonb := to_jsonb(new) - v_fuera;
  v_antes jsonb;
begin
  if tg_op = 'INSERT' then
    perform privado.anotar(tg_argv[0], to_jsonb(new) ->> 'id', 'crear', null, v_despues);
  else
    v_antes := to_jsonb(old) - v_fuera;
    if v_antes is distinct from v_despues then
      perform privado.anotar(tg_argv[0], to_jsonb(new) ->> 'id', 'editar', v_antes, v_despues);
    end if;
  end if;
  return null;
end;
$$;

create trigger actividad after insert or update on public.clientes
  for each row execute function privado.actividad_catalogo('cliente');
create trigger actividad after insert or update on public.productos
  for each row execute function privado.actividad_catalogo('producto');
create trigger actividad after insert or update on public.ingredientes
  for each row execute function privado.actividad_catalogo('ingrediente');
create trigger actividad after insert or update on public.categorias_gasto
  for each row execute function privado.actividad_catalogo('categoria_gasto');
create trigger actividad after update on public.config_precios
  for each row execute function privado.actividad_catalogo('precios');

-- ---------------------------------------------------------------------------
-- Pedidos. Las líneas se cambian después del update del pedido (borrar y
-- volver a insertar), así que el "antes" se toma en el update y las
-- cantidades del "después" se recalculan con cada cambio de líneas.
-- ---------------------------------------------------------------------------
create function privado.actividad_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform privado.anotar('pedido', new.id::text, 'crear', null, privado.foto_pedido(new));
  else
    perform privado.anotar('pedido', new.id::text, 'editar', privado.foto_pedido(old), privado.foto_pedido(new));
  end if;
  return null;
end;
$$;

create trigger actividad after insert or update on public.pedidos
  for each row execute function privado.actividad_pedido();

create function privado.actividad_pedido_lineas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido_id uuid := coalesce(new.pedido_id, old.pedido_id);
begin
  update public.actividad
  set despues = jsonb_set(coalesce(despues, '{}'::jsonb), '{cantidades}', privado.cantidades_pedido(v_pedido_id))
  where transaccion = txid_current() and entidad = 'pedido' and entidad_id = v_pedido_id::text;
  return null;
end;
$$;

create trigger actividad after insert or update or delete on public.pedido_lineas
  for each row execute function privado.actividad_pedido_lineas();

-- ---------------------------------------------------------------------------
-- Dinero: pagos, abonos, gastos y compras.
-- ---------------------------------------------------------------------------
create function privado.actividad_pago()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_foto jsonb;
begin
  -- Los pagos que reparte un abono se ven en el abono (DEC-003).
  if new.abono_id is not null then
    return null;
  end if;
  v_foto := jsonb_build_object(
    'pedido_id', new.pedido_id,
    'cliente', (
      select c.nombre from public.pedidos p join public.clientes c on c.id = p.cliente_id
      where p.id = new.pedido_id
    ),
    'monto', new.monto,
    'metodo', new.metodo,
    'fecha', new.fecha
  );
  perform privado.anotar(
    'pago', new.id::text,
    privado.accion_anulable(tg_op, case when tg_op = 'UPDATE' then old.anulado_en end, new.anulado_en),
    null, v_foto
  );
  return null;
end;
$$;

create trigger actividad after insert or update on public.pagos
  for each row execute function privado.actividad_pago();

create function privado.actividad_abono()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.anotar(
    'abono', new.id::text,
    privado.accion_anulable(tg_op, case when tg_op = 'UPDATE' then old.anulado_en end, new.anulado_en),
    null,
    jsonb_build_object(
      'cliente_id', new.cliente_id,
      'cliente', (select c.nombre from public.clientes c where c.id = new.cliente_id),
      'monto', new.monto,
      'metodo', new.metodo,
      'fecha', new.fecha
    )
  );
  return null;
end;
$$;

create trigger actividad after insert or update on public.abonos
  for each row execute function privado.actividad_abono();

create function privado.foto_gasto(g public.gastos)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'categoria', (select c.nombre from public.categorias_gasto c where c.id = g.categoria_id),
    'monto', g.monto,
    'fecha', g.fecha,
    'descripcion', g.descripcion
  );
$$;

create function privado.actividad_gasto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_accion text;
begin
  -- El gasto de una compra (BR-009) se ve en la compra.
  if new.compra_id is not null then
    return null;
  end if;
  v_accion := privado.accion_anulable(tg_op, case when tg_op = 'UPDATE' then old.anulado_en end, new.anulado_en);
  if v_accion = 'editar' and privado.foto_gasto(old) is not distinct from privado.foto_gasto(new) then
    return null;
  end if;
  perform privado.anotar(
    'gasto', new.id::text, v_accion,
    case when v_accion = 'editar' then privado.foto_gasto(old) end,
    privado.foto_gasto(new)
  );
  return null;
end;
$$;

create trigger actividad after insert or update on public.gastos
  for each row execute function privado.actividad_gasto();

create function privado.actividad_compra()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.anotar(
    'compra', new.id::text,
    privado.accion_anulable(tg_op, case when tg_op = 'UPDATE' then old.anulado_en end, new.anulado_en),
    null,
    (
      select jsonb_build_object(
        'ingrediente', i.nombre, 'unidad', i.unidad,
        'cantidad', new.cantidad, 'costo_total', new.costo_total, 'fecha', new.fecha
      )
      from public.ingredientes i where i.id = new.ingrediente_id
    )
  );
  return null;
end;
$$;

create trigger actividad after insert or update on public.compras
  for each row execute function privado.actividad_compra();

-- ---------------------------------------------------------------------------
-- Inventario: tandas y ajustes o conteos de stock.
-- ---------------------------------------------------------------------------
create function privado.actividad_tanda()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.anotar(
    'tanda', new.id::text, 'crear', null,
    jsonb_build_object('fecha', new.fecha, 'notas', new.notas, 'cantidades', '{}'::jsonb)
  );
  return null;
end;
$$;

create trigger actividad after insert on public.tandas
  for each row execute function privado.actividad_tanda();

-- Solo se insertan (CLAUDE.md, regla 6). Entregas y reversos son parte del
-- cambio de estado del pedido; la producción, de la tanda.
create function privado.actividad_mov_producto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text := (select p.nombre from public.productos p where p.id = new.producto_id);
  v_stock int;
begin
  if new.tanda_id is not null then
    update public.actividad
    set despues = jsonb_set(
      despues, '{cantidades}',
      coalesce(despues -> 'cantidades', '{}'::jsonb) || jsonb_build_object(v_nombre, new.cantidad)
    )
    where transaccion = txid_current() and entidad = 'tanda' and entidad_id = new.tanda_id::text;
  elsif new.pedido_id is null then
    select coalesce(sum(m.cantidad), 0) into v_stock
    from public.movimientos_producto m where m.producto_id = new.producto_id;
    perform privado.anotar(
      'ajuste_producto', new.id::text, 'crear',
      jsonb_build_object('stock', v_stock - new.cantidad),
      jsonb_build_object(
        'producto', v_nombre, 'cantidad', new.cantidad, 'motivo', new.motivo, 'stock', v_stock
      )
    );
  end if;
  return null;
end;
$$;

create trigger actividad after insert on public.movimientos_producto
  for each row execute function privado.actividad_mov_producto();

create function privado.actividad_mov_ingrediente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock numeric(12, 3);
begin
  if new.compra_id is not null then
    return null;
  end if;
  select coalesce(sum(m.cantidad), 0) into v_stock
  from public.movimientos_ingrediente m where m.ingrediente_id = new.ingrediente_id;
  perform privado.anotar(
    'ajuste_ingrediente', new.id::text, 'crear',
    jsonb_build_object('stock', v_stock - new.cantidad),
    (
      select jsonb_build_object(
        'ingrediente', i.nombre, 'unidad', i.unidad, 'tipo', new.tipo,
        'cantidad', new.cantidad, 'motivo', new.motivo, 'stock', v_stock
      )
      from public.ingredientes i where i.id = new.ingrediente_id
    )
  );
  return null;
end;
$$;

create trigger actividad after insert on public.movimientos_ingrediente
  for each row execute function privado.actividad_mov_ingrediente();
