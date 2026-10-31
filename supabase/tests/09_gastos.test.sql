-- FR-064 · Cantidad opcional en un gasto suelto; monto sigue siendo el total.
begin;
select plan(6);

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;

create temporary table t_cat as
  select id from public.categorias_gasto where nombre = 'Empaques';

select lives_ok(
  $$insert into public.gastos (categoria_id, monto, cantidad, fecha, descripcion)
    select id, 450, 3, current_date, 'T-Cajas' from t_cat$$,
  'un gasto con cantidad se crea directo'
);
select is(
  (select cantidad from public.gastos where descripcion = 'T-Cajas'), 3,
  'guarda la cantidad'
);
select is(
  (select despues ->> 'cantidad' from public.actividad
   where entidad = 'gasto' and despues ->> 'descripcion' = 'T-Cajas'),
  '3', 'Actividad: la foto del gasto lleva la cantidad'
);
select lives_ok(
  $$insert into public.gastos (categoria_id, monto, fecha, descripcion)
    select id, 300, current_date, 'T-Sin cantidad' from t_cat$$,
  'sin cantidad también se puede'
);
select throws_ok(
  $$insert into public.gastos (categoria_id, monto, cantidad, fecha)
    select id, 300, 0, current_date from t_cat$$,
  '23514', null, 'cantidad 0: rechazada'
);
select lives_ok(
  $$update public.gastos set cantidad = 2, monto = 300 where descripcion = 'T-Cajas'$$,
  'la cantidad se puede corregir'
);

select * from finish();
rollback;
