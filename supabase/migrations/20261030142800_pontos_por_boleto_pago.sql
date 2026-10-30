-- Regra de pontos (Pedro, 2026-10-30): a paciente ganha pontos conforme paga
-- o plano. Cada boleto pago vira pontos no mesmo valor (R$ 500 pago = 500 pontos).
alter table public.points_ledger add column boleto_id uuid references public.boletos (id) on delete set null;
create unique index points_ledger_boleto_once on public.points_ledger (boleto_id) where boleto_id is not null;

create or replace function public.grant_boleto_points() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.paid_at is not null and (tg_op = 'INSERT' or old.paid_at is null) then
    insert into public.points_ledger (patient_id, boleto_id, delta, reason, created_by)
    select p.patient_id, new.id, floor(new.amount)::integer, 'Boleto ' || new.number || ' pago', new.paid_by
    from public.plans p where p.id = new.plan_id
    on conflict (boleto_id) where boleto_id is not null do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.grant_boleto_points() from public, anon, authenticated;

create trigger boletos_grant_points after insert or update of paid_at on public.boletos
  for each row execute function public.grant_boleto_points();
