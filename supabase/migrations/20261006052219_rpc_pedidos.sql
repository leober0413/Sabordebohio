-- Fase 2 · RPC de pedidos y tandas. Cada una es una transacción, verifica que
-- quien llama sea dueño y lanza errores de negocio en español (código 22023).

-- Esquema para funciones internas: PostgREST no lo expone y nadie tiene uso.
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Interno: valida y normaliza líneas [{producto_id, cantidad}, ...].
-- Solo lo usan las RPC de abajo (security definer).
-- ---------------------------------------------------------------------------
create function privado.leer_lineas(p_lineas jsonb, p_solo_activos boolean)
returns table (producto_id uuid, cantidad int)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_inactivo text;
begin
  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception 'Agrega al menos una catibía.' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_lineas) e
    where (e ->> 'producto_id') is null
       or (e ->> 'cantidad') is null
       or (e ->> 'cantidad') !~ '^\d+$'
  ) then
    raise exception 'Las cantidades deben ser números enteros.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_lineas) e
    left join public.productos p on p.id = (e ->> 'producto_id')::uuid
    where p.id is null
  ) then
    raise exception 'Uno de los sabores no existe.' using errcode = '22023';
  end if;

  if p_solo_activos then
    select p.nombre into v_inactivo
    from jsonb_array_elements(p_lineas) e
    join public.productos p on p.id = (e ->> 'producto_id')::uuid
    where not p.activo
    limit 1;
    if v_inactivo is not null then
      raise exception 'El sabor "%" está desactivado.', v_inactivo using errcode = '22023';
    end if;
  end if;

  -- Suma repetidos y descarta cantidades en 0.
  return query
    select (e ->> 'producto_id')::uuid, sum((e ->> 'cantidad')::int)::int
    from jsonb_array_elements(p_lineas) e
    group by 1
    having sum((e ->> 'cantidad')::int) > 0;

  if not found then
    raise exception 'Agrega al menos una catibía.' using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- crear_pedido · FR-020, FR-021, BR-001, BR-002, BR-012
-- El pago inicial (FR-041) se agrega en la Fase 3.
-- ---------------------------------------------------------------------------
create function public.crear_pedido(
  p_cliente_id uuid,
  p_lineas jsonb,
  p_fecha_entrega date default null,
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

  return v_pedido;
end;
$$;

-- ---------------------------------------------------------------------------
-- actualizar_pedido · FR-024, NFR-R-003
-- Recalcula el precio con la lista ACTUAL. Solo pedidos pendientes o listos.
-- ---------------------------------------------------------------------------
create function public.actualizar_pedido(
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

-- ---------------------------------------------------------------------------
-- cambiar_estado · FR-022, FR-023, FR-025, FR-026, BR-005, BR-006
--
-- Transiciones: pendiente ↔ listo; pendiente|listo → entregado;
-- entregado → listo|pendiente (revertir); cualquiera → cancelado;
-- cancelado → pendiente|listo (reactivar, para "Deshacer").
--
-- Entregar inserta un movimiento `entrega` (−cantidad) por sabor; con
-- "hecho al momento" inserta además `hecho_al_momento` (+cantidad).
-- Salir de entregado deja en 0 el efecto neto del pedido sobre el stock con
-- `reverso_entrega` (DEC-006): deshace la entrega y, si se hizo al momento,
-- también esa producción.
-- ---------------------------------------------------------------------------
create function public.cambiar_estado(
  p_id uuid,
  p_estado public.estado_pedido,
  p_hecho_al_momento boolean default false
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

  -- Sale de entregado: devuelve a 0 el efecto neto del pedido en el stock.
  if v_pedido.estado = 'entregado' then
    insert into public.movimientos_producto (producto_id, cantidad, tipo, pedido_id)
    select m.producto_id, -sum(m.cantidad), 'reverso_entrega', p_id
    from public.movimientos_producto m
    where m.pedido_id = p_id
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

  return v_pedido;
end;
$$;

-- ---------------------------------------------------------------------------
-- registrar_tanda · FR-050, BR-005
-- ---------------------------------------------------------------------------
create function public.registrar_tanda(
  p_lineas jsonb,
  p_fecha date default null,
  p_notas text default null
)
returns public.tandas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tanda public.tandas;
  v_lineas jsonb;
begin
  perform public.exigir_dueno();

  select jsonb_agg(to_jsonb(l)) into v_lineas from privado.leer_lineas(p_lineas, true) l;

  insert into public.tandas (fecha, notas)
  values (coalesce(p_fecha, public.hoy()), nullif(trim(p_notas), ''))
  returning * into v_tanda;

  insert into public.movimientos_producto (producto_id, cantidad, tipo, tanda_id)
  select l.producto_id, l.cantidad, 'tanda', v_tanda.id from jsonb_to_recordset(v_lineas) as l(producto_id uuid, cantidad int);

  return v_tanda;
end;
$$;

grant execute on function public.crear_pedido(uuid, jsonb, date, time, public.tipo_entrega, numeric, text)
  to authenticated;
grant execute on function public.actualizar_pedido(uuid, int, uuid, jsonb, date, time, public.tipo_entrega, numeric, text)
  to authenticated;
grant execute on function public.cambiar_estado(uuid, public.estado_pedido, boolean) to authenticated;
grant execute on function public.registrar_tanda(jsonb, date, text) to authenticated;
