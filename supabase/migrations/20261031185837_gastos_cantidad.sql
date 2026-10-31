-- FR-064 · Cantidad en un gasto suelto ("3 paquetes de empaques a RD$150").
-- `monto` sigue siendo el total del gasto (lo que suman Finanzas y las
-- exportaciones); `cantidad` es opcional y el precio por unidad sale de
-- monto / cantidad. Los gastos anteriores y los de compras quedan en null.

alter table public.gastos
  add column cantidad integer check (cantidad is null or cantidad between 1 and 999);

grant insert (cantidad) on table public.gastos to authenticated;
grant update (cantidad) on table public.gastos to authenticated;

-- Actividad (FR-083): la foto del gasto incluye la cantidad.
create or replace function privado.foto_gasto(g public.gastos)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'categoria', (select c.nombre from public.categorias_gasto c where c.id = g.categoria_id),
    'monto', g.monto,
    'cantidad', g.cantidad,
    'fecha', g.fecha,
    'descripcion', g.descripcion
  );
$$;
