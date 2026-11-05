-- Equipe gerenciada pelo próprio sistema: o administrador vê quem tem acesso,
-- cadastra pessoas da equipe (com cargo e código de acesso) e retira acessos.

-- Lista da equipe: convites (com o código de acesso) e contas que já entraram
create or replace function public.team_overview()
returns table (email text, full_name text, role public.app_role, access_code text, profile_id uuid)
language sql stable security definer set search_path = '' as $$
  select coalesce(i.email, lower(u.email::text)),
         coalesce(nullif(p.full_name, ''), i.full_name, ''),
         coalesce(p.role, i.role),
         i.access_code,
         p.id
    from public.staff_invites i
    full join (public.profiles p join auth.users u on u.id = p.id and p.role <> 'patient')
      on lower(u.email::text) = i.email
   where (select public.is_admin())
   order by 2;
$$;

-- Cadastra ou muda o cargo de alguém da equipe. Devolve o código de acesso de 6 dígitos.
-- Se a pessoa já tem conta (por exemplo, era paciente), o cargo muda na hora.
create or replace function public.save_staff(p_email text, p_name text, p_role public.app_role)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_user uuid;
  v_code text;
begin
  if not (select public.is_admin()) then
    raise exception 'Só o administrador pode cadastrar a equipe' using errcode = '42501';
  end if;
  if p_role = 'patient' then
    raise exception 'Cargo inválido' using errcode = '22023';
  end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'E-mail inválido' using errcode = '22023';
  end if;

  select id into v_user from auth.users where lower(email::text) = v_email;
  if v_user = (select auth.uid()) and p_role <> 'admin' then
    raise exception 'Você não pode tirar o seu próprio cargo de administrador' using errcode = '22023';
  end if;

  insert into public.staff_invites (email, role, full_name)
  values (v_email, p_role, coalesce(trim(p_name), ''))
  on conflict (email) do update set role = excluded.role,
    full_name = case when excluded.full_name = '' then public.staff_invites.full_name else excluded.full_name end
  returning access_code into v_code;

  if v_user is not null then
    update public.profiles set role = p_role,
      full_name = case when coalesce(trim(p_name), '') = '' then full_name else trim(p_name) end
     where id = v_user;
  end if;
  return v_code;
end;
$$;

-- Retira o acesso de alguém da equipe. A conta continua existindo, mas sem acesso à área da clínica.
create or replace function public.remove_staff(p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_user uuid;
begin
  if not (select public.is_admin()) then
    raise exception 'Só o administrador pode retirar acessos' using errcode = '42501';
  end if;
  select id into v_user from auth.users where lower(email::text) = v_email;
  if v_user = (select auth.uid()) then
    raise exception 'Você não pode retirar o seu próprio acesso' using errcode = '22023';
  end if;
  delete from public.staff_invites where email = v_email;
  if v_user is not null then
    update public.profiles set role = 'patient' where id = v_user;
  end if;
end;
$$;

revoke execute on function public.team_overview(), public.save_staff(text, text, public.app_role), public.remove_staff(text) from public, anon;
grant execute on function public.team_overview(), public.save_staff(text, text, public.app_role), public.remove_staff(text) to authenticated;
