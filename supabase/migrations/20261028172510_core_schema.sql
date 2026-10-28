-- Perfis de acesso (um por login)
create type public.app_role as enum ('patient', 'admin', 'reception', 'finance', 'professional');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'patient',
  full_name text not null default '',
  created_at timestamptz not null default now()
);

-- Pacientes (podem existir antes de ter login)
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  cpf text unique,
  email text,
  phone text,
  birth_date date,
  created_at timestamptz not null default now()
);

-- Catálogo de procedimentos (preço em créditos: 1 crédito = R$ 1,00)
create table public.procedures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_credits integer not null check (price_credits >= 0),
  description text not null default '',
  care text[] not null default '{}',
  active boolean not null default true
);

create type public.plan_status as enum ('active', 'done', 'cancelled');

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  name text not null,
  professional text not null default '',
  phases text[] not null default '{}',
  start_date date,
  end_date date,
  total_value numeric(12, 2) not null default 0,
  status public.plan_status not null default 'active',
  contract_number text unique,
  contract_pdf_path text,
  contract_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create type public.step_status as enum ('scheduled', 'done', 'missed', 'cancelled');

create table public.plan_steps (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  position integer not null,
  phase integer not null default 0,
  procedure_id uuid references public.procedures (id),
  title text not null,
  price_credits integer not null default 0 check (price_credits >= 0),
  scheduled_at timestamptz,
  status public.step_status not null default 'scheduled',
  what text not null default '',
  care text[] not null default '{}',
  confirmed_at timestamptz,
  done_at timestamptz,
  done_by uuid references public.profiles (id),
  unique (plan_id, position)
);

-- Boletos emitidos pela clínica no próprio banco; a equipe anexa e dá baixa
create table public.boletos (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  number integer not null,
  due_date date not null,
  amount numeric(12, 2) not null check (amount > 0),
  barcode text,
  pdf_path text,
  proof_path text,
  proof_sent_at timestamptz,
  paid_at timestamptz,
  paid_by uuid references public.profiles (id),
  unique (plan_id, number)
);

-- Pontos de fidelidade (só a clínica vê)
create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cost_points integer not null check (cost_points > 0),
  active boolean not null default true
);

create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  reward_id uuid not null references public.rewards (id),
  code text not null unique,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid references public.profiles (id)
);

create index on public.plans (patient_id);
create index on public.plan_steps (plan_id);
create index on public.boletos (plan_id);
create index on public.points_ledger (patient_id);
create index on public.vouchers (patient_id);
create index on public.patients (profile_id);
