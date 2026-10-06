-- BR-012 · Tabla de casos de docs/testing.md. src/lib/precio.test.ts usa los
-- mismos casos: si cambias uno, cambia el otro.
begin;
select plan(18);

-- Sesión como dueño del seed (Leo).
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;

-- Config de la tabla: docena 550, mínimo 6, suelta 50, redondeo 1.
update public.config_precios set precio_docena = 550, minimo_docena = 6, precio_suelta = 50, redondeo = 1;

select throws_ok(
  'select * from public.calcular_precio(0)', '22023',
  'El pedido debe tener al menos una catibía.', '0 catibías: error'
);
select is((select subtotal from public.calcular_precio(1)), 50.00::numeric, '1 → 50');
select is((select subtotal from public.calcular_precio(5)), 250.00::numeric, '5 → 250');
select is((select tarifa from public.calcular_precio(5)), 'suelta'::public.tarifa_aplicada, '5 → tarifa suelta');
select is((select subtotal from public.calcular_precio(6)), 275.00::numeric, '6 → 275');
select is((select tarifa from public.calcular_precio(6)), 'docena'::public.tarifa_aplicada, '6 → tarifa docena');
select is((select subtotal from public.calcular_precio(7)), 321.00::numeric, '7 → 321');
select is((select subtotal from public.calcular_precio(8)), 367.00::numeric, '8 → 367');
select is((select subtotal from public.calcular_precio(9)), 413.00::numeric, '9 → 413 (412.5 redondea hacia arriba)');
select is((select subtotal from public.calcular_precio(12)), 550.00::numeric, '12 → 550');
select is((select subtotal from public.calcular_precio(18)), 825.00::numeric, '18 → 825');
select is((select subtotal from public.calcular_precio(24)), 1100.00::numeric, '24 → 1100');

update public.config_precios set redondeo = 5;
select is((select subtotal from public.calcular_precio(8)), 365.00::numeric, '8 con redondeo 5 → 365');

update public.config_precios set redondeo = 10;
select is((select subtotal from public.calcular_precio(8)), 370.00::numeric, '8 con redondeo 10 → 370');

update public.config_precios set redondeo = 1, precio_suelta = null;
select throws_like(
  'select * from public.calcular_precio(3)',
  'Configura el precio suelta%', '3 sin precio suelta: error claro'
);
select is((select subtotal from public.calcular_precio(6)), 275.00::numeric, 'sin precio suelta, 6 o más sigue funcionando');

-- Mínimo configurable.
update public.config_precios set minimo_docena = 4, precio_suelta = 50;
select is((select subtotal from public.calcular_precio(4)), 183.00::numeric, 'mínimo 4: 4 → docena (183.33 → 183)');

-- Otro usuario (sin perfil) no puede usarla.
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select throws_ok('select * from public.calcular_precio(8)', '42501', null, 'no dueño: sin permiso');

select * from finish();
rollback;
