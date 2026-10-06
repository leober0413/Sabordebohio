-- Fase 3 · Pagos y fiado. docs/database.md, FR-040 a FR-043, BR-003, BR-004,
-- DEC-003. pagos y abonos solo se insertan; para deshacer se marca anulado_en.

create type public.estado_pago as enum ('pendiente', 'parcial', 'pagado');

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create table public.abonos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  monto numeric(12, 2) not null check (monto > 0),
  metodo public.metodo_pago not null,
  fecha date not null,
  anulado_en timestamptz,
  creado_en timestamptz not null default now(),
  creado_por uuid not null default auth.uid() references public.perfiles (id) on delete restrict
);

create index abonos_cliente on public.abonos (cliente_id);

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete restrict,
  abono_id uuid references public.abonos (id) on delete restrict,
  monto numeric(12, 2) not null check (monto > 0),
  metodo public.metodo_pago not null,
  fecha date not null,
  anulado_en timestamptz,
  creado_en timestamptz not null default now(),
  creado_por uuid not null default auth.uid() references public.perfiles (id) on delete restrict
);

create index pagos_pedido on public.pagos (pedido_id);
create index pagos_abono on public.pagos (abono_id);
create index pagos_fecha on public.pagos (fecha);

alter table public.abonos enable row level security;
alter table public.pagos enable row level security;

revoke all on table public.abonos, public.pagos from anon, authenticated;
grant select on table public.abonos, public.pagos to authenticated;

create policy abonos_select on public.abonos
  for select to authenticated using (public.es_dueno());
create policy pagos_select on public.pagos
  for select to authenticated using (public.es_dueno());

-- ---------------------------------------------------------------------------
-- Funciones internas (esquema privado)
-- ---------------------------------------------------------------------------

-- 'RD$1,234.50' para los mensajes de error.
create function privado.rd(p_monto numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'RD$' || to_char(p_monto, 'FM999,999,990.00');
$$;

create function privado.pagado_pedido(p_pedido_id uuid)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(monto), 0) from public.pagos
  where pedido_id = p_pedido_id and anulado_en is null;
$$;

create function privado.saldo_pedido(p_pedido_id uuid)
returns numeric
language sql
stable
set search_path = ''
as $$
  select pe.total - privado.pagado_pedido(pe.id) from public.pedidos pe where pe.id = p_pedido_id;
$$;

-- Inserta un pago validando el saldo. Quien llama ya bloqueó el pedido.
create function privado.insertar_pago(
  p_pedido_id uuid,
  p_monto numeric,
  p_metodo public.metodo_pago,
  p_fecha date,
  p_abono_id uuid default null
)
returns public.pagos
language plpgsql
set search_path = ''
as $$
declare
  v_saldo numeric(12, 2);
  v_pago public.pagos;
begin
  if p_metodo is null then
    raise exception 'Elige cómo pagó: efectivo o transferencia.' using errcode = '22023';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor que cero.' using errcode = '22023';
  end if;
  if (select estado from public.pedidos where id = p_pedido_id) = 'cancelado' then
    raise exception 'Un pedido cancelado no recibe pagos.' using errcode = '22023';
  end if;
  v_saldo := privado.saldo_pedido(p_pedido_id);
  if p_monto > v_saldo then
    raise exception 'El pago (%) supera el saldo del pedido (%).', privado.rd(p_monto), privado.rd(v_saldo)
      using errcode = '22023';
  end if;

  insert into public.pagos (pedido_id, abono_id, monto, metodo, fecha)
  values (p_pedido_id, p_abono_id, p_monto, p_metodo, coalesce(p_fecha, public.hoy()))
  returning * into v_pago;
  return v_pago;
end;
$$;

-- Pago desde JSON: {"metodo": "efectivo", "monto": null = todo el saldo, "fecha": null = hoy}.
create function privado.pagar_desde_json(p_pedido_id uuid, p_pago jsonb)
returns public.pagos
language plpgsql
set search_path = ''
as $$
declare
  v_metodo public.metodo_pago;
begin
  if (p_pago ->> 'metodo') not in ('efectivo', 'transferencia') then
    raise exception 'Elige cómo pagó: efectivo o transferencia.' using errcode = '22023';
  end if;
  v_metodo := (p_pago ->> 'metodo')::public.metodo_pago;
  return privado.insertar_pago(
    p_pedido_id,
    coalesce((p_pago ->> 'monto')::numeric, privado.saldo_pedido(p_pedido_id)),
    v_metodo,
    (p_pago ->> 'fecha')::date
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Vistas
-- ---------------------------------------------------------------------------

-- BR-003: estado de pago derivado. Se agregan columnas al final de v_pedidos.
create or replace view public.v_pedidos
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
  ) as lineas,
  pg.pagado,
  (pe.total - pg.pagado)::numeric(12, 2) as saldo,
  (case
    when pg.pagado >= pe.total then 'pagado'
    when pg.pagado > 0 then 'parcial'
    else 'pendiente'
  end)::public.estado_pago as estado_pago
from public.pedidos pe
join public.clientes c on c.id = pe.cliente_id
cross join lateral (
  select coalesce(sum(p.monto), 0)::numeric(12, 2) as pagado
  from public.pagos p
  where p.pedido_id = pe.id and p.anulado_en is null
) pg;

-- FR-042, FR-012, BR-004: saldo por cliente.
--   saldo_fiado: pedidos entregados con saldo (lo que "nos deben").
--   saldo_total: todos los pedidos no cancelados (incluye los por entregar).
create view public.v_saldos_clientes
with (security_invoker = true)
as
select
  c.id,
  c.nombre,
  c.telefono,
  c.activo,
  coalesce(sum(v.saldo) filter (where v.estado = 'entregado'), 0)::numeric(12, 2) as saldo_fiado,
  coalesce(sum(v.saldo) filter (where v.estado <> 'cancelado'), 0)::numeric(12, 2) as saldo_total,
  count(*) filter (where v.estado = 'entregado' and v.saldo > 0)::int as pedidos_fiados,
  min(v.fecha_entrega) filter (where v.estado = 'entregado' and v.saldo > 0) as fiado_desde
from public.clientes c
left join public.v_pedidos v on v.cliente_id = c.id
group by c.id;

revoke all on table public.v_saldos_clientes from anon, authenticated;
grant select on table public.v_saldos_clientes to authenticated;

-- ---------------------------------------------------------------------------
-- RPC de pagos (FR-040)
-- ---------------------------------------------------------------------------
create function public.registrar_pago(
  p_pedido_id uuid,
  p_monto numeric,
  p_metodo public.metodo_pago,
  p_fecha date default null
)
returns public.pagos
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_dueno();
  perform 1 from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'El pedido no existe.' using errcode = '22023';
  end if;
  return privado.insertar_pago(p_pedido_id, p_monto, p_metodo, p_fecha);
end;
$$;

create function public.anular_pago(p_pago_id uuid)
returns public.pagos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pago public.pagos;
begin
  perform public.exigir_dueno();
  select * into v_pago from public.pagos where id = p_pago_id for update;
  if not found then
    raise exception 'El pago no existe.' using errcode = '22023';
  end if;
  if v_pago.anulado_en is not null then
    raise exception 'Ese pago ya está anulado.' using errcode = '22023';
  end if;
  if v_pago.abono_id is not null then
    raise exception 'Este pago es parte de un abono. Anula el abono desde la ficha del cliente.'
      using errcode = '22023';
  end if;
  update public.pagos set anulado_en = now() where id = p_pago_id returning * into v_pago;
  return v_pago;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC de abonos (FR-043, DEC-003)
-- Sin pedido indicado, se reparte del pedido más viejo al más nuevo.
-- ---------------------------------------------------------------------------
create function public.registrar_abono(
  p_cliente_id uuid,
  p_monto numeric,
  p_metodo public.metodo_pago,
  p_fecha date default null,
  p_pedido_id uuid default null
)
returns public.abonos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_abono public.abonos;
  v_debe numeric(12, 2);
  v_resto numeric(12, 2);
  v_aplicar numeric(12, 2);
  v_pedido record;
begin
  perform public.exigir_dueno();

  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor que cero.' using errcode = '22023';
  end if;
  if p_metodo is null then
    raise exception 'Elige cómo pagó: efectivo o transferencia.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.clientes where id = p_cliente_id) then
    raise exception 'El cliente no existe.' using errcode = '22023';
  end if;

  -- Bloquea los pedidos del cliente para que dos abonos no se crucen.
  perform 1 from public.pedidos
  where cliente_id = p_cliente_id and estado <> 'cancelado'
  for update;

  if p_pedido_id is not null then
    if not exists (
      select 1 from public.pedidos
      where id = p_pedido_id and cliente_id = p_cliente_id and estado <> 'cancelado'
    ) then
      raise exception 'Ese pedido no es de este cliente o está cancelado.' using errcode = '22023';
    end if;
    v_debe := privado.saldo_pedido(p_pedido_id);
    if p_monto > v_debe then
      raise exception 'El abono (%) supera el saldo de ese pedido (%).', privado.rd(p_monto), privado.rd(v_debe)
        using errcode = '22023';
    end if;
  else
    select coalesce(sum(greatest(privado.saldo_pedido(id), 0)), 0) into v_debe
    from public.pedidos where cliente_id = p_cliente_id and estado <> 'cancelado';
    if v_debe = 0 then
      raise exception 'Este cliente no debe nada.' using errcode = '22023';
    end if;
    if p_monto > v_debe then
      raise exception 'El abono (%) supera lo que debe el cliente (%).', privado.rd(p_monto), privado.rd(v_debe)
        using errcode = '22023';
    end if;
  end if;

  insert into public.abonos (cliente_id, monto, metodo, fecha)
  values (p_cliente_id, p_monto, p_metodo, coalesce(p_fecha, public.hoy()))
  returning * into v_abono;

  if p_pedido_id is not null then
    perform privado.insertar_pago(p_pedido_id, p_monto, p_metodo, v_abono.fecha, v_abono.id);
  else
    v_resto := p_monto;
    for v_pedido in
      select pe.id, privado.saldo_pedido(pe.id) as saldo
      from public.pedidos pe
      where pe.cliente_id = p_cliente_id and pe.estado <> 'cancelado'
        and privado.saldo_pedido(pe.id) > 0
      order by pe.fecha_entrega, pe.creado_en
    loop
      exit when v_resto <= 0;
      v_aplicar := least(v_resto, v_pedido.saldo);
      perform privado.insertar_pago(v_pedido.id, v_aplicar, p_metodo, v_abono.fecha, v_abono.id);
      v_resto := v_resto - v_aplicar;
    end loop;
  end if;

  return v_abono;
end;
$$;

create function public.anular_abono(p_abono_id uuid)
returns public.abonos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_abono public.abonos;
begin
  perform public.exigir_dueno();
  select * into v_abono from public.abonos where id = p_abono_id for update;
  if not found then
    raise exception 'El abono no existe.' using errcode = '22023';
  end if;
  if v_abono.anulado_en is not null then
    raise exception 'Ese abono ya está anulado.' using errcode = '22023';
  end if;
  update public.pagos set anulado_en = now() where abono_id = p_abono_id and anulado_en is null;
  update public.abonos set anulado_en = now() where id = p_abono_id returning * into v_abono;
  return v_abono;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC de pedidos que cambian con los pagos
-- crear_pedido y cambiar_estado reciben p_pago; como cambia la firma, se
-- reemplazan (drop + create). actualizar_pedido conserva su firma.
-- ---------------------------------------------------------------------------
drop function public.crear_pedido(uuid, jsonb, date, time, public.tipo_entrega, numeric, text);
drop function public.cambiar_estado(uuid, public.estado_pedido, boolean);

create function public.crear_pedido(
  p_cliente_id uuid,
  p_lineas jsonb,
  p_fecha_entrega date default null,
  p_hora_entrega time default null,
  p_tipo_entrega public.tipo_entrega default 'recoge',
  p_costo_envio numeric default 0,
  p_notas text default null,
  p_pago jsonb default null
)
returns public.pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido public.pedidos;
  v_lineas jsonb;
  v_unidades int;
  v_precio record;
  v_envio numeric(12, 2);
begin
  perform public.exigir_dueno();

  if not exists (select 1 from public.clientes c where c.id = p_cliente_id and c.activo) then
    raise exception 'Elige un cliente.' using errcode = '22023';
  end if;

  select jsonb_agg(to_jsonb(l)), sum(l.cantidad)
    into v_lineas, v_unidades
    from privado.leer_lineas(p_lineas, true) l;

  select * into v_precio from public.calcular_precio(v_unidades);

  v_envio := case when p_tipo_entrega = 'delivery' then coalesce(p_costo_envio, 0) else 0 end;
  if v_envio < 0 then
    raise exception 'El costo de envío no puede ser negativo.' using errcode = '22023';
  end if;

  insert into public.pedidos (
    cliente_id, fecha_entrega, hora_entrega, tipo_entrega, costo_envio, notas,
    unidades, tarifa, precio_suelta_aplicado, precio_docena_aplicado, redondeo_aplicado,
    subtotal, total
  ) values (
    p_cliente_id, coalesce(p_fecha_entrega, public.hoy()), p_hora_entrega,
    coalesce(p_tipo_entrega, 'recoge'), v_envio, nullif(trim(p_notas), ''),
    v_unidades, v_precio.tarifa, v_precio.precio_suelta, v_precio.precio_docena, v_precio.redondeo,
    v_precio.subtotal, v_precio.subtotal + v_envio
  )
  returning * into v_pedido;

  insert into public.pedido_lineas (pedido_id, producto_id, cantidad)
  select v_pedido.id, l.producto_id, l.cantidad from jsonb_to_recordset(v_lineas) as l(producto_id uuid, cantidad int);

  -- Pago inicial opcional: {"metodo": ..., "monto": null = total, "fecha": ...}.
  if p_pago is not null then
    perform privado.pagar_desde_json(v_pedido.id, p_pago);
  end if;

  return v_pedido;
end;
$$;

create or replace function public.actualizar_pedido(
  p_id uuid,
  p_version int,
  p_cliente_id uuid,
  p_lineas jsonb,
  p_fecha_entrega date,
  p_hora_entrega time default null,
  p_tipo_entrega public.tipo_entrega default 'recoge',
  p_costo_envio numeric default 0,
  p_notas text default null
)
returns public.pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido public.pedidos;
  v_lineas jsonb;
  v_unidades int;
  v_precio record;
  v_envio numeric(12, 2);
  v_pagado numeric(12, 2);
begin
  perform public.exigir_dueno();

  select * into v_pedido from public.pedidos where id = p_id for update;
  if not found then
    raise exception 'El pedido no existe.' using errcode = '22023';
  end if;
  if v_pedido.version <> p_version then
    raise exception 'El pedido fue modificado por otra persona. Recarga para ver los cambios.'
      using errcode = '22023';
  end if;
  if v_pedido.estado not in ('pendiente', 'listo') then
    raise exception 'Un pedido entregado o cancelado no se puede editar.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.clientes c where c.id = p_cliente_id) then
    raise exception 'Elige un cliente.' using errcode = '22023';
  end if;

  -- Sabores desactivados se permiten si ya estaban en el pedido.
  select jsonb_agg(to_jsonb(l)), sum(l.cantidad)
    into v_lineas, v_unidades
    from privado.leer_lineas(p_lineas, false) l;
  if exists (
    select 1 from jsonb_to_recordset(v_lineas) as l(producto_id uuid, cantidad int)
    join public.productos p on p.id = l.producto_id
    where not p.activo
      and not exists (
        select 1 from public.pedido_lineas pl where pl.pedido_id = p_id and pl.producto_id = l.producto_id
      )
  ) then
    raise exception 'No puedes agregar un sabor desactivado.' using errcode = '22023';
  end if;

  select * into v_precio from public.calcular_precio(v_unidades);

  v_envio := case when p_tipo_entrega = 'delivery' then coalesce(p_costo_envio, 0) else 0 end;
  if v_envio < 0 then
    raise exception 'El costo de envío no puede ser negativo.' using errcode = '22023';
  end if;

  v_pagado := privado.pagado_pedido(p_id);
  if v_precio.subtotal + v_envio < v_pagado then
    raise exception 'El nuevo total (%) es menor que lo ya pagado (%). Anula un pago primero.',
      privado.rd(v_precio.subtotal + v_envio), privado.rd(v_pagado) using errcode = '22023';
  end if;

  update public.pedidos set
    cliente_id = p_cliente_id,
    fecha_entrega = coalesce(p_fecha_entrega, v_pedido.fecha_entrega),
    hora_entrega = p_hora_entrega,
    tipo_entrega = coalesce(p_tipo_entrega, 'recoge'),
    costo_envio = v_envio,
    notas = nullif(trim(p_notas), ''),
    unidades = v_unidades,
    tarifa = v_precio.tarifa,
    precio_suelta_aplicado = v_precio.precio_suelta,
    precio_docena_aplicado = v_precio.precio_docena,
    redondeo_aplicado = v_precio.redondeo,
    subtotal = v_precio.subtotal,
    total = v_precio.subtotal + v_envio
  where id = p_id
  returning * into v_pedido;

  delete from public.pedido_lineas where pedido_id = p_id;
  insert into public.pedido_lineas (pedido_id, producto_id, cantidad)
  select p_id, l.producto_id, l.cantidad from jsonb_to_recordset(v_lineas) as l(producto_id uuid, cantidad int);

  return v_pedido;
end;
$$;

create function public.cambiar_estado(
  p_id uuid,
  p_estado public.estado_pedido,
  p_hecho_al_momento boolean default false,
  p_pago jsonb default null
)
returns public.pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido public.pedidos;
begin
  perform public.exigir_dueno();

  select * into v_pedido from public.pedidos where id = p_id for update;
  if not found then
    raise exception 'El pedido no existe.' using errcode = '22023';
  end if;
  if v_pedido.estado = p_estado then
    raise exception 'El pedido ya está %.', p_estado using errcode = '22023';
  end if;
  if p_estado = 'entregado' and v_pedido.estado = 'cancelado' then
    raise exception 'Un pedido cancelado no se puede entregar. Reactívalo primero.' using errcode = '22023';
  end if;
  if p_hecho_al_momento and p_estado <> 'entregado' then
    raise exception '"Hecho al momento" solo aplica al entregar.' using errcode = '22023';
  end if;
  if p_pago is not null and p_estado <> 'entregado' then
    raise exception 'Solo se puede cobrar al entregar.' using errcode = '22023';
  end if;
  if p_estado = 'cancelado' and privado.pagado_pedido(p_id) > 0 then
    raise exception 'Este pedido tiene pagos. Anúlalos antes de cancelarlo.' using errcode = '22023';
  end if;

  -- Sale de entregado: reintegra lo que siguen descontando las entregas del
  -- pedido. No toca los movimientos `hecho_al_momento` (DEC-006).
  if v_pedido.estado = 'entregado' then
    insert into public.movimientos_producto (producto_id, cantidad, tipo, pedido_id)
    select m.producto_id, -sum(m.cantidad), 'reverso_entrega', p_id
    from public.movimientos_producto m
    where m.pedido_id = p_id
      and m.tipo in ('entrega', 'reverso_entrega')
    group by m.producto_id
    having sum(m.cantidad) <> 0;
  end if;

  if p_estado = 'entregado' then
    if p_hecho_al_momento then
      insert into public.movimientos_producto (producto_id, cantidad, tipo, pedido_id)
      select l.producto_id, l.cantidad, 'hecho_al_momento', p_id
      from public.pedido_lineas l where l.pedido_id = p_id;
    end if;
    insert into public.movimientos_producto (producto_id, cantidad, tipo, pedido_id)
    select l.producto_id, -l.cantidad, 'entrega', p_id
    from public.pedido_lineas l where l.pedido_id = p_id;
  end if;

  update public.pedidos set
    estado = p_estado,
    entregado_en = case when p_estado = 'entregado' then now() else null end
  where id = p_id
  returning * into v_pedido;

  -- FR-041: "pagado completo" al entregar. Si ya no hay saldo, no hace nada.
  if p_pago is not null and privado.saldo_pedido(p_id) > 0 then
    perform privado.pagar_desde_json(p_id, p_pago);
  end if;

  return v_pedido;
end;
$$;

grant execute on function public.crear_pedido(uuid, jsonb, date, time, public.tipo_entrega, numeric, text, jsonb)
  to authenticated;
grant execute on function public.cambiar_estado(uuid, public.estado_pedido, boolean, jsonb) to authenticated;
grant execute on function public.registrar_pago(uuid, numeric, public.metodo_pago, date) to authenticated;
grant execute on function public.anular_pago(uuid) to authenticated;
grant execute on function public.registrar_abono(uuid, numeric, public.metodo_pago, date, uuid) to authenticated;
grant execute on function public.anular_abono(uuid) to authenticated;
