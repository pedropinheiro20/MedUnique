-- Funções auxiliares de acesso
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role <> 'patient');
$$;

create or replace function public.owns_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.plans pl join public.patients pa on pa.id = pl.patient_id
    where pl.id = p_plan and pa.profile_id = (select auth.uid())
  );
$$;

-- Novo login: cria o perfil de paciente e liga ao cadastro feito pela clínica com o mesmo e-mail
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  update public.patients set profile_id = new.id
   where profile_id is null and new.email is not null and lower(email) = lower(new.email);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Saldo de créditos por plano: pago (boletos com baixa) menos usado (etapas realizadas)
create view public.plan_credits with (security_invoker = true) as
select pl.id as plan_id,
       coalesce((select sum(b.amount) from public.boletos b where b.plan_id = pl.id and b.paid_at is not null), 0)::integer as credits_in,
       coalesce((select sum(s.price_credits) from public.plan_steps s where s.plan_id = pl.id and s.status = 'done'), 0)::integer as credits_used
from public.plans pl;

-- Regra dos créditos: uma etapa só vira "realizada" se houver saldo
create or replace function public.check_step_credits()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_in integer;
  v_used integer;
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    select coalesce(sum(amount), 0) into v_in from public.boletos where plan_id = new.plan_id and paid_at is not null;
    select coalesce(sum(price_credits), 0) into v_used from public.plan_steps
     where plan_id = new.plan_id and status = 'done' and id <> new.id;
    if v_in - v_used < new.price_credits then
      raise exception 'Créditos insuficientes: saldo %, etapa custa %', v_in - v_used, new.price_credits
        using errcode = 'P0001';
    end if;
    new.done_at := coalesce(new.done_at, now());
    new.done_by := coalesce(new.done_by, (select auth.uid()));
  end if;
  return new;
end;
$$;

create trigger plan_steps_credit_rule before update on public.plan_steps
  for each row execute function public.check_step_credits();

-- Ações da paciente (só nos próprios dados)
create or replace function public.send_boleto_proof(p_boleto uuid, p_path text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.boletos b set proof_path = p_path, proof_sent_at = now()
   where b.id = p_boleto and b.paid_at is null and public.owns_plan(b.plan_id);
  if not found then raise exception 'Boleto não encontrado'; end if;
end;
$$;

create or replace function public.confirm_step(p_step uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.plan_steps s set confirmed_at = now()
   where s.id = p_step and s.status = 'scheduled' and public.owns_plan(s.plan_id);
  if not found then raise exception 'Sessão não encontrada'; end if;
end;
$$;

create or replace function public.accept_contract(p_plan uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.plans set contract_accepted_at = now()
   where id = p_plan and contract_accepted_at is null and public.owns_plan(id);
end;
$$;

revoke execute on function public.send_boleto_proof(uuid, text), public.confirm_step(uuid), public.accept_contract(uuid) from public, anon;
grant execute on function public.send_boleto_proof(uuid, text), public.confirm_step(uuid), public.accept_contract(uuid) to authenticated;
revoke execute on function public.handle_new_user(), public.check_step_credits() from public, anon, authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.procedures enable row level security;
alter table public.plans enable row level security;
alter table public.plan_steps enable row level security;
alter table public.boletos enable row level security;
alter table public.points_ledger enable row level security;
alter table public.rewards enable row level security;
alter table public.vouchers enable row level security;

create policy "perfil próprio ou equipe" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));
create policy "equipe edita perfis" on public.profiles for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "paciente vê o próprio cadastro" on public.patients for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_staff()));
create policy "equipe gerencia pacientes" on public.patients for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "catálogo visível" on public.procedures for select to authenticated using (true);
create policy "equipe gerencia catálogo" on public.procedures for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "paciente vê os próprios planos" on public.plans for select to authenticated
  using ((select public.is_staff()) or public.owns_plan(id));
create policy "equipe gerencia planos" on public.plans for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "paciente vê as próprias etapas" on public.plan_steps for select to authenticated
  using ((select public.is_staff()) or public.owns_plan(plan_id));
create policy "equipe gerencia etapas" on public.plan_steps for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "paciente vê os próprios boletos" on public.boletos for select to authenticated
  using ((select public.is_staff()) or public.owns_plan(plan_id));
create policy "equipe gerencia boletos" on public.boletos for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Pontos, recompensas e vouchers: só a equipe
create policy "só equipe: pontos" on public.points_ledger for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "só equipe: recompensas" on public.rewards for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "só equipe: vouchers" on public.vouchers for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Arquivos privados: contratos, boletos e comprovantes
insert into storage.buckets (id, name, public) values
  ('contratos', 'contratos', false), ('boletos', 'boletos', false), ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;

-- Caminho dos arquivos: <plan_id>/<arquivo>
create policy "equipe acessa arquivos" on storage.objects for all to authenticated
  using (bucket_id in ('contratos', 'boletos', 'comprovantes') and (select public.is_staff()))
  with check (bucket_id in ('contratos', 'boletos', 'comprovantes') and (select public.is_staff()));
create policy "paciente lê os próprios arquivos" on storage.objects for select to authenticated
  using (bucket_id in ('contratos', 'boletos', 'comprovantes')
         and public.owns_plan(nullif(split_part(name, '/', 1), '')::uuid));
create policy "paciente envia comprovante" on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and public.owns_plan(nullif(split_part(name, '/', 1), '')::uuid));
