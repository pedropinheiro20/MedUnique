-- Convites da equipe: quem entrar com este e-mail recebe o cargo indicado
create table public.staff_invites (
  email text primary key check (email = lower(email)),
  role public.app_role not null check (role <> 'patient'),
  full_name text not null default '',
  created_at timestamptz not null default now()
);
alter table public.staff_invites enable row level security;
create policy "admin gerencia convites" on public.staff_invites for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.staff_invites;
begin
  select * into v_inv from public.staff_invites where email = lower(new.email);
  insert into public.profiles (id, role, full_name)
  values (new.id, coalesce(v_inv.role, 'patient'),
          coalesce(nullif(v_inv.full_name, ''), new.raw_user_meta_data ->> 'full_name', ''));
  update public.patients set profile_id = new.id
   where profile_id is null and new.email is not null and lower(email) = lower(new.email);
  return new;
end;
$$;

insert into public.staff_invites (email, role, full_name) values ('pedroppp298@gmail.com', 'admin', 'Pedro Pinheiro');

-- Para o Pedro testar também a visão da paciente, a paciente de exemplo fica ligada ao e-mail dele
update public.patients set email = 'pedroppp298@gmail.com' where email = 'juliana.exemplo@medunique.app';
