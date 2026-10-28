-- Cadastro com e-mail e senha: a clínica entrega um código de acesso de 6 dígitos para cada pessoa.
-- Só cria a conta quem informar o e-mail cadastrado pela clínica junto com o código certo.
create or replace function public.new_access_code()
returns text language sql volatile set search_path = '' as $$
  select lpad((floor(random() * 1000000))::int::text, 6, '0');
$$;

alter table public.patients add column access_code text not null default public.new_access_code();
alter table public.staff_invites add column access_code text not null default public.new_access_code();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_code text := nullif(trim(new.raw_user_meta_data ->> 'access_code'), '');
  v_inv public.staff_invites;
  v_patient uuid;
begin
  select * into v_inv from public.staff_invites
   where email = lower(new.email) and access_code = v_code;
  if v_inv.email is null then
    select id into v_patient from public.patients
     where lower(email) = lower(new.email) and access_code = v_code and profile_id is null
     limit 1;
    if v_patient is null then
      raise exception 'Código de acesso inválido para este e-mail' using errcode = 'P0001';
    end if;
  end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, coalesce(v_inv.role, 'patient'),
          coalesce(nullif(v_inv.full_name, ''), new.raw_user_meta_data ->> 'full_name', ''));
  if v_patient is not null then
    update public.patients set profile_id = new.id where id = v_patient;
  end if;
  return new;
end;
$$;
