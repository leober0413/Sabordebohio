-- Fase 4 · Ingredientes, compras, conteos, ajustes, gastos y alertas
-- (FR-052, FR-060 a FR-065, BR-007, BR-009).
begin;
select plan(34);

create function pg_temp.stock(text) returns numeric language sql as
  $$ select stock from public.v_stock_ingredientes where nombre = $1 $$;
create function pg_temp.ing(text) returns uuid language sql as
  $$ select id from public.ingredientes where nombre = $1 $$;
create function pg_temp.alerta(text) returns boolean language sql as
  $$ select exists (select 1 from public.v_alertas_stock where nombre = $1) $$;
grant execute on all functions in schema pg_temp to authenticated;

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;

-- ---------- ingredientes (FR-060) ----------
select lives_ok(
  $$insert into public.ingredientes (nombre, unidad, stock_minimo) values ('T-Queso', 'lb', 2), ('T-Sal', 'lb', null)$$,
  'FR-060: crear "Queso" en libras con mínimo 2'
);
select throws_ok(
  $$insert into public.ingredientes (nombre, unidad) values (' t-queso ', 'lb')$$, '23505', null,
  'nombre de ingrediente único'
);
select throws_ok($$delete from public.ingredientes where nombre = 'T-Sal'$$, '42501', null, 'los ingredientes no se borran (BR-011)');
select is(pg_temp.stock('T-Queso'), 0.000::numeric, 'stock inicial 0');
select is(pg_temp.alerta('T-Queso'), true, 'stock 0 con mínimo 2: hay alerta');

-- ---------- compras (FR-061, BR-009) ----------
select lives_ok(
  format($$select public.registrar_compra(%L, 5, 750)$$, pg_temp.ing('T-Queso')),
  'FR-061: comprar 5 lb de queso a RD$750'
);
select is(pg_temp.stock('T-Queso'), 5.000::numeric, 'la compra sube el stock en 5');
select results_eq(
  $$select g.monto, g.fecha, c.nombre from public.gastos g
    join public.categorias_gasto c on c.id = g.categoria_id
    join public.compras co on co.id = g.compra_id
    where co.ingrediente_id = pg_temp.ing('T-Queso')$$,
  $$values (750.00::numeric, public.hoy(), 'Ingredientes'::text)$$,
  'BR-009: la compra es un gasto de hoy en "Ingredientes"'
);
select is(
  (select descripcion from public.gastos g join public.compras co on co.id = g.compra_id where co.ingrediente_id = pg_temp.ing('T-Queso')),
  'Compra: 5 lb de T-Queso', 'el gasto describe la compra'
);
select is(pg_temp.alerta('T-Queso'), false, 'con 5 lb y mínimo 2 no hay alerta');
select lives_ok(
  format($$select public.registrar_compra(%L, 1, 0)$$, pg_temp.ing('T-Sal')), 'compra regalada (costo 0)'
);
select is(
  (select count(*)::int from public.gastos g join public.compras co on co.id = g.compra_id where co.ingrediente_id = pg_temp.ing('T-Sal')),
  0, 'una compra de costo 0 no genera gasto'
);
select lives_ok(format($$select public.registrar_compra(%L, 0.375, 60)$$, pg_temp.ing('T-Sal')), 'compra con decimales');
select is(
  (select descripcion from public.gastos g join public.compras co on co.id = g.compra_id
   where co.ingrediente_id = pg_temp.ing('T-Sal') and co.cantidad = 0.375),
  'Compra: 0.375 lb de T-Sal', 'la descripción respeta los decimales'
);
select throws_ok(
  format($$select public.registrar_compra(%L, 0, 100)$$, pg_temp.ing('T-Queso')),
  '22023', 'La cantidad debe ser mayor que cero.', 'cantidad 0: error'
);

-- ---------- conteo (FR-062) y alertas (FR-063) ----------
select is(
  (select public.registrar_conteo(pg_temp.ing('T-Queso'), 1.5)), -3.500::numeric,
  'FR-062: contar 1.5 genera el movimiento por la diferencia (−3.5)'
);
select is(pg_temp.stock('T-Queso'), 1.500::numeric, 'FR-062: el stock queda en 1.5');
select is(
  (select tipo::text from public.movimientos_ingrediente where ingrediente_id = pg_temp.ing('T-Queso') order by creado_en desc, cantidad limit 1),
  'conteo', 'BR-007: queda como movimiento de conteo'
);
select is(pg_temp.alerta('T-Queso'), true, 'FR-063: queso = 1.5 con mínimo 2 → alerta');
select is(
  (select motivo from public.movimientos_ingrediente where ingrediente_id = pg_temp.ing('T-Queso') and tipo = 'conteo'),
  'Conteo: había 1.5', 'el conteo guarda lo contado con sus decimales'
);
select is((select public.registrar_conteo(pg_temp.ing('T-Queso'), 1.5)), 0.000::numeric, 'contar lo mismo no mueve nada');
select lives_ok(format($$select public.registrar_compra(%L, 5, 750)$$, pg_temp.ing('T-Queso')), 'comprar 5 lb más');
select is(pg_temp.alerta('T-Queso'), false, 'FR-063: al comprar, la alerta desaparece');
select is(pg_temp.alerta('T-Sal'), false, 'FR-063: un ingrediente sin mínimo nunca alerta');

-- FR-065: cambiar el mínimo de 2 a 3 con stock 2.5 hace aparecer la alerta.
select public.registrar_conteo(pg_temp.ing('T-Queso'), 2.5);
update public.ingredientes set stock_minimo = 3 where nombre = 'T-Queso';
select is(pg_temp.alerta('T-Queso'), true, 'FR-065: subir el mínimo a 3 con stock 2.5 → alerta inmediata');

-- ---------- ajuste de catibías (FR-052) ----------
insert into public.productos (nombre, stock_minimo) values ('T-Pollo', 1);
select is(
  (select cantidad from public.ajustar_stock_producto((select id from public.productos where nombre = 'T-Pollo'), -2, 'merma')),
  -2, 'FR-052: ajuste de −2 por merma'
);
select results_eq(
  $$select tipo::text, motivo, creado_por from public.movimientos_producto
    where producto_id = (select id from public.productos where nombre = 'T-Pollo')$$,
  $$values ('ajuste', 'merma', '11111111-1111-4111-8111-111111111111'::uuid)$$,
  'FR-052: el ajuste queda con motivo y usuario'
);
select is(pg_temp.alerta('T-Pollo'), true, 'FR-053/FR-054: sabor negativo o bajo mínimo también alerta');
select throws_ok(
  $$select public.ajustar_stock_producto((select id from public.productos where nombre = 'T-Pollo'), 3, '  ')$$,
  '22023', 'Elige el motivo del ajuste.', 'ajuste sin motivo: error'
);

-- ---------- gastos y permisos ----------
select lives_ok(
  $$insert into public.gastos (categoria_id, monto, fecha, descripcion)
    select id, 1200, current_date, 'Gas' from public.categorias_gasto where nombre = 'Ingredientes'$$,
  'un gasto suelto se crea directo'
);
update public.gastos set monto = 1 where compra_id is not null;
select is(
  (select count(*)::int from public.gastos where compra_id is not null and monto = 1), 0,
  'los gastos de compras no se editan desde la app'
);
select throws_ok(
  format($$insert into public.movimientos_ingrediente (ingrediente_id, cantidad, tipo) values (%L, 5, 'conteo')$$, pg_temp.ing('T-Queso')),
  '42501', null, 'no se insertan movimientos de ingredientes directo'
);

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select is_empty('select * from public.v_alertas_stock', 'intruso: no ve alertas ni stock');
select throws_ok(
  $$select public.registrar_compra(gen_random_uuid(), 1, 1)$$,
  '42501', 'No tienes permiso para hacer esto.', 'intruso: no registra compras'
);

select * from finish();
rollback;
