-- DEC-006 (ADOPTED por el dueño, 2026-10-06): al revertir o cancelar una
-- entrega "hecho al momento", las catibías vuelven al stock. Antes se
-- deshacía también la producción y el efecto neto quedaba en 0.
-- Solo cambia el cálculo del reverso; firma y permisos siguen iguales.

-- ---------------------------------------------------------------------------
-- cambiar_estado · FR-022, FR-023, FR-025, FR-026, BR-005, BR-006
--
-- Transiciones: pendiente ↔ listo; pendiente|listo → entregado;
-- entregado → listo|pendiente (revertir); cualquiera → cancelado;
-- cancelado → pendiente|listo (reactivar, para "Deshacer").
--
-- Entregar inserta un movimiento `entrega` (−cantidad) por sabor; con
-- "hecho al momento" inserta además `hecho_al_momento` (+cantidad).
-- Salir de entregado reintegra lo que descontaron las entregas con
-- `reverso_entrega` (BR-006, DEC-006). La producción "hecha al momento" se
-- conserva: esas catibías vuelven al stock.
-- ---------------------------------------------------------------------------
create or replace function public.cambiar_estado(
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

  return v_pedido;
end;
$$;
