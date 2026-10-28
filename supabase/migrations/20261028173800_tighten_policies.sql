-- MedUnique: ajuste das regras de segurança
-- 1) Só o administrador pode mudar o cargo de alguém da equipe.
-- 2) A paciente só abre os arquivos do próprio plano.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin');
$$;

drop policy "equipe edita perfis" on public.profiles;
create policy "admin edita perfis" on public.profiles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.owns_plan_path(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then public.owns_plan(split_part(p_name, '/', 1)::uuid) else false end;
$$;

drop policy "paciente lê os próprios arquivos" on storage.objects;
drop policy "paciente envia comprovante" on storage.objects;
create policy "paciente lê os próprios arquivos" on storage.objects for select to authenticated
  using (bucket_id in ('contratos', 'boletos', 'comprovantes') and public.owns_plan_path(name));
create policy "paciente envia comprovante" on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and public.owns_plan_path(name));

revoke execute on function public.is_staff(), public.is_admin(), public.owns_plan(uuid), public.owns_plan_path(text) from public, anon;
grant execute on function public.is_staff(), public.is_admin(), public.owns_plan(uuid), public.owns_plan_path(text) to authenticated;
