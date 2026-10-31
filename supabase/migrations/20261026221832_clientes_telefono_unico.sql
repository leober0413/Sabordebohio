-- FR-013 · Un teléfono, un cliente. Se comparan solo los dígitos: espacios,
-- guiones, paréntesis y el +1 del país no cuentan ("(809) 555-0101",
-- "809 555 0101" y "+1 809-555-0101" son el mismo número).
-- Los duplicados que ya existan se quedan como están: la regla aplica a los
-- clientes nuevos y a cambiar el teléfono o reactivar uno.

-- Solo los dígitos; con 11 que empiezan por 1 (código de país) se quita el 1.
create function privado.digitos_telefono(p_telefono text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    case when length(d) = 11 and left(d, 1) = '1' then substr(d, 2) else d end,
    ''
  )
  from (select pg_catalog.regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g') as d) t;
$$;

-- La columna generada la calcula quien inserta o edita: el dueño necesita
-- poder ejecutarla. Es pura (texto → texto) y no lee ninguna tabla.
grant execute on function privado.digitos_telefono(text) to authenticated;

alter table public.clientes
  add column telefono_digitos text
  generated always as (privado.digitos_telefono(telefono)) stored;

create index clientes_telefono_digitos on public.clientes (telefono_digitos);

-- Rechaza un teléfono que ya tiene otro cliente activo, con su nombre para
-- que la UI lo diga tal cual (regla 9). El candado por número evita que los
-- dos dueños creen el mismo cliente a la vez.
create function privado.validar_telefono_cliente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_digitos text := privado.digitos_telefono(new.telefono);
  v_otro text;
begin
  -- Sin perfil de dueño, que lo rechace RLS (corre después de este trigger)
  -- sin revelar de quién es el número.
  if v_digitos is null or not new.activo or not public.es_dueno() then
    return new;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('cliente-telefono:' || v_digitos));
  select c.nombre into v_otro
  from public.clientes c
  where c.telefono_digitos = v_digitos and c.activo and c.id <> new.id
  order by c.creado_en
  limit 1;
  if v_otro is not null then
    raise exception 'Ese teléfono ya es de %. Búscalo y elígelo en vez de crear otro.', v_otro;
  end if;
  return new;
end;
$$;

create trigger validar_telefono before insert or update of telefono, activo on public.clientes
  for each row execute function privado.validar_telefono_cliente();
