-- Fase 1 · Lista de precios (FR-002) y calcular_precio (BR-012).

create table public.config_precios (
  id smallint primary key default 1 check (id = 1),
  -- Pendiente de definir por los dueños (requirements.md §pendientes): puede ser null.
  precio_suelta numeric(12, 2) check (precio_suelta >= 0),
  precio_docena numeric(12, 2) not null check (precio_docena >= 0),
  minimo_docena int not null default 6 check (minimo_docena between 1 and 12),
  redondeo int not null default 1 check (redondeo in (1, 5, 10)),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id) on delete set null default auth.uid()
);

comment on table public.config_precios is 'Fila única con la lista de precios vigente (FR-002, BR-012).';

-- Fila inicial: docena RD$550 y mínimo 6 (requirements.md BR-012). Suelta sin definir.
insert into public.config_precios (id, precio_suelta, precio_docena, minimo_docena, redondeo, actualizado_por)
values (1, null, 550, 6, 1, null);

create function public.config_precios_auditar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  new.actualizado_por := auth.uid();
  return new;
end;
$$;

create trigger config_precios_auditar
  before update on public.config_precios
  for each row execute function public.config_precios_auditar();

alter table public.config_precios enable row level security;

revoke all on table public.config_precios from anon, authenticated;
grant select on table public.config_precios to authenticated;
grant update (precio_suelta, precio_docena, minimo_docena, redondeo) on table public.config_precios to authenticated;

create policy config_precios_select on public.config_precios
  for select to authenticated
  using (public.es_dueno());

create policy config_precios_update on public.config_precios
  for update to authenticated
  using (public.es_dueno())
  with check (public.es_dueno());

-- ---------------------------------------------------------------------------
-- calcular_precio (BR-012). n = total de catibías del pedido, todos los
-- sabores juntos:
--   n < minimo_docena → n × precio_suelta
--   n ≥ minimo_docena → round((n × precio_docena / 12) / redondeo) × redondeo
-- src/lib/precio.ts replica esta regla solo para mostrarla en vivo; los dos
-- pasan la misma tabla de casos (docs/testing.md).
-- ---------------------------------------------------------------------------
create function public.calcular_precio(unidades int)
returns table (
  subtotal numeric(12, 2),
  tarifa public.tarifa_aplicada,
  precio_suelta numeric(12, 2),
  precio_docena numeric(12, 2),
  redondeo int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cfg public.config_precios;
begin
  perform public.exigir_dueno();

  if unidades is null or unidades < 1 then
    raise exception 'El pedido debe tener al menos una catibía.' using errcode = '22023';
  end if;

  select * into strict cfg from public.config_precios where id = 1;

  if unidades < cfg.minimo_docena then
    if cfg.precio_suelta is null then
      raise exception 'Configura el precio suelta en Ajustes para vender menos de % catibías.', cfg.minimo_docena
        using errcode = '22023';
    end if;
    return query select
      (unidades * cfg.precio_suelta)::numeric(12, 2),
      'suelta'::public.tarifa_aplicada,
      cfg.precio_suelta, cfg.precio_docena, cfg.redondeo;
  else
    return query select
      (round((unidades * cfg.precio_docena / 12) / cfg.redondeo) * cfg.redondeo)::numeric(12, 2),
      'docena'::public.tarifa_aplicada,
      cfg.precio_suelta, cfg.precio_docena, cfg.redondeo;
  end if;
end;
$$;

grant execute on function public.calcular_precio(int) to authenticated;
