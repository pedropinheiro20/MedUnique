-- Regra de pontos (Pedro, 2026-10-30): ao ativar um plano, a paciente ganha
-- pontos iguais ao valor do plano (plano de R$ 1.000 = 1.000 pontos).
alter table public.points_ledger add column plan_id uuid references public.plans (id) on delete set null;
create unique index points_ledger_plan_once on public.points_ledger (plan_id) where plan_id is not null;

create or replace function public.grant_plan_points() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' and new.total_value > 0
     and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    insert into public.points_ledger (patient_id, plan_id, delta, reason, created_by)
    values (new.patient_id, new.id, floor(new.total_value)::integer, 'Plano ativado: ' || new.name, auth.uid())
    on conflict (plan_id) where plan_id is not null do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.grant_plan_points() from public, anon, authenticated;

create trigger plans_grant_points after insert or update of status on public.plans
  for each row execute function public.grant_plan_points();
