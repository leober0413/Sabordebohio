-- FR-080, NFR-SEC-002 · Un usuario sin perfil o anónimo no lee ni escribe
-- nada; un dueño sí. Las categorías de sistema están protegidas.
begin;
select plan(23);

-- ---------- anónimo ----------
set local role anon;
select throws_ok('select * from public.productos', '42501', null, 'anon: no lee productos');
select throws_ok('select * from public.clientes', '42501', null, 'anon: no lee clientes');
select throws_ok('select * from public.config_precios', '42501', null, 'anon: no lee config_precios');
select throws_ok('select * from public.perfiles', '42501', null, 'anon: no lee perfiles');
select throws_ok('select * from public.categorias_gasto', '42501', null, 'anon: no lee categorías');
select throws_ok('select public.es_dueno()', '42501', null, 'anon: no ejecuta es_dueno');
reset role;

-- ---------- autenticado sin perfil ----------
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select is(public.es_dueno(), false, 'intruso: es_dueno() = false');
select is_empty('select * from public.productos', 'intruso: no ve productos');
select is_empty('select * from public.clientes', 'intruso: no ve clientes');
select is_empty('select * from public.config_precios', 'intruso: no ve la lista de precios');
select is_empty('select * from public.perfiles', 'intruso: no ve perfiles');
select is_empty('select * from public.categorias_gasto', 'intruso: no ve categorías');
select throws_ok(
  $$insert into public.productos (nombre) values ('Intruso')$$, '42501', null,
  'intruso: no crea productos'
);
select throws_ok(
  $$insert into public.clientes (nombre) values ('Intruso')$$, '42501', null,
  'intruso: no crea clientes'
);
-- Un update sin filas visibles no cambia nada.
update public.config_precios set precio_docena = 1;
reset role;
select is((select precio_docena from public.config_precios), 550.00::numeric, 'intruso: no cambia la lista de precios');

-- ---------- dueño ----------
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select is(public.es_dueno(), true, 'dueño: es_dueno() = true');
select isnt_empty('select * from public.productos', 'dueño: ve productos');
select lives_ok(
  $$insert into public.productos (nombre, orden) values ('Guayaba', 4)$$,
  'dueño: crea un sabor'
);
select throws_ok(
  $$insert into public.productos (nombre) values ('  pollo ')$$, '23505', null,
  'nombre de sabor único sin importar mayúsculas ni espacios'
);
select throws_ok(
  $$delete from public.productos where nombre = 'Guayaba'$$, '42501', null,
  'nada se borra: se desactiva (BR-011)'
);
update public.config_precios set precio_docena = 600;
select is((select actualizado_por from public.config_precios), '11111111-1111-4111-8111-111111111111'::uuid,
  'config_precios guarda quién la cambió');
select throws_ok(
  $$update public.categorias_gasto set activo = false where nombre = 'Ingredientes'$$, '22023', null,
  'la categoría Ingredientes no se desactiva'
);
select throws_ok(
  $$insert into public.categorias_gasto (nombre, es_sistema) values ('Falsa', true)$$, '42501', null,
  'la app no crea categorías de sistema'
);

select * from finish();
rollback;
