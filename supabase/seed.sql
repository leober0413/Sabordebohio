-- Datos de desarrollo. Se aplican con `npx supabase db reset`.
-- Solo para local: nunca se ejecutan en producción.
--
-- Cuentas (contraseña de todas: bohio-local-123):
--   leo@bohio.test      dueño
--   maria@bohio.test    dueña
--   intruso@bohio.test  usuario autenticado SIN perfil: no debe ver nada (FR-080)

create function pg_temp.crear_usuario(p_id uuid, p_email text)
returns void
language sql
as $$
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('bohio-local-123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), p_id, p_id::text,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    'email', now(), now(), now()
  );
$$;

select pg_temp.crear_usuario('11111111-1111-4111-8111-111111111111', 'leo@bohio.test');
select pg_temp.crear_usuario('22222222-2222-4222-8222-222222222222', 'maria@bohio.test');
select pg_temp.crear_usuario('33333333-3333-4333-8333-333333333333', 'intruso@bohio.test');

insert into public.perfiles (id, nombre) values
  ('11111111-1111-4111-8111-111111111111', 'Leo'),
  ('22222222-2222-4222-8222-222222222222', 'María');

-- Lista de precios de ejemplo (docs/testing.md): docena 550, mínimo 6, suelta 50.
update public.config_precios set precio_suelta = 50, precio_docena = 550, minimo_docena = 6, redondeo = 1;

insert into public.productos (nombre, orden, stock_minimo) values
  ('Pollo', 1, 10),
  ('Res', 2, 10),
  ('Queso', 3, 6);

insert into public.categorias_gasto (nombre) values ('Gas'), ('Empaques'), ('Transporte');

insert into public.clientes (nombre, telefono, notas) values
  ('María Pérez', '809-555-0101', null),
  ('Juan Rodríguez', '829-555-0102', 'Siempre pide delivery'),
  ('Ana Martínez', null, null);

-- ---------------------------------------------------------------------------
-- Producción y pedidos de ejemplo (Fase 2). Se crean con las RPC, como Leo,
-- para que precios y movimientos sigan las mismas reglas que en la app.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

create function pg_temp.lineas(variadic args text[]) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object(
    'producto_id', (select id from public.productos where nombre = args[i]),
    'cantidad', args[i + 1]::int))
  from generate_subscripts(args, 1) i where i % 2 = 1
$$;
create function pg_temp.cliente(text) returns uuid language sql as
  $$ select id from public.clientes where nombre = $1 $$;

select public.registrar_tanda(pg_temp.lineas('Pollo', '24', 'Res', '18', 'Queso', '8'), public.hoy(), 'Tanda de la mañana');

-- Atrasado: era para ayer y no se entregó (FR-031).
select public.crear_pedido(pg_temp.cliente('Ana Martínez'), pg_temp.lineas('Queso', '6'), public.hoy() - 1, '17:00');

-- Para hoy, en distintos estados.
select public.crear_pedido(pg_temp.cliente('María Pérez'), pg_temp.lineas('Pollo', '4', 'Queso', '2'),
  public.hoy(), '12:30', 'delivery', 100, 'Tocar el timbre');
select public.cambiar_estado(
  (public.crear_pedido(pg_temp.cliente('Juan Rodríguez'), pg_temp.lineas('Res', '12'), public.hoy(), '10:00', 'delivery', 150)).id,
  'listo');
select public.crear_pedido(pg_temp.cliente('Ana Martínez'), pg_temp.lineas('Pollo', '3'), public.hoy(), null);
select public.cambiar_estado(
  (public.crear_pedido(pg_temp.cliente('Juan Rodríguez'), pg_temp.lineas('Pollo', '6'), public.hoy(), '09:00')).id,
  'entregado');

-- Para mañana.
select public.crear_pedido(pg_temp.cliente('María Pérez'), pg_temp.lineas('Pollo', '12', 'Res', '12'), public.hoy() + 1, '16:00');

-- ---------------------------------------------------------------------------
-- Ingredientes y compras de ejemplo (Fase 4). Queso queda cerca del mínimo
-- para la E2E 3.
-- ---------------------------------------------------------------------------
insert into public.ingredientes (nombre, unidad, stock_minimo) values
  ('Harina', 'lb', 10),
  ('Pollo (carne)', 'lb', 5),
  ('Res (carne)', 'lb', 5),
  ('Queso', 'lb', 2),
  ('Aceite', 'galón', 1),
  ('Sal', 'lb', null);

select public.registrar_compra((select id from public.ingredientes where nombre = 'Harina'), 25, 1100, public.hoy() - 3);
select public.registrar_compra((select id from public.ingredientes where nombre = 'Pollo (carne)'), 10, 1500, public.hoy() - 2);
select public.registrar_compra((select id from public.ingredientes where nombre = 'Res (carne)'), 8, 1600, public.hoy() - 2);
select public.registrar_compra((select id from public.ingredientes where nombre = 'Queso'), 3, 450, public.hoy() - 1);
select public.registrar_compra((select id from public.ingredientes where nombre = 'Aceite'), 2, 900, public.hoy() - 4);
select public.registrar_conteo((select id from public.ingredientes where nombre = 'Harina'), 12);

insert into public.gastos (categoria_id, monto, fecha, descripcion, creado_por)
select id, 1200, public.hoy() - 1, 'Tanque de gas', '11111111-1111-4111-8111-111111111111'
from public.categorias_gasto where nombre = 'Gas';
