-- Prueba de humo del entorno (Fase 0): pgTAP corre contra Supabase local
-- y la base usa las convenciones de DEC-001.
begin;
select plan(3);

select has_schema('public', 'existe el esquema public');
select has_schema('auth', 'existe el esquema auth de Supabase');
select is(
  current_setting('server_version_num')::int >= 170000,
  true,
  'Postgres 17 o superior, igual que config.toml'
);

select * from finish();
rollback;
