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
