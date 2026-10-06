-- Actividad (FR-083): quién hizo qué y cuándo; en las ediciones, antes → después.
begin;
select plan(47);

create function pg_temp.prod(text) returns uuid language sql as
  $$ select id from public.productos where nombre = $1 $$;
create function pg_temp.lineas(variadic args text[]) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('producto_id', pg_temp.prod(args[i]), 'cantidad', args[i + 1]::int))
  from generate_subscripts(args, 1) i where i % 2 = 1
$$;
-- Entradas abiertas de esta "petición" (ver pg_temp.siguiente_peticion).
create function pg_temp.entradas(text) returns bigint language sql as
  $$ select count(*) from public.actividad where entidad = $1 and transaccion = txid_current() $$;
create function pg_temp.ultima(text) returns public.actividad language sql as $$
  select * from public.actividad where entidad = $1 and transaccion = txid_current()
  order by creado_en desc, id desc limit 1
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temp table t (clave text primary key, id uuid);
grant all on t to authenticated;

create function pg_temp.como(uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', $1, 'role', 'authenticated')::text, true)
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- Una acción = una entrada por transacción. Toda la prueba corre en una sola,
-- así que para simular "otra petición" se cierran las entradas abiertas.
create temp sequence peticiones;
create function pg_temp.siguiente_peticion() returns void language sql security definer as $$
  update public.actividad set transaccion = -nextval('pg_temp.peticiones') where transaccion = txid_current()
$$;
grant execute on function pg_temp.siguiente_peticion() to authenticated;
create function pg_temp.cerradas(text) returns bigint language sql security definer as
  $$ select count(*) from public.actividad where entidad = $1 and transaccion < 0 $$;
grant execute on function pg_temp.cerradas(text) to authenticated;

-- ---------- seguridad ----------
set local role anon;
select throws_ok('select * from public.actividad', '42501', null, 'anon: no lee la actividad');

reset role;
select pg_temp.como('33333333-3333-4333-8333-333333333333');
set local role authenticated;
select is_empty('select * from public.actividad', 'intruso (sin perfil): no ve nada');

reset role;
select pg_temp.como('11111111-1111-4111-8111-111111111111');
set local role authenticated;
select isnt_empty('select * from public.actividad', 'un dueño ve la actividad');
select throws_ok(
  $$insert into public.actividad (entidad, entidad_id, accion) values ('pedido', 'x', 'crear')$$,
  '42501', null, 'nadie la escribe a mano'
);
select throws_ok($$update public.actividad set accion = 'editar'$$, '42501', null, 'nadie la edita');
select throws_ok($$delete from public.actividad$$, '42501', null, 'nadie la borra');

-- ---------- pedidos ----------
insert into public.productos (nombre, orden) values ('T-Pollo', 91), ('T-Res', 92);
select pg_temp.siguiente_peticion();

insert into t (clave, id)
select 'cliente', id from public.clientes where nombre = 'María Pérez';
insert into t (clave, id)
select 'pedido', id from public.crear_pedido(
  (select id from t where clave = 'cliente'), pg_temp.lineas('T-Pollo', '6'), public.hoy() + 1, '16:00'
);

select is(pg_temp.entradas('pedido'), 1::bigint, 'crear un pedido con sus líneas: una sola entrada');
select is((pg_temp.ultima('pedido')).accion, 'crear', 'accion = crear');
select is(
  (pg_temp.ultima('pedido')).creado_por, '11111111-1111-4111-8111-111111111111'::uuid,
  'queda quién lo hizo (FR-082)'
);
select is((pg_temp.ultima('pedido')).despues ->> 'cliente', 'María Pérez', 'con el nombre del cliente');
select is((pg_temp.ultima('pedido')).despues -> 'cantidades', '{"T-Pollo": 6}'::jsonb, 'y las cantidades por sabor');
select is(((pg_temp.ultima('pedido')).despues ->> 'total')::numeric, 275.00, 'y el total');
select pg_temp.siguiente_peticion();

-- Editar (borra y vuelve a insertar líneas): antes → después en una entrada.
select public.actualizar_pedido(
  (select id from t where clave = 'pedido'), (select version from public.pedidos where id = (select id from t where clave = 'pedido')),
  (select id from t where clave = 'cliente'), pg_temp.lineas('T-Pollo', '8', 'T-Res', '4'),
  public.hoy() + 1, '16:00'
);
select is(pg_temp.entradas('pedido'), 1::bigint, 'editar: una sola entrada');
select is((pg_temp.ultima('pedido')).accion, 'editar', 'accion = editar');
select is((pg_temp.ultima('pedido')).antes -> 'cantidades', '{"T-Pollo": 6}'::jsonb, 'antes: 6 de pollo');
select is(
  (pg_temp.ultima('pedido')).despues -> 'cantidades', '{"T-Pollo": 8, "T-Res": 4}'::jsonb,
  'después: 8 de pollo y 4 de res'
);
select is(
  ((pg_temp.ultima('pedido')).antes ->> 'total')::numeric || ' → ' || ((pg_temp.ultima('pedido')).despues ->> 'total')::numeric,
  '275.00 → 550.00', 'el total, antes → después'
);
select pg_temp.siguiente_peticion();

-- Entregar: el cambio de estado sí; los movimientos de la entrega, no.
select public.cambiar_estado((select id from t where clave = 'pedido'), 'entregado', true);
select is(
  (pg_temp.ultima('pedido')).antes ->> 'estado' || ' → ' || ((pg_temp.ultima('pedido')).despues ->> 'estado'),
  'pendiente → entregado', 'entregar: estado antes → después'
);
select is(pg_temp.entradas('ajuste_producto'), 0::bigint, 'los movimientos de la entrega no se anotan aparte');
select pg_temp.siguiente_peticion();

-- ---------- pagos y abonos ----------
insert into t (clave, id)
select 'pago', id from public.registrar_pago((select id from t where clave = 'pedido'), 100, 'efectivo');
select is((pg_temp.ultima('pago')).accion, 'crear', 'registrar un pago');
select is(((pg_temp.ultima('pago')).despues ->> 'monto')::numeric, 100.00, 'con el monto');
select is((pg_temp.ultima('pago')).despues ->> 'cliente', 'María Pérez', 'y el cliente del pedido');
select pg_temp.siguiente_peticion();

select public.anular_pago((select id from t where clave = 'pago'));
select is((pg_temp.ultima('pago')).accion, 'anular', 'anular un pago');
select pg_temp.siguiente_peticion();

select public.registrar_abono((select id from t where clave = 'cliente'), 200, 'transferencia');
select is(pg_temp.entradas('abono'), 1::bigint, 'un abono: una entrada');
select is(pg_temp.entradas('pago'), 0::bigint, 'los pagos que reparte no se anotan aparte (DEC-003)');
select pg_temp.siguiente_peticion();

-- ---------- gastos ----------
insert into t (clave, id)
select 'cat', id from public.categorias_gasto where nombre = 'Gas';
insert into public.gastos (categoria_id, monto, fecha, descripcion)
values ((select id from t where clave = 'cat'), 500, public.hoy(), 'T-Gas');
insert into t (clave, id) select 'gasto', id from public.gastos where descripcion = 'T-Gas';
select is((pg_temp.ultima('gasto')).accion, 'crear', 'registrar un gasto');
select is((pg_temp.ultima('gasto')).despues ->> 'categoria', 'Gas', 'con el nombre de la categoría');
select pg_temp.siguiente_peticion();

update public.gastos set monto = 650 where id = (select id from t where clave = 'gasto');
select is(
  ((pg_temp.ultima('gasto')).antes ->> 'monto') || ' → ' || ((pg_temp.ultima('gasto')).despues ->> 'monto'),
  '500.00 → 650.00', 'editar un gasto: monto antes → después'
);
select pg_temp.siguiente_peticion();

update public.gastos set monto = 650 where id = (select id from t where clave = 'gasto');
select is(pg_temp.entradas('gasto'), 0::bigint, 'guardar sin cambios no se anota');

update public.gastos set anulado_en = now() where id = (select id from t where clave = 'gasto');
select is((pg_temp.ultima('gasto')).accion, 'anular', 'anular un gasto');
select pg_temp.siguiente_peticion();
update public.gastos set anulado_en = null where id = (select id from t where clave = 'gasto');
select is((pg_temp.ultima('gasto')).accion, 'restaurar', 'deshacer la anulación: restaurar');
select pg_temp.siguiente_peticion();

-- ---------- inventario ----------
insert into public.ingredientes (nombre, unidad) values ('T-Harina', 'lb');
insert into t (clave, id) select 'harina', id from public.ingredientes where nombre = 'T-Harina';
select is((pg_temp.ultima('ingrediente')).despues ->> 'nombre', 'T-Harina', 'crear un ingrediente');
select pg_temp.siguiente_peticion();

select public.registrar_compra((select id from t where clave = 'harina'), 10, 400);
select is(pg_temp.entradas('compra'), 1::bigint, 'una compra: una entrada');
select is((pg_temp.ultima('compra')).despues ->> 'ingrediente', 'T-Harina', 'con el ingrediente');
select is(pg_temp.entradas('gasto'), 0::bigint, 'el gasto de la compra no se anota aparte (BR-009)');
select is(pg_temp.entradas('ajuste_ingrediente'), 0::bigint, 'ni el movimiento de la compra');
select pg_temp.siguiente_peticion();

select public.registrar_conteo((select id from t where clave = 'harina'), 7);
select is(
  ((pg_temp.ultima('ajuste_ingrediente')).antes ->> 'stock') || ' → ' || ((pg_temp.ultima('ajuste_ingrediente')).despues ->> 'stock'),
  '10.000 → 7.000', 'conteo: stock antes → después'
);
select pg_temp.siguiente_peticion();

select public.ajustar_stock_producto(pg_temp.prod('T-Res'), -2, 'merma');
select is(
  ((pg_temp.ultima('ajuste_producto')).antes ->> 'stock') || ' → ' || ((pg_temp.ultima('ajuste_producto')).despues ->> 'stock'),
  '0 → -2', 'ajuste de catibías: stock antes → después'
);
select is((pg_temp.ultima('ajuste_producto')).despues ->> 'motivo', 'merma', 'con el motivo');
select pg_temp.siguiente_peticion();

select public.registrar_tanda(pg_temp.lineas('T-Pollo', '24', 'T-Res', '12'), public.hoy(), null);
select is(pg_temp.entradas('tanda'), 1::bigint, 'una tanda: una entrada');
select is(
  (pg_temp.ultima('tanda')).despues -> 'cantidades', '{"T-Pollo": 24, "T-Res": 12}'::jsonb,
  'con lo producido por sabor'
);
select is(pg_temp.entradas('ajuste_producto'), 0::bigint, 'la producción no se anota aparte');
select pg_temp.siguiente_peticion();

-- ---------- catálogos y precios ----------
update public.clientes set telefono = '809-000-0000' where id = (select id from t where clave = 'cliente');
select is(
  (pg_temp.ultima('cliente')).antes ->> 'telefono' || ' → ' || ((pg_temp.ultima('cliente')).despues ->> 'telefono'),
  '809-555-0101 → 809-000-0000', 'editar un cliente: antes → después'
);
select pg_temp.siguiente_peticion();

update public.productos set orden = orden + 1 where nombre like 'T-%';
select is(pg_temp.entradas('producto'), 0::bigint, 'reordenar sabores no se anota');

update public.config_precios set precio_docena = 600;
select is(
  ((pg_temp.ultima('precios')).antes ->> 'precio_docena') || ' → ' || ((pg_temp.ultima('precios')).despues ->> 'precio_docena'),
  '550.00 → 600.00', 'cambiar la lista de precios: antes → después'
);
select pg_temp.siguiente_peticion();

-- ---------- quién ----------
reset role;
select pg_temp.como('22222222-2222-4222-8222-222222222222');
set local role authenticated;
update public.clientes set notas = 'T-nota' where id = (select id from t where clave = 'cliente');
select is(
  (pg_temp.ultima('cliente')).creado_por, '22222222-2222-4222-8222-222222222222'::uuid,
  'lo que hace María queda a su nombre'
);
select is(pg_temp.cerradas('pedido'), 3::bigint, 'el pedido quedó con 3 entradas: crear, editar, entregar');

select * from finish();
rollback;
