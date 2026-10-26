-- FR-013 · Un teléfono, un cliente: se comparan solo los dígitos.
-- En el seed, María Pérez tiene 809-555-0101.
begin;
select plan(14);

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;

-- ---------- solo los dígitos ----------
select is(
  (select telefono_digitos from public.clientes where nombre = 'María Pérez'),
  '8095550101', 'telefono_digitos guarda solo los números'
);
select is(
  (select telefono_digitos from public.clientes where nombre = 'Ana Martínez'),
  null, 'sin teléfono: telefono_digitos vacío'
);

-- ---------- el mismo número escrito de otra forma ----------
select throws_ok(
  $$insert into public.clientes (nombre, telefono) values ('María P.', '(809) 555-0101')$$,
  'P0001', 'Ese teléfono ya es de María Pérez. Búscalo y elígelo en vez de crear otro.',
  'con paréntesis y guion: rechazado y dice de quién es'
);
select throws_ok(
  $$insert into public.clientes (nombre, telefono) values ('María P.', '809 555 0101')$$,
  'P0001', null, 'con espacios: rechazado'
);
select throws_ok(
  $$insert into public.clientes (nombre, telefono) values ('María P.', '8095550101')$$,
  'P0001', null, 'pegado: rechazado'
);
select throws_ok(
  $$insert into public.clientes (nombre, telefono) values ('María P.', '+1 809-555-0101')$$,
  'P0001', null, 'con +1 del país: rechazado'
);
select throws_ok(
  $$insert into public.clientes (nombre, telefono) values ('María P.', '1-809-555-0101')$$,
  'P0001', null, 'con 1 del país sin +: rechazado'
);

-- ---------- lo que sí se permite ----------
select lives_ok(
  $$insert into public.clientes (nombre, telefono) values ('T-Otro', '809-555-0199')$$,
  'otro número: se crea'
);
select lives_ok(
  $$insert into public.clientes (nombre) values ('T-Sin teléfono 1'), ('T-Sin teléfono 2')$$,
  'varios sin teléfono: se crean'
);
select lives_ok(
  $$update public.clientes set nombre = 'María Pérez', notas = 'Cliente fija' where nombre = 'María Pérez'$$,
  'editar el mismo cliente sin cambiar el número: permitido'
);

-- ---------- cambiar el teléfono ----------
select throws_ok(
  $$update public.clientes set telefono = '809.555.0101' where nombre = 'T-Otro'$$,
  'P0001', null, 'poner el número de otro cliente: rechazado'
);

-- ---------- clientes desactivados (BR-011) ----------
update public.clientes set activo = false where nombre = 'T-Otro';
select lives_ok(
  $$insert into public.clientes (nombre, telefono) values ('T-Nuevo dueño', '809 555 0199')$$,
  'el número de un cliente desactivado se puede usar'
);
select throws_ok(
  $$update public.clientes set activo = true where nombre = 'T-Otro'$$,
  'P0001', 'Ese teléfono ya es de T-Nuevo dueño. Búscalo y elígelo en vez de crear otro.',
  'reactivar uno cuyo número ya usa otro: rechazado'
);

-- ---------- sin permiso ----------
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.clientes (nombre, telefono) values ('Intruso', '809-555-0101')$$,
  '42501', null, 'intruso: no crea clientes ni averigua de quién es un número'
);

select * from finish();
rollback;
