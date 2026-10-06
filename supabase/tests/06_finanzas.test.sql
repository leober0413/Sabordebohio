-- Fase 5 · resumen_financiero (FR-070 a FR-072, BR-010) y gastos (FR-064).
-- Se compara contra el resumen de hoy antes de crear los datos de la prueba.
begin;
select plan(17);

create function pg_temp.lineas(variadic args text[]) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object(
    'producto_id', (select id from public.productos where nombre = args[i]),
    'cantidad', args[i + 1]::int))
  from generate_subscripts(args, 1) i where i % 2 = 1
$$;
create temp table r (clave text primary key, datos jsonb);
create temp table t (clave text primary key, id uuid);
grant execute on all functions in schema pg_temp to authenticated;
grant all on r, t to authenticated;
-- Diferencia de un campo numérico entre el resumen nuevo y el inicial.
create function pg_temp.delta(campo text) returns numeric language sql as $$
  select (public.resumen_financiero(public.hoy(), public.hoy()) ->> campo)::numeric
       - ((select datos from r where clave = 'antes') ->> campo)::numeric
$$;
grant execute on all functions in schema pg_temp to authenticated;

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;

update public.config_precios set precio_suelta = 50, precio_docena = 550, minimo_docena = 6, redondeo = 1;
insert into public.productos (nombre, orden) values ('F-Pollo', 99);
with c as (insert into public.clientes (nombre) values ('Cliente Finanzas') returning id) insert into t select 'cli', id from c;

insert into r select 'antes', public.resumen_financiero(public.hoy(), public.hoy());

-- Pedido A: 6 F-Pollo + delivery 100 = 375, entregado y cobrado en efectivo.
select public.cambiar_estado(
  (public.crear_pedido((select id from t where clave = 'cli'), pg_temp.lineas('F-Pollo', '6'), null, null, 'delivery', 100)).id,
  'entregado', false, '{"metodo":"efectivo"}');
-- Pedido B: 4 F-Pollo = 200, entregado; abona 50 por transferencia → debe 150.
insert into t select 'b', id from public.crear_pedido((select id from t where clave = 'cli'), pg_temp.lineas('F-Pollo', '4'));
select public.cambiar_estado((select id from t where clave = 'b'), 'entregado');
select public.registrar_pago((select id from t where clave = 'b'), 50, 'transferencia');
-- Pedido C: no entregado, con pago de 20 → cuenta como cobrado, no como vendido.
insert into t select 'c', id from public.crear_pedido((select id from t where clave = 'cli'), pg_temp.lineas('F-Pollo', '1'));
insert into t select 'pagoc', id from public.registrar_pago((select id from t where clave = 'c'), 20, 'efectivo');
-- Gastos: gas 300, una compra de 450 y un gasto anulado que no cuenta.
insert into public.gastos (categoria_id, monto, fecha, descripcion)
  select id, 300, public.hoy(), 'Gas' from public.categorias_gasto where nombre = 'Ingredientes';
insert into public.ingredientes (nombre, unidad) values ('F-Queso', 'lb');
select public.registrar_compra((select id from public.ingredientes where nombre = 'F-Queso'), 3, 450);
insert into public.gastos (categoria_id, monto, fecha, descripcion)
  select id, 999, public.hoy(), 'F-Error' from public.categorias_gasto where nombre = 'Ingredientes';
update public.gastos set anulado_en = now() where descripcion = 'F-Error';

select is(pg_temp.delta('vendido'), 575.00, 'FR-070: vendido = pedidos entregados (375 + 200)');
select is(pg_temp.delta('envios'), 100.00, 'los envíos se ven aparte');
select is(pg_temp.delta('pedidos_entregados'), 2::numeric, 'cuenta solo los entregados');
select is(pg_temp.delta('cobrado'), 445.00, 'cobrado = pagos del período (375 + 50 + 20)');
select is(pg_temp.delta('cobrado_efectivo'), 395.00, 'FR-072: cobrado en efectivo (375 + 20)');
select is(pg_temp.delta('cobrado_transferencia'), 50.00, 'FR-072: cobrado por transferencia');
select is(pg_temp.delta('por_cobrar'), 150.00, 'BR-004: por cobrar = fiado de entregados (200 − 50)');
select is(pg_temp.delta('gastos'), 750.00, 'FR-064, BR-009: gastos = gas + compra; el anulado no cuenta');
select is(pg_temp.delta('ganancia_aprox'), -175.00, 'BR-010: ganancia aprox = vendido − gastos (575 − 750)');
select is(
  (select (u ->> 'cantidad')::int from jsonb_array_elements(public.resumen_financiero(public.hoy(), public.hoy()) -> 'unidades_por_sabor') u
   where u ->> 'nombre' = 'F-Pollo'),
  10, 'FR-071: unidades vendidas por sabor (6 + 4; el no entregado no cuenta)'
);

-- Anular un pago lo saca de lo cobrado.
select public.anular_pago((select id from t where clave = 'pagoc'));
select is(pg_temp.delta('cobrado'), 425.00, 'un pago anulado no cuenta como cobrado');

-- Revertir una entrega la saca de lo vendido.
select public.anular_pago(p.id) from public.pagos p where p.pedido_id = (select id from t where clave = 'b') and p.anulado_en is null;
select public.cambiar_estado((select id from t where clave = 'b'), 'listo');
select is(pg_temp.delta('vendido'), 375.00, 'revertir una entrega la saca de lo vendido');

-- Un período anterior no ve lo de hoy.
-- Todo lo de esta prueba se entregó hoy: ayer y antes no cambian.
select is(
  (public.resumen_financiero(public.hoy() - 30, public.hoy() - 1) ->> 'vendido')::numeric, 0.00,
  'el período filtra por el día real de entrega (nada entregado antes de hoy)'
);
select is(
  (public.resumen_financiero(public.hoy(), public.hoy() + 6) -> 'gastos_por_categoria') @> '[{"categoria": "Ingredientes"}]',
  true, 'gastos por categoría'
);
select throws_ok(
  $$select public.resumen_financiero(current_date, current_date - 1)$$,
  '22023', 'El período no es válido.', 'período al revés: error'
);
select throws_ok($$delete from public.gastos$$, '42501', null, 'los gastos no se borran: se anulan');

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select throws_ok(
  $$select public.resumen_financiero(current_date, current_date)$$,
  '42501', 'No tienes permiso para hacer esto.', 'intruso: no ve finanzas'
);

select * from finish();
rollback;
