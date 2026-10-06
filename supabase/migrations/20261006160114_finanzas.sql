-- Fase 5 · Resumen financiero (FR-070 a FR-072, BR-010) y gastos (FR-064).

-- Fecha de entrega real en la zona del negocio, para agrupar por día.
create function privado.dia_sd(p_momento timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select (p_momento at time zone 'America/Santo_Domingo')::date;
$$;

create index pedidos_entregado_dia on public.pedidos (privado.dia_sd(entregado_en))
  where estado = 'entregado';

-- ---------------------------------------------------------------------------
-- resumen_financiero(desde, hasta), ambos inclusive.
--   vendido:     total de los pedidos ENTREGADOS en el período (BR-010),
--                según el día real de entrega en Santo Domingo.
--   cobrado:     pagos no anulados con fecha en el período, y por método.
--   por_cobrar:  fiado vigente hoy (pedidos entregados con saldo, BR-004);
--                no depende del período.
--   gastos:      gastos no anulados del período (incluye compras), y por
--                categoría.
--   ganancia_aprox = vendido − gastos (BR-010).
--   unidades por sabor de los pedidos entregados en el período (FR-071).
-- security definer como el resto de las RPC: exige ser dueño antes de leer.
-- ---------------------------------------------------------------------------
create function public.resumen_financiero(p_desde date, p_hasta date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_resultado jsonb;
begin
  perform public.exigir_dueno();

  if p_desde is null or p_hasta is null or p_hasta < p_desde then
    raise exception 'El período no es válido.' using errcode = '22023';
  end if;

  with entregados as (
    select pe.id, pe.total, pe.costo_envio
    from public.pedidos pe
    where pe.estado = 'entregado'
      and privado.dia_sd(pe.entregado_en) between p_desde and p_hasta
  ),
  pagos as (
    select p.monto, p.metodo
    from public.pagos p
    where p.anulado_en is null and p.fecha between p_desde and p_hasta
  ),
  gastos as (
    select g.monto, c.nombre as categoria
    from public.gastos g
    join public.categorias_gasto c on c.id = g.categoria_id
    where g.anulado_en is null and g.fecha between p_desde and p_hasta
  ),
  unidades as (
    select pr.nombre, pr.orden, sum(l.cantidad)::int as cantidad
    from public.pedido_lineas l
    join entregados e on e.id = l.pedido_id
    join public.productos pr on pr.id = l.producto_id
    group by pr.nombre, pr.orden
  )
  select jsonb_build_object(
    'desde', p_desde,
    'hasta', p_hasta,
    'vendido', (select coalesce(sum(total), 0) from entregados),
    'envios', (select coalesce(sum(costo_envio), 0) from entregados),
    'pedidos_entregados', (select count(*) from entregados),
    'cobrado', (select coalesce(sum(monto), 0) from pagos),
    'cobrado_efectivo', (select coalesce(sum(monto), 0) from pagos where metodo = 'efectivo'),
    'cobrado_transferencia', (select coalesce(sum(monto), 0) from pagos where metodo = 'transferencia'),
    'por_cobrar', (select coalesce(sum(saldo), 0) from public.v_pedidos where estado = 'entregado' and saldo > 0),
    'gastos', (select coalesce(sum(monto), 0) from gastos),
    'gastos_por_categoria', coalesce(
      (select jsonb_agg(jsonb_build_object('categoria', categoria, 'monto', monto) order by monto desc)
       from (select categoria, sum(monto) as monto from gastos group by categoria) x),
      '[]'::jsonb),
    'unidades_por_sabor', coalesce(
      (select jsonb_agg(jsonb_build_object('nombre', nombre, 'cantidad', cantidad) order by orden, nombre)
       from unidades),
      '[]'::jsonb)
  ) into v_resultado;

  return v_resultado || jsonb_build_object(
    'ganancia_aprox', (v_resultado ->> 'vendido')::numeric - (v_resultado ->> 'gastos')::numeric
  );
end;
$$;

grant execute on function public.resumen_financiero(date, date) to authenticated;
