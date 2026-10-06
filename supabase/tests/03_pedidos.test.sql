-- Fase 2 · crear_pedido, actualizar_pedido, cambiar_estado, registrar_tanda,
-- stock (BR-001, BR-002, BR-005 a BR-008, FR-020 a FR-026, NFR-R-003).
begin;
select plan(46);

-- Ayudantes: ids del seed y stock actual.
create function pg_temp.prod(text) returns uuid language sql as
  $$ select id from public.productos where nombre = $1 $$;
create function pg_temp.stock(text) returns int language sql as
  $$ select stock from public.v_stock_productos where nombre = $1 $$;
create function pg_temp.lineas(variadic args text[]) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('producto_id', pg_temp.prod(args[i]), 'cantidad', args[i + 1]::int))
  from generate_subscripts(args, 1) i where i % 2 = 1
$$;

-- Ninguna función nueva es ejecutable por defecto (migración base): se conceden aquí.
grant execute on all functions in schema pg_temp to authenticated;
create temp table t (clave text primary key, id uuid, version int);
grant all on t to authenticated;
insert into t (clave, id)
select 'cliente', id from public.clientes where nombre = 'María Pérez';

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;

-- Sabores propios de la prueba: el stock del seed no la afecta.
insert into public.productos (nombre, orden) values ('T-Pollo', 91), ('T-Res', 92), ('T-Queso', 93);

-- ---------- crear_pedido ----------
-- FR-020: 4 pollo + 2 queso para mañana 4 pm, delivery RD$100 → 275 + 100.
insert into t (clave, id, version)
select 'p1', id, version from public.crear_pedido(
  (select id from t where clave = 'cliente'),
  pg_temp.lineas('T-Pollo', '4', 'T-Queso', '2'),
  public.hoy() + 1, '16:00', 'delivery', 100, 'Sin picante'
);
select results_eq(
  $$select unidades, tarifa::text, subtotal, costo_envio, total, estado::text
    from public.pedidos where id = (select id from t where clave = 'p1')$$,
  $$values (6, 'docena', 275.00::numeric, 100.00::numeric, 375.00::numeric, 'pendiente')$$,
  'FR-020: 4 pollo + 2 queso con delivery 100 → total 375'
);
select is(
  (select count(*)::int from public.pedido_lineas where pedido_id = (select id from t where clave = 'p1')),
  2, 'guarda una línea por sabor'
);
select is(
  (select creado_por from public.pedidos where id = (select id from t where clave = 'p1')),
  '11111111-1111-4111-8111-111111111111'::uuid, 'FR-082: guarda quién lo creó'
);

-- FR-021: sin fecha → hoy; recoge ignora el costo de envío.
insert into t (clave, id, version)
select 'p2', id, version from public.crear_pedido(
  (select id from t where clave = 'cliente'), pg_temp.lineas('T-Res', '3'),
  null, null, 'recoge', 80, null
);
select results_eq(
  $$select fecha_entrega, costo_envio, subtotal, total from public.pedidos where id = (select id from t where clave = 'p2')$$,
  $$values (public.hoy(), 0.00::numeric, 150.00::numeric, 150.00::numeric)$$,
  'sin fecha queda para hoy; si recoge, el envío es 0'
);

-- Repetidos se suman.
select is(
  (select unidades from public.crear_pedido(
    (select id from t where clave = 'cliente'), pg_temp.lineas('T-Pollo', '2', 'T-Pollo', '4'))),
  6, 'líneas repetidas del mismo sabor se suman'
);

select throws_ok(
  format($$select public.crear_pedido(%L, '[]'::jsonb)$$, (select id from t where clave = 'cliente')),
  '22023', 'Agrega al menos una catibía.', 'sin líneas: error'
);
select throws_ok(
  format($$select public.crear_pedido(%L, %L::jsonb)$$, (select id from t where clave = 'cliente'), pg_temp.lineas('T-Pollo', '0')),
  '22023', 'Agrega al menos una catibía.', 'cantidades en 0: error'
);
select throws_ok(
  $$select public.crear_pedido(gen_random_uuid(), '[{"producto_id":"00000000-0000-0000-0000-000000000000","cantidad":1}]')$$,
  '22023', 'Elige un cliente.', 'cliente inexistente: error'
);

-- BR-001: cambiar la lista de precios no altera el pedido existente.
update public.config_precios set precio_docena = 600;
select is(
  (select total from public.pedidos where id = (select id from t where clave = 'p1')),
  375.00::numeric, 'BR-001: el pedido viejo mantiene su precio'
);
select is(
  (select subtotal from public.crear_pedido((select id from t where clave = 'cliente'), pg_temp.lineas('T-Pollo', '6'))),
  300.00::numeric, 'BR-001: un pedido nuevo usa la docena nueva (6 × 600/12)'
);

-- No se escribe directo en las tablas protegidas.
select throws_ok(
  format($$insert into public.pedidos (cliente_id, fecha_entrega, unidades, tarifa, precio_docena_aplicado, redondeo_aplicado, subtotal, total)
           values (%L, current_date, 1, 'suelta', 1, 1, 1, 1)$$, (select id from t where clave = 'cliente')),
  '42501', null, 'no se insertan pedidos directo'
);
select throws_ok(
  $$update public.pedidos set total = 1$$, '42501', null, 'no se editan pedidos directo'
);
select throws_ok(
  format($$insert into public.movimientos_producto (producto_id, cantidad, tipo, motivo) values (%L, 5, 'ajuste', 'x')$$, pg_temp.prod('T-Pollo')),
  '42501', null, 'no se insertan movimientos directo'
);

-- ---------- actualizar_pedido (FR-024, NFR-R-003) ----------
update t set version = (select version from public.pedidos where id = t.id) where clave = 'p1';
select is(
  (select total from public.actualizar_pedido(
    (select id from t where clave = 'p1'), (select version from t where clave = 'p1'),
    (select id from t where clave = 'cliente'), pg_temp.lineas('T-Pollo', '4', 'T-Queso', '2', 'T-Res', '6'),
    public.hoy() + 1, '16:00', 'delivery', 100, null)),
  700.00::numeric, 'editar recalcula con la lista actual: 12 × 600/12 + 100'
);
select throws_ok(
  format($$select public.actualizar_pedido(%L, %s, %L, %L::jsonb, current_date)$$,
    (select id from t where clave = 'p1'), (select version from t where clave = 'p1'),
    (select id from t where clave = 'cliente'), pg_temp.lineas('T-Pollo', '1')),
  '22023', 'El pedido fue modificado por otra persona. Recarga para ver los cambios.',
  'NFR-R-003: versión vieja → error'
);
select is(
  (select count(*)::int from public.pedido_lineas where pedido_id = (select id from t where clave = 'p1')),
  3, 'editar reemplaza las líneas'
);

-- ---------- stock: tanda, entrega, revertir (BR-005, BR-006) ----------
select is(pg_temp.stock('T-Pollo'), 0, 'stock inicial de pollo = 0');
select lives_ok(
  format($$select public.registrar_tanda(%L::jsonb, null, 'mañana')$$, pg_temp.lineas('T-Pollo', '10', 'T-Queso', '20')),
  'registrar tanda'
);
select is(pg_temp.stock('T-Pollo'), 10, 'FR-050: la tanda suma al stock');
select is(pg_temp.stock('T-Queso'), 20, 'FR-050: la tanda suma al stock (queso)');

select is(
  (select count(*)::int from public.movimientos_producto m join public.productos p on p.id = m.producto_id
   where m.tipo = 'tanda' and p.nombre like 'T-%'), 2,
  'BR-007: un movimiento por sabor de la tanda'
);

-- p2: 3 de res; p3: 3 de pollo (FR-023).
insert into t (clave, id)
select 'p3', id from public.crear_pedido((select id from t where clave = 'cliente'), pg_temp.lineas('T-Pollo', '3'));
select is(pg_temp.stock('T-Pollo'), 10, 'BR-005: crear un pedido no descuenta stock');

select is(
  (select estado::text from public.cambiar_estado((select id from t where clave = 'p3'), 'listo')),
  'listo', 'FR-022: pendiente → listo'
);
select is(pg_temp.stock('T-Pollo'), 10, 'listo no mueve stock');

select results_eq(
  $$select estado::text, entregado_en is not null from public.cambiar_estado((select id from t where clave = 'p3'), 'entregado')$$,
  $$values ('entregado', true)$$, 'listo → entregado fija entregado_en'
);
select is(pg_temp.stock('T-Pollo'), 7, 'FR-023: con 10 de pollo, entregar 3 deja 7');

select throws_ok(
  format($$select public.cambiar_estado(%L, 'entregado')$$, (select id from t where clave = 'p3')),
  '22023', 'El pedido ya está entregado.', 'no se entrega dos veces'
);
select throws_ok(
  format($$select public.actualizar_pedido(%L, 99, %L, %L::jsonb, current_date)$$,
    (select id from t where clave = 'p3'), (select id from t where clave = 'cliente'), pg_temp.lineas('T-Pollo', '1')),
  '22023', null, 'un pedido entregado no se edita'
);

select is(
  (select estado::text from public.cambiar_estado((select id from t where clave = 'p3'), 'listo')),
  'listo', 'FR-025: revertir entregado → listo'
);
select is(pg_temp.stock('T-Pollo'), 10, 'FR-025: al revertir, el stock vuelve de 7 a 10');

-- Entregar otra vez y cancelar: también reintegra (BR-006).
select lives_ok(format($$select public.cambiar_estado(%L, 'entregado')$$, (select id from t where clave = 'p3')), 're-entregar');
select is(pg_temp.stock('T-Pollo'), 7, 're-entregar descuenta otra vez');
select lives_ok(format($$select public.cambiar_estado(%L, 'cancelado')$$, (select id from t where clave = 'p3')), 'cancelar entregado');
select is(pg_temp.stock('T-Pollo'), 10, 'BR-006: cancelar un entregado reintegra el stock');
select throws_ok(
  format($$select public.cambiar_estado(%L, 'entregado')$$, (select id from t where clave = 'p3')),
  '22023', 'Un pedido cancelado no se puede entregar. Reactívalo primero.', 'cancelado no se entrega directo'
);
select is(
  (select estado::text from public.cambiar_estado((select id from t where clave = 'p3'), 'pendiente')),
  'pendiente', 'cancelado → pendiente (Deshacer)'
);

-- ---------- hecho al momento (FR-026, DEC-006) ----------
insert into t (clave, id)
select 'p4', id from public.crear_pedido((select id from t where clave = 'cliente'), pg_temp.lineas('T-Res', '5'));
select is(pg_temp.stock('T-Res'), 0, 'stock de res = 0');
select lives_ok(
  format($$select public.cambiar_estado(%L, 'entregado', true)$$, (select id from t where clave = 'p4')),
  'entregar "hecho al momento"'
);
select is(pg_temp.stock('T-Res'), 0, 'FR-026: hecho al momento deja el stock en 0, sin negativo');
select is(
  (select array_agg(tipo::text || ':' || cantidad order by cantidad) from public.movimientos_producto
   where pedido_id = (select id from t where clave = 'p4')),
  array['entrega:-5', 'hecho_al_momento:5'], 'FR-026: quedan registrados ambos movimientos'
);
select lives_ok(format($$select public.cambiar_estado(%L, 'listo')$$, (select id from t where clave = 'p4')), 'revertir hecho al momento');
select is(pg_temp.stock('T-Res'), 5, 'DEC-006: al revertir un "hecho al momento", las catibías vuelven al stock');
select lives_ok(format($$select public.cambiar_estado(%L, 'entregado')$$, (select id from t where clave = 'p4')), 'volver a entregar normal');
select is(pg_temp.stock('T-Res'), 0, 'DEC-006: entregarlas después descuenta las que quedaron en stock');

-- BR-008: el stock puede quedar negativo.
select lives_ok(format($$select public.cambiar_estado(%L, 'entregado')$$, (select id from t where clave = 'p2')), 'entregar 3 de res sin stock');
select results_eq(
  $$select stock, negativo from public.v_stock_productos where nombre = 'T-Res'$$,
  $$values (-3, true)$$, 'BR-008: stock negativo permitido y marcado'
);

select * from finish();
rollback;
