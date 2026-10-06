-- Fase 3 · Pagos, abonos y fiado (FR-040 a FR-043, BR-003, BR-004, DEC-003).
begin;
select plan(41);

create function pg_temp.lineas(variadic args text[]) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object(
    'producto_id', (select id from public.productos where nombre = args[i]),
    'cantidad', args[i + 1]::int))
  from generate_subscripts(args, 1) i where i % 2 = 1
$$;
create function pg_temp.v(uuid) returns public.v_pedidos language sql as
  $$ select * from public.v_pedidos where id = $1 $$;
grant execute on all functions in schema pg_temp to authenticated;
create temp table t (clave text primary key, id uuid);
grant all on t to authenticated;

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;

-- Datos propios: suelta 50, docena 600 → 4 uds = 200, 6 uds = 300.
update public.config_precios set precio_suelta = 50, precio_docena = 600, minimo_docena = 6, redondeo = 1;
insert into public.productos (nombre) values ('P-Pollo');
with c as (insert into public.clientes (nombre) values ('Cliente Pagos') returning id) insert into t select 'cli', id from c;
with c as (insert into public.clientes (nombre) values ('Cliente Otro') returning id) insert into t select 'cli2', id from c;

-- ---------- pagos de un pedido (FR-040, BR-003) ----------
insert into t select 'p300', id from public.crear_pedido((select id from t where clave = 'cli'), pg_temp.lineas('P-Pollo', '6'));
select results_eq(
  $$select total, pagado, saldo, estado_pago::text from pg_temp.v((select id from t where clave = 'p300'))$$,
  $$values (300.00::numeric, 0.00::numeric, 300.00::numeric, 'pendiente')$$,
  'pedido nuevo: pendiente, saldo = total'
);
insert into t select 'pago1', id from public.registrar_pago((select id from t where clave = 'p300'), 100, 'efectivo');
select results_eq(
  $$select pagado, saldo, estado_pago::text from pg_temp.v((select id from t where clave = 'p300'))$$,
  $$values (100.00::numeric, 200.00::numeric, 'parcial')$$,
  'FR-040: RD$300 con pago de RD$100 queda parcial'
);
select is(
  (select fecha from public.pagos where id = (select id from t where clave = 'pago1')), public.hoy(),
  'sin fecha, el pago es de hoy'
);
select throws_ok(
  format($$select public.registrar_pago(%L, 250, 'efectivo')$$, (select id from t where clave = 'p300')),
  '22023', 'El pago (RD$250.00) supera el saldo del pedido (RD$200.00).', 'no se paga más que el saldo'
);
select throws_ok(
  format($$select public.registrar_pago(%L, 0, 'efectivo')$$, (select id from t where clave = 'p300')),
  '22023', 'El monto debe ser mayor que cero.', 'monto 0: error'
);
select lives_ok(
  format($$select public.registrar_pago(%L, 200, 'transferencia')$$, (select id from t where clave = 'p300')),
  'pagar el resto por transferencia'
);
select results_eq(
  $$select saldo, estado_pago::text from pg_temp.v((select id from t where clave = 'p300'))$$,
  $$values (0.00::numeric, 'pagado')$$, 'BR-003: pagado cuando lo abonado cubre el total'
);

-- Anular (el "Deshacer" de un pago).
select is(
  (select anulado_en is not null from public.anular_pago((select id from t where clave = 'pago1'))), true,
  'anular un pago lo marca, no lo borra'
);
select results_eq(
  $$select pagado, estado_pago::text from pg_temp.v((select id from t where clave = 'p300'))$$,
  $$values (200.00::numeric, 'parcial')$$, 'un pago anulado no cuenta'
);
select throws_ok(
  format($$select public.anular_pago(%L)$$, (select id from t where clave = 'pago1')),
  '22023', 'Ese pago ya está anulado.', 'no se anula dos veces'
);

-- No se cancela con pagos; no se edita por debajo de lo pagado.
select throws_ok(
  format($$select public.cambiar_estado(%L, 'cancelado')$$, (select id from t where clave = 'p300')),
  '22023', 'Este pedido tiene pagos. Anúlalos antes de cancelarlo.', 'no se cancela un pedido con pagos'
);
select throws_ok(
  format($$select public.actualizar_pedido(%L, %s, %L, %L::jsonb, public.hoy())$$,
    (select id from t where clave = 'p300'), (select version from public.pedidos where id = (select id from t where clave = 'p300')),
    (select id from t where clave = 'cli'), pg_temp.lineas('P-Pollo', '2')),
  '22023', 'El nuevo total (RD$100.00) es menor que lo ya pagado (RD$200.00). Anula un pago primero.',
  'editar no deja el total por debajo de lo pagado'
);

-- ---------- pago inicial al crear (FR-041) ----------
insert into t select 'pcompleto', id from public.crear_pedido(
  (select id from t where clave = 'cli2'), pg_temp.lineas('P-Pollo', '4'),
  null, null, 'delivery', 100, null, '{"metodo":"efectivo"}'
);
select results_eq(
  $$select total, pagado, estado_pago::text from pg_temp.v((select id from t where clave = 'pcompleto'))$$,
  $$values (300.00::numeric, 300.00::numeric, 'pagado')$$,
  'FR-041: "pagado completo" al crear cubre el total con envío'
);
select is(
  (select metodo::text from public.pagos where pedido_id = (select id from t where clave = 'pcompleto')),
  'efectivo', 'el pago inicial guarda el método'
);
select is(
  (select pagado from pg_temp.v((select id from public.crear_pedido(
    (select id from t where clave = 'cli2'), pg_temp.lineas('P-Pollo', '4'),
    null, null, 'recoge', 0, null, '{"metodo":"transferencia","monto":50}'
  )))),
  50.00::numeric, 'pago inicial parcial'
);
select throws_ok(
  format($$select public.crear_pedido(%L, %L::jsonb, null, null, 'recoge', 0, null, '{"metodo":"tarjeta"}')$$,
    (select id from t where clave = 'cli2'), pg_temp.lineas('P-Pollo', '1')),
  '22023', 'Elige cómo pagó: efectivo o transferencia.', 'método inválido: error y no se crea nada'
);
select is(
  (select count(*)::int from public.pedidos where cliente_id = (select id from t where clave = 'cli2')), 2,
  'NFR-R-001: si el pago falla, el pedido tampoco queda'
);

-- ---------- cobrar al entregar (FR-041) ----------
insert into t select 'pentrega', id from public.crear_pedido((select id from t where clave = 'cli2'), pg_temp.lineas('P-Pollo', '1'));
select lives_ok(
  format($$select public.cambiar_estado(%L, 'entregado', false, '{"metodo":"transferencia"}')$$, (select id from t where clave = 'pentrega')),
  'entregar y cobrar en un paso'
);
select results_eq(
  $$select estado::text, estado_pago::text from pg_temp.v((select id from t where clave = 'pentrega'))$$,
  $$values ('entregado', 'pagado')$$, 'queda entregado y pagado'
);
select throws_ok(
  format($$select public.cambiar_estado(%L, 'listo', false, '{"metodo":"efectivo"}')$$, (select id from t where clave = 'pentrega')),
  '22023', 'Solo se puede cobrar al entregar.', 'cobrar solo al entregar'
);

-- ---------- fiado y abonos (FR-042, FR-043, DEC-003) ----------
-- Cliente con dos pedidos entregados sin pagar: RD$200 (más viejo) y RD$300.
with c as (insert into public.clientes (nombre) values ('Cliente Fiado') returning id) insert into t select 'cli3', id from c;
insert into t select 'viejo', id from public.crear_pedido((select id from t where clave = 'cli3'), pg_temp.lineas('P-Pollo', '4'), public.hoy() - 5);
insert into t select 'nuevo', id from public.crear_pedido((select id from t where clave = 'cli3'), pg_temp.lineas('P-Pollo', '6'), public.hoy() - 1);
select public.cambiar_estado(id, 'entregado') from t where clave in ('viejo', 'nuevo');

select results_eq(
  $$select saldo_fiado, saldo_total, pedidos_fiados, fiado_desde from public.v_saldos_clientes
    where id = (select id from t where clave = 'cli3')$$,
  $$values (500.00::numeric, 500.00::numeric, 2, public.hoy() - 5)$$,
  'FR-042: saldo de fiado, cantidad y desde cuándo'
);

-- Pedido por entregar: suma al saldo total pero no al fiado (BR-004).
insert into t select 'porentregar', id from public.crear_pedido((select id from t where clave = 'cli3'), pg_temp.lineas('P-Pollo', '1'));
select results_eq(
  $$select saldo_fiado, saldo_total from public.v_saldos_clientes where id = (select id from t where clave = 'cli3')$$,
  $$values (500.00::numeric, 550.00::numeric)$$, 'BR-004: fiado = entregados con saldo'
);

insert into t select 'abono1', id from public.registrar_abono((select id from t where clave = 'cli3'), 250, 'efectivo');
select results_eq(
  $$select (select saldo from pg_temp.v((select id from t where clave = 'viejo'))),
           (select saldo from pg_temp.v((select id from t where clave = 'nuevo')))$$,
  $$values (0.00::numeric, 250.00::numeric)$$,
  'FR-043: RD$250 sin elegir pedido salda el viejo (200) y deja 250 en el nuevo'
);
select is(
  (select count(*)::int from public.pagos where abono_id = (select id from t where clave = 'abono1')), 2,
  'el abono se reparte en dos pagos'
);
select throws_ok(
  format($$select public.anular_pago(id) from public.pagos where abono_id = %L limit 1$$, (select id from t where clave = 'abono1')),
  '22023', 'Este pago es parte de un abono. Anula el abono desde la ficha del cliente.',
  'un pago de abono no se anula suelto'
);

-- Anular el abono anula sus pagos.
select lives_ok(format($$select public.anular_abono(%L)$$, (select id from t where clave = 'abono1')), 'anular el abono');
select results_eq(
  $$select (select saldo from pg_temp.v((select id from t where clave = 'viejo'))),
           (select saldo from pg_temp.v((select id from t where clave = 'nuevo')))$$,
  $$values (200.00::numeric, 300.00::numeric)$$, 'al anular el abono, los saldos vuelven'
);

-- Abono a un pedido elegido.
select lives_ok(
  format($$select public.registrar_abono(%L, 250, 'transferencia', null, %L)$$,
    (select id from t where clave = 'cli3'), (select id from t where clave = 'nuevo')),
  'abono eligiendo el pedido'
);
select results_eq(
  $$select (select saldo from pg_temp.v((select id from t where clave = 'viejo'))),
           (select saldo from pg_temp.v((select id from t where clave = 'nuevo')))$$,
  $$values (200.00::numeric, 50.00::numeric)$$,
  'FR-043: si elige el segundo, ese queda en 50 y el primero intacto'
);
select throws_ok(
  format($$select public.registrar_abono(%L, 60, 'efectivo', null, %L)$$,
    (select id from t where clave = 'cli3'), (select id from t where clave = 'nuevo')),
  '22023', 'El abono (RD$60.00) supera el saldo de ese pedido (RD$50.00).', 'no abona más que el saldo del pedido'
);
select throws_ok(
  format($$select public.registrar_abono(%L, 1000, 'efectivo')$$, (select id from t where clave = 'cli3')),
  '22023', 'El abono (RD$1,000.00) supera lo que debe el cliente (RD$300.00).',
  'no hay saldo a favor: el abono no supera la deuda'
);
select throws_ok(
  format($$select public.registrar_abono(%L, 10, 'efectivo', null, %L)$$,
    (select id from t where clave = 'cli3'), (select id from t where clave = 'p300')),
  '22023', 'Ese pedido no es de este cliente o está cancelado.', 'el pedido elegido debe ser del cliente'
);
with c as (insert into public.clientes (nombre) values ('Cliente Sin Deuda') returning id) insert into t select 'cli4', id from c;
select throws_ok(
  format($$select public.registrar_abono(%L, 10, 'efectivo')$$, (select id from t where clave = 'cli4')),
  '22023', 'Este cliente no debe nada.', 'abono a quien no debe: error'
);
select throws_ok(
  format($$select public.cambiar_estado(%L, 'cancelado')$$, (select id from t where clave = 'nuevo')),
  '22023', 'Este pedido tiene pagos. Anúlalos antes de cancelarlo.', 'tampoco se cancela con pagos de abono'
);

-- ---------- permisos ----------
select throws_ok(
  format($$insert into public.pagos (pedido_id, monto, metodo, fecha) values (%L, 1, 'efectivo', current_date)$$, (select id from t where clave = 'p300')),
  '42501', null, 'no se insertan pagos directo'
);
select throws_ok($$update public.pagos set monto = 1$$, '42501', null, 'no se editan pagos directo');
select throws_ok($$delete from public.abonos$$, '42501', null, 'no se borran abonos');

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select is_empty('select * from public.pagos', 'intruso: no ve pagos');
select is_empty('select * from public.v_saldos_clientes', 'intruso: no ve saldos');
select throws_ok(
  format($$select public.registrar_pago(%L, 1, 'efectivo')$$, (select id from t where clave = 'p300')),
  '42501', 'No tienes permiso para hacer esto.', 'intruso: no registra pagos'
);
select throws_ok(
  format($$select public.registrar_abono(%L, 1, 'efectivo')$$, (select id from t where clave = 'cli3')),
  '42501', 'No tienes permiso para hacer esto.', 'intruso: no registra abonos'
);

select * from finish();
rollback;
